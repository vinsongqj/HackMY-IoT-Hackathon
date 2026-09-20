# main.py
import asyncio
import logging
import threading
import time
import zlib
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

import admin_routes
import auth
import config
import db
import event_mapping
import gate_state
import operator_routes
import ws
from level_layout import find_entry_exit_gates, spot_names_by_distance_from_entry
from simulator_client import SimulatorClient
from webhook_security import compute_signature, verify_signature

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("parking")

app = FastAPI()
client = SimulatorClient(config.SIMULATOR_BASE_URL, config.SIMULATOR_USERNAME, config.SIMULATOR_PASSWORD)

db.init_db()
db.start_session()
operator_routes.init(client)
admin_routes.init(client)
app.include_router(operator_routes.router)
app.include_router(admin_routes.router)

GATE_OPEN_RETRY_SECONDS = 5


async def _init_gates_when_ready() -> None:
    """Puts the gates into their starting positions, and records which ones automation is
    allowed to drive.

    A gate with a zoneParent guards a parking zone, so it is driven per car: closed by
    default, opened while a car is passing. A gate without one sits on the approach road
    and stays open, as it always has.

    The simulator may not be running yet when the backend starts (or the user starts it
    afterwards) - retry in the background rather than a one-shot attempt at import time."""
    while True:
        try:
            barriers = await run_in_threadpool(client.list_barriers)
        except Exception:
            await asyncio.sleep(GATE_OPEN_RETRY_SECONDS)
            continue
        if not barriers:
            # The simulator's API can come up before its level/barriers are loaded -
            # a successful-but-empty response isn't "done", keep waiting.
            await asyncio.sleep(GATE_OPEN_RETRY_SECONDS)
            continue

        zoned = {b["name"] for b in barriers if b.get("zoneParent")}
        gate_state.set_zoned_gates(zoned)

        for barrier in barriers:
            name = barrier["name"]
            if gate_state.is_manually_closed(name):
                continue
            action = client.close_gate if name in zoned else client.open_gate
            try:
                await run_in_threadpool(action, name)
            except Exception:
                logger.exception("Failed to set gate %s at startup", name)
        logger.info(
            "Gates initialised: %d zoned (auto, starting closed) %s, %d unzoned (left open)",
            len(zoned), sorted(zoned), len(barriers) - len(zoned),
        )
        return


# ---------------- Auth routes ----------------
@app.post("/api/auth/signup")
def signup(body: dict):
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    role = body.get("role") or "operator"

    if len(username) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    if len(password) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")

    user = auth.create_user(username, password, role)
    token = auth.create_token(user)
    return {"token": token, "username": user["username"], "role": user["role"]}


@app.post("/api/auth/login")
def login(body: dict):
    username = (body.get("username") or body.get("email") or "").strip()
    password = body.get("password") or ""

    user = auth.authenticate(username, password)
    if not user:
        raise HTTPException(401, "Invalid username or password")

    token = auth.create_token(user)
    return {"token": token, "username": user["username"], "role": user["role"]}


@app.get("/api/auth/me")
def me(user: dict = Depends(auth.current_user)):
    return user


# ---------------- Webhook processing ----------------
WEBHOOK_WORKER_COUNT = 8
_webhook_queues: list[asyncio.Queue] = []


def _queue_index_for(payload: dict) -> int:
    """Every stage of a car's lifecycle consumes state the previous stage wrote, so its
    events have to be processed in the order they arrived. A single shared queue drained
    by N workers gives no such guarantee - a payment can overtake the charge call that
    was still in flight, and the car is then treated as an unexpected payer and never
    released. Sharding by plate keeps one car on one worker while different cars still
    run in parallel."""
    plate = payload.get("CarPlateNumber")
    if not plate:
        return 0
    return zlib.crc32(plate.encode()) % WEBHOOK_WORKER_COUNT


async def _webhook_worker(queue: asyncio.Queue) -> None:
    while True:
        payload = await queue.get()
        try:
            await run_in_threadpool(_process_webhook, payload)
        except Exception:
            logger.exception("Error processing queued webhook")
        finally:
            queue.task_done()


@app.on_event("startup")
async def _on_startup() -> None:
    ws.set_loop(asyncio.get_running_loop())
    for _ in range(WEBHOOK_WORKER_COUNT):
        queue: asyncio.Queue = asyncio.Queue()
        _webhook_queues.append(queue)
        asyncio.create_task(_webhook_worker(queue))
    asyncio.create_task(_init_gates_when_ready())
    asyncio.create_task(_seed_spot_occupancy())
    asyncio.create_task(_reroute_stalled_cars())


@app.websocket("/ws/events")
async def events_ws(websocket: WebSocket, token: str | None = None):
    if token:
        try:
            auth.decode_token(token)
        except Exception:
            await websocket.close(code=1008)
            return
    await ws.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws.disconnect(websocket)

SPOTS_BY_DISTANCE = spot_names_by_distance_from_entry()
logger.info("Spots by distance from entry: %s", SPOTS_BY_DISTANCE)

# The gates guarding the entry and exit spots, by proximity in the level file - there is no
# entry/exit flag on a gate to read instead. Only used if they turn out to carry a zone.
ENTRY_GATE, EXIT_GATE = find_entry_exit_gates()
logger.info("Entry gate: %s, exit gate: %s", ENTRY_GATE, EXIT_GATE)

last_sequence_id: int | None = None

car_assigned_spot: dict[str, str] = {}
car_routed_at: dict[str, float] = {}
car_route_attempts: dict[str, int] = {}
car_park_entry_time: dict[str, datetime] = {}
car_car_type: dict[str, str] = {}
car_planned_duration: dict[str, int] = {}
car_pending_charge: dict[str, dict] = {}
car_expected_payment: dict[str, float] = {}
car_visit_id: dict[str, int] = {}

# spot_name -> (plate, state, expires_at). This is the backend's own occupancy model and
# it is the authoritative one. The simulator's detectedCars flag lags real occupancy in
# both directions - it still reads 0 for a spot a car has been sent to but not reached,
# and it drops to 0 the moment a leaving car is logically out while it is still
# physically in the bay - so a spot handed out on detectedCars alone gets double-booked.
# The simulator then refuses the second car with an "attempted to park in an occupied
# spot" penalty and it never moves again: it sits on the entry spot, emitting no further
# events, blocking the only way in. States:
#   enroute  - assigned to a car driving there; the expiry is a safety valve, not the
#              normal release path
#   occupied - car is physically parked there; never expires, only Park/CarOut clears it
#   cooldown - car has just left; held briefly so it can physically clear the bay before
#              the spot is handed to anyone else
spot_holds: dict[str, tuple[str, str, float | None]] = {}
ENROUTE_HOLD_SECONDS = 180
DEPARTURE_COOLDOWN_SECONDS = 15
ROUTE_TIMEOUT_SECONDS = 45
ROUTE_WATCHDOG_INTERVAL = 15
MAX_ROUTE_ATTEMPTS = 3
_spot_lock = threading.Lock()

SPOT_CACHE_SECONDS = 1.0
_spot_cache: tuple[float, list[dict]] | None = None


def parse_server_time(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


def _hold_spot(name: str, plate: str, state: str, seconds: float | None) -> None:
    spot_holds[name] = (plate, state, None if seconds is None else time.time() + seconds)


def _is_held(name: str) -> bool:
    hold = spot_holds.get(name)
    if hold is None:
        return False
    _plate, _state, expires_at = hold
    if expires_at is not None and time.time() >= expires_at:
        spot_holds.pop(name, None)
        return False
    return True


def _release_hold(name: str, plate: str) -> None:
    """Only ever clears this car's own hold - a newer car can already legitimately hold
    the same spot, and clearing that would hand the spot out a second time."""
    hold = spot_holds.get(name)
    if hold is not None and hold[0] == plate:
        spot_holds.pop(name, None)


def _automation_open(gate: str | None, plate: str) -> None:
    """Opens a zoned gate for a car. Gates with no zone are left alone (they stay open),
    and a gate the operator closed by hand is never reopened by automation."""
    if gate is None or not gate_state.is_zoned(gate):
        return
    if gate_state.is_manually_closed(gate):
        logger.info("Gate %s is manually closed, not opening it for %s", gate, plate)
        return
    if not gate_state.acquire(gate, plate):
        return
    try:
        client.open_gate(gate)
    except Exception:
        logger.exception("Failed to open gate %s for %s", gate, plate)


def _automation_close(gate: str | None, plate: str) -> None:
    """Closes a zoned gate once the last car through it is clear. The claim is always
    released, even for a manually closed gate, so the counts stay honest."""
    if gate is None or not gate_state.is_zoned(gate):
        return
    if not gate_state.release(gate, plate):
        return
    if gate_state.is_manually_closed(gate):
        return
    try:
        client.close_gate(gate)
    except Exception:
        logger.exception("Failed to close gate %s after %s", gate, plate)


def _safe_car_goto(plate: str, destination: str) -> None:
    try:
        client.car_goto(plate, destination)
    except Exception:
        # simulator_client already retries transient failures - if it still raises
        # here, log it but never let it abort the rest of the handler (DB bookkeeping,
        # dedup/sequence tracking), or the whole webhook gets silently dropped too.
        logger.exception("Failed to send %s to %s", plate, destination)


def _safe_car_charge(plate: str, parking_cost: float, charging_cost: float) -> None:
    try:
        client.car_charge(plate, parking_cost, charging_cost)
    except Exception:
        logger.exception("Failed to charge %s", plate)


def _live_spots() -> list[dict]:
    """Cached for a beat because pick_free_spot runs under _spot_lock: without this,
    every entering car serializes behind a full simulator round-trip (10s timeout plus
    retries) while holding the lock, and entry throughput collapses under load.
    spot_holds is the authoritative guard, so a second-old view is fine here."""
    global _spot_cache
    now = time.time()
    if _spot_cache is not None and now - _spot_cache[0] < SPOT_CACHE_SECONDS:
        return _spot_cache[1]
    spots = client.list_parking_spots()
    _spot_cache = (now, spots)
    return spots


def pick_free_spot(car_type: str) -> str | None:
    live_by_name = {spot["name"]: spot for spot in _live_spots()}
    for name in SPOTS_BY_DISTANCE:
        spot = live_by_name.get(name)
        if spot is None or spot["purpose"] != "Park":
            continue
        if spot["broken"] or spot["isUnderMaintenance"]:
            continue
        if spot["detectedCars"]:
            continue
        if _is_held(name):
            continue
        if spot["parkingForCarType"] not in ("Any", car_type):
            continue
        return name
    return None


def _route_to_spot(plate: str, car_type: str, attempt: int = 1) -> str | None:
    """Picks a spot, holds it and sends the car there. Returns the spot, or None if the
    car was sent away instead. Shared with the stalled-car watchdog so a re-route takes
    exactly the same path as the original routing decision."""
    try:
        with _spot_lock:
            spot_name = pick_free_spot(car_type)
            if spot_name is not None:
                car_assigned_spot[plate] = spot_name
                car_routed_at[plate] = time.time()
                car_route_attempts[plate] = attempt
                _hold_spot(spot_name, plate, "enroute", ENROUTE_HOLD_SECONDS)
    except Exception:
        # A live simulator call failing here must never strand the car with zero
        # commands issued - fall back to the same "no free spot" rejection path,
        # which still sends it somewhere, instead of letting the exception abort
        # the whole handler silently.
        logger.exception("Failed to check spot availability for %s, sending to leave", plate)
        spot_name = None
    if spot_name is None:
        logger.warning("No free spot for %s, sending to leave", plate)
        car_assigned_spot.pop(plate, None)
        car_routed_at.pop(plate, None)
        car_route_attempts.pop(plate, None)
        _safe_car_goto(plate, "leavepark")
        return None
    _safe_car_goto(plate, spot_name)
    return spot_name


def _clear_route_tracking(plate: str) -> None:
    car_assigned_spot.pop(plate, None)
    car_routed_at.pop(plate, None)
    car_route_attempts.pop(plate, None)


async def _seed_spot_occupancy() -> None:
    """After a restart the backend has no idea which spots are already taken, and
    detectedCars alone has proven unreliable - seed the model once from the simulator so
    cars that parked before this process started still block their spots."""
    while True:
        try:
            spots = await run_in_threadpool(client.list_parking_spots)
        except Exception:
            await asyncio.sleep(GATE_OPEN_RETRY_SECONDS)
            continue
        if not spots:
            await asyncio.sleep(GATE_OPEN_RETRY_SECONDS)
            continue
        seeded = 0
        with _spot_lock:
            for spot in spots:
                if spot.get("purpose") != "Park" or not spot.get("detectedCars"):
                    continue
                if spot["name"] in spot_holds:
                    continue
                # No plate to attribute it to; Park/CarOut clears the spot by name, so
                # the placeholder owner still gets released normally when it leaves.
                _hold_spot(spot["name"], "", "occupied", None)
                seeded += 1
        logger.info("Seeded %d occupied spot(s) from the simulator at startup", seeded)
        return


async def _reroute_stalled_cars() -> None:
    """A car sent to a spot that turns out to be occupied is refused by the simulator and
    then emits no further events at all - it just sits on the entry spot blocking the
    entrance, and nothing else in the system ever retries it. Give it another spot."""
    while True:
        await asyncio.sleep(ROUTE_WATCHDOG_INTERVAL)
        try:
            now = time.time()
            stalled = [p for p, t in list(car_routed_at.items()) if now - t > ROUTE_TIMEOUT_SECONDS]
            for plate in stalled:
                attempts = car_route_attempts.get(plate, 1)
                old_spot = car_assigned_spot.get(plate)
                if old_spot:
                    _release_hold(old_spot, plate)
                if attempts >= MAX_ROUTE_ATTEMPTS:
                    logger.warning("%s never parked after %d attempts, sending it away", plate, attempts)
                    _clear_route_tracking(plate)
                    await run_in_threadpool(_safe_car_goto, plate, "leavepark")
                    continue
                logger.warning("%s never reached %s, re-routing (attempt %d)", plate, old_spot, attempts + 1)
                await run_in_threadpool(
                    _route_to_spot, plate, car_car_type.get(plate, "Normal"), attempts + 1
                )
        except Exception:
            logger.exception("Stalled-car watchdog failed")


def _planned_minutes(payload: dict) -> int:
    try:
        return int(payload.get("PlannedParkingDurationInMinutes") or 1) or 1
    except (TypeError, ValueError):
        return 1


def _costs_for(plate: str, payload: dict) -> tuple[float, float]:
    """Falls back to the event's own fields when our in-memory record of the car is gone,
    so a lost visit still produces a chargeable amount instead of no charge at all."""
    minutes = car_planned_duration.pop(plate, None)
    if minutes is None:
        minutes = _planned_minutes(payload)
    parking_cost = minutes * config.PARKING_RATE_PER_MINUTE
    car_type = car_car_type.get(plate) or payload.get("CarType")
    charging_cost = parking_cost if car_type == "Electric" else 0
    return parking_cost, charging_cost


def handle_car_spot_action(payload: dict) -> None:
    plate = payload["CarPlateNumber"]
    spot_type = payload["SpotType"]
    direction = payload["Direction"]
    car_type = payload.get("CarType", "Normal")

    event = event_mapping.map_car_spot_action(payload)
    if event:
        ws.broadcast_nowait(event)

    if spot_type == "EntrySpot" and direction == "CarIn":
        # Open before routing: the car is told where to go straight after this, and it
        # should not be sent at a gate that is still shut.
        _automation_open(ENTRY_GATE, plate)
        car_car_type[plate] = car_type
        car_planned_duration[plate] = _planned_minutes(payload)
        spot_name = _route_to_spot(plate, car_type)
        if spot_name is None:
            return
        visit_id = db.create_visit(plate, car_type=car_type, status="entering", assigned_spot=spot_name)
        car_visit_id[plate] = visit_id
        if visit_id is not None:
            db.add_slot(visit_id, plate)
        logger.info("Routed %s to %s (visit %s)", plate, spot_name, visit_id)

    elif spot_type == "EntrySpot" and direction == "CarOut":
        _automation_close(ENTRY_GATE, plate)

    elif spot_type == "Park" and direction == "CarIn":
        # SpotName from the webhook beats our own record of where we sent the car: it is
        # where the car actually is, and it keeps the occupancy model correct even for
        # cars that parked before this backend process started.
        spot_name = payload.get("SpotName") or car_assigned_spot.get(plate)
        if spot_name:
            with _spot_lock:
                _hold_spot(spot_name, plate, "occupied", None)
        _clear_route_tracking(plate)
        car_park_entry_time[plate] = parse_server_time(payload["ServerDateTime"])
        visit_id = car_visit_id.get(plate)
        if visit_id is not None:
            db.update_visit(visit_id, status="parked", entry_time=payload["ServerDateTime"])

    elif spot_type == "Park" and direction == "CarOut":
        vacated = payload.get("SpotName") or car_assigned_spot.get(plate)
        if vacated:
            with _spot_lock:
                hold = spot_holds.get(vacated)
                if hold is not None and hold[1] == "enroute" and hold[0] != plate:
                    # Another car is already inbound to this spot - downgrading its hold
                    # to a short cooldown would free the spot for a third car while that
                    # one is still driving there.
                    pass
                else:
                    _hold_spot(vacated, plate, "cooldown", DEPARTURE_COOLDOWN_SECONDS)
        _clear_route_tracking(plate)

        entry_time = car_park_entry_time.pop(plate, None)
        if entry_time is None:
            # State for this car was lost - the backend restarted mid-visit, or its
            # Park/CarIn never landed. Returning here is what left cars parked forever:
            # without the goto below nothing ever tells them to leave, and they hold a
            # spot for the rest of the run. A default charge is recoverable; a car that
            # never moves is not.
            logger.warning("No tracked entry for %s at Park/CarOut, using fallback charge", plate)
        parking_cost, charging_cost = _costs_for(plate, payload)
        car_pending_charge[plate] = {"parking_cost": parking_cost, "charging_cost": charging_cost}
        _safe_car_goto(plate, "exit")
        visit_id = car_visit_id.get(plate)
        if visit_id is not None:
            db.update_visit(
                visit_id,
                status="pending_exit",
                exit_time=payload["ServerDateTime"],
                parking_cost=parking_cost,
                charging_cost=charging_cost,
                expected_payment=parking_cost + charging_cost,
            )

    elif spot_type == "ExitSpot" and direction == "CarIn":
        _automation_open(EXIT_GATE, plate)
        charge = car_pending_charge.pop(plate, None)
        if charge is None:
            # Same reasoning as above, and worse here: a car that is never charged can
            # never pay and never leaves, and it waits on the exit spot itself - so it
            # blocks every other car from getting out of the lot at all.
            parking_cost, charging_cost = _costs_for(plate, payload)
            charge = {"parking_cost": parking_cost, "charging_cost": charging_cost}
            logger.warning("No pending charge for %s at exit, charging fallback %s", plate,
                           parking_cost + charging_cost)
        # Record what we expect BEFORE issuing the charge: car_charge is a network call
        # that can take seconds under load, and the payment webhook has been seen landing
        # before it returns. If the expected amount isn't in place by then the payment
        # looks unexpected and the car is left sitting on the exit spot.
        car_expected_payment[plate] = charge["parking_cost"] + charge["charging_cost"]
        _safe_car_charge(plate, charge["parking_cost"], charge["charging_cost"])
        visit_id = car_visit_id.get(plate)
        if visit_id is not None:
            db.update_visit(visit_id, status="at_exit")

    elif spot_type == "ExitSpot" and direction == "CarOut":
        _automation_close(EXIT_GATE, plate)


def handle_payment_made(payload: dict) -> None:
    plate = payload["CarPlateNumber"]
    amount = float(payload["Amount"])
    expected = car_expected_payment.pop(plate, None)
    valid = expected is not None and abs(amount - expected) <= 0.01
    visit_id = car_visit_id.get(plate)
    db.record_payment(visit_id, plate, amount, expected, valid)
    ws.broadcast_nowait(event_mapping.map_payment_made(payload, valid))
    if expected is None:
        logger.warning("Unexpected payment from %s: %s", plate, amount)
    elif not valid:
        logger.warning("Payment mismatch for %s: expected %s, got %s", plate, expected, amount)
    else:
        logger.info("Payment confirmed for %s: %s", plate, amount)
    # Release the car whichever way the bookkeeping went. It has already paid and it is
    # waiting on the exit spot - holding it there over an untracked or mismatched amount
    # blocks the only way out for every car behind it, and the discrepancy is recorded
    # above either way for the operator to act on.
    _safe_car_goto(plate, "leavepark")
    if visit_id is not None:
        db.update_visit(visit_id, status="left", paid_amount=amount, payment_valid=valid)
        db.remove_slot(visit_id)
    car_visit_id.pop(plate, None)


def handle_gate_action(payload: dict) -> None:
    name = payload["Name"]
    logger.info("Gate %s is now %s", name, payload["Action"])
    event = event_mapping.map_gate_action(payload)
    if event:
        ws.broadcast_nowait(event)

    if payload["Action"] != "Closed" or gate_state.is_manually_closed(name):
        return

    if gate_state.is_zoned(name):
        # Zoned gates are supposed to close - that is the whole point. Only force one back
        # open if cars are still passing through it, which means it closed on them.
        if gate_state.holder_count(name) > 0:
            logger.warning("Gate %s closed with %d car(s) still passing, reopening",
                           name, gate_state.holder_count(name))
            try:
                client.open_gate(name)
            except Exception:
                logger.exception("Failed to reopen gate %s", name)
        return

    # Unzoned gates sit on the approach roads and are meant to stay open.
    logger.warning("Gate %s closed unexpectedly, reopening", name)
    try:
        client.open_gate(name)
    except Exception:
        logger.exception("Failed to reopen gate %s", name)


def handle_component_broken(payload: dict) -> None:
    logger.warning("Component broken: %s %s (fine %s)", payload["Type"], payload["Name"], payload["FineAmount"])
    ws.broadcast_nowait(event_mapping.map_component_broken(payload))


def handle_component_fixed(payload: dict) -> None:
    logger.info("Component fixed: %s %s", payload["Type"], payload["Name"])
    ws.broadcast_nowait(event_mapping.map_component_fixed(payload))


def handle_penalty(payload: dict) -> None:
    logger.warning("Penalty: %s (fine %s)", payload["Reason"], payload["FineAmount"])
    db.record_penalty(payload["Reason"], float(payload["FineAmount"]), payload.get("Type"), payload.get("ComponentName"))
    ws.broadcast_nowait(event_mapping.map_penalty(payload))


def handle_carbon_monoxide_event(payload: dict) -> None:
    logger.warning("CO level %s in %s: %s", payload["DangerLevel"], payload["ZoneName"], payload["CarbonMonoxideLevel"])
    ws.broadcast_nowait(event_mapping.map_carbon_monoxide_event(payload))


def handle_test_webhook(payload: dict) -> None:
    logger.info("Test webhook received")


HANDLERS = {
    "car_spot_action": handle_car_spot_action,
    "payment_made": handle_payment_made,
    "gate_action": handle_gate_action,
    "component_broken": handle_component_broken,
    "component_fixed": handle_component_fixed,
    "penalty": handle_penalty,
    "carbon_monoxide_event": handle_carbon_monoxide_event,
    "test_webhook": handle_test_webhook,
}


def _check_sequence(payload: dict) -> None:
    """Runs at enqueue time, on the event loop. Workers process shards independently and
    so see sequence ids out of order by design - only the arrival path can tell a real
    dropped event from ordinary interleaving."""
    global last_sequence_id
    sequence_id = payload.get("SequenceId")
    if sequence_id is None:
        return
    if last_sequence_id is not None and sequence_id != last_sequence_id + 1:
        logger.warning("Sequence gap: expected %s, got %s", last_sequence_id + 1, sequence_id)
    last_sequence_id = sequence_id


def _process_webhook(payload: dict) -> None:
    event_id = payload.get("EventId")
    if db.has_event(event_id):
        return

    db.record_event(event_id, payload.get("EventClass"), payload.get("SequenceId"), payload)

    handler = HANDLERS.get(payload.get("EventClass"))
    if handler is None:
        logger.warning("Unknown event class: %s", payload.get("EventClass"))
        return

    handler(payload)


@app.post("/webhook")
async def webhook(request: Request):
    payload = await request.json()

    if payload.get("Signature") and not verify_signature(payload):
        logger.warning(
            "Invalid signature on event %s | received=%s computed=%s | payload=%s",
            payload.get("EventId"),
            payload.get("Signature"),
            compute_signature(payload),
            payload,
        )
        return {"status": "invalid_signature"}

    _check_sequence(payload)
    await _webhook_queues[_queue_index_for(payload)].put(payload)
    return {"status": "queued"}
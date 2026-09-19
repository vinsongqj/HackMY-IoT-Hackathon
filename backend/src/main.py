# main.py
import asyncio
import logging
import threading
import time
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
from level_layout import spot_names_by_distance_from_entry
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


async def _open_all_gates_when_ready() -> None:
    """The simulator may not be running yet when the backend starts (or the user
    starts it after) - retry in the background instead of a one-shot attempt at
    import time, so gates still end up open once the simulator actually connects."""
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
        for barrier in barriers:
            try:
                await run_in_threadpool(client.open_gate, barrier["name"])
            except Exception:
                logger.exception("Failed to open gate %s at startup", barrier["name"])
        logger.info("Opened %d gate(s) at startup", len(barriers))
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
_webhook_queue: asyncio.Queue = asyncio.Queue()
WEBHOOK_WORKER_COUNT = 8

async def _webhook_worker() -> None:
    while True:
        payload = await _webhook_queue.get()
        try:
            await run_in_threadpool(_process_webhook, payload)
        except Exception:
            logger.exception("Error processing queued webhook")
        finally:
            _webhook_queue.task_done()


@app.on_event("startup")
async def _on_startup() -> None:
    ws.set_loop(asyncio.get_running_loop())
    for _ in range(WEBHOOK_WORKER_COUNT):
        asyncio.create_task(_webhook_worker())
    asyncio.create_task(_open_all_gates_when_ready())


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

last_sequence_id: int | None = None

car_assigned_spot: dict[str, str] = {}
car_park_entry_time: dict[str, datetime] = {}
car_car_type: dict[str, str] = {}
car_planned_duration: dict[str, int] = {}
car_pending_charge: dict[str, dict] = {}
car_expected_payment: dict[str, float] = {}
car_visit_id: dict[str, int] = {}
reserved_spots: dict[str, float] = {}
RESERVATION_TTL_SECONDS = 30
_spot_lock = threading.Lock()


def parse_server_time(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


def _is_reserved(name: str) -> bool:
    reserved_at = reserved_spots.get(name)
    if reserved_at is None:
        return False
    if time.time() - reserved_at > RESERVATION_TTL_SECONDS:
        reserved_spots.pop(name, None)
        return False
    return True


def pick_free_spot(car_type: str) -> str | None:
    live_by_name = {spot["name"]: spot for spot in client.list_parking_spots()}
    for name in SPOTS_BY_DISTANCE:
        spot = live_by_name.get(name)
        if spot is None or spot["purpose"] != "Park":
            continue
        if spot["broken"] or spot["isUnderMaintenance"]:
            continue
        if spot["detectedCars"]:
            continue
        if _is_reserved(name):
            continue
        if spot["parkingForCarType"] not in ("Any", car_type):
            continue
        return name
    return None


def handle_car_spot_action(payload: dict) -> None:
    plate = payload["CarPlateNumber"]
    spot_type = payload["SpotType"]
    direction = payload["Direction"]
    car_type = payload.get("CarType", "Normal")

    event = event_mapping.map_car_spot_action(payload)
    if event:
        ws.broadcast_nowait(event)

    if spot_type == "EntrySpot" and direction == "CarIn":
        car_car_type[plate] = car_type
        car_planned_duration[plate] = int(payload.get("PlannedParkingDurationInMinutes", 1)) or 1
        with _spot_lock:
            spot_name = pick_free_spot(car_type)
            if spot_name is not None:
                car_assigned_spot[plate] = spot_name
                reserved_spots[spot_name] = time.time()
        if spot_name is None:
            logger.warning("No free spot for %s, sending to leave", plate)
            client.car_goto(plate, "leavepark")
            return
        client.car_goto(plate, spot_name)
        visit_id = db.create_visit(plate, car_type=car_type, status="entering", assigned_spot=spot_name)
        car_visit_id[plate] = visit_id
        if visit_id is not None:
            db.add_slot(visit_id, plate)
        logger.info("Routed %s to %s (visit %s)", plate, spot_name, visit_id)

    elif spot_type == "Park" and direction == "CarIn":
        car_park_entry_time[plate] = parse_server_time(payload["ServerDateTime"])
        visit_id = car_visit_id.get(plate)
        if visit_id is not None:
            db.update_visit(visit_id, status="parked", entry_time=payload["ServerDateTime"])

    elif spot_type == "Park" and direction == "CarOut":
        released_spot = car_assigned_spot.pop(plate, None)
        if released_spot is not None:
            reserved_spots.pop(released_spot, None)
        entry_time = car_park_entry_time.pop(plate, None)
        if entry_time is None:
            return
        minutes = car_planned_duration.pop(plate, 1)
        parking_cost = minutes * config.PARKING_RATE_PER_MINUTE
        charging_cost = parking_cost if car_car_type.get(plate) == "Electric" else 0
        car_pending_charge[plate] = {"parking_cost": parking_cost, "charging_cost": charging_cost}
        client.car_goto(plate, "exit")
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
        charge = car_pending_charge.pop(plate, None)
        if charge is None:
            return
        client.car_charge(plate, charge["parking_cost"], charge["charging_cost"])
        car_expected_payment[plate] = charge["parking_cost"] + charge["charging_cost"]
        visit_id = car_visit_id.get(plate)
        if visit_id is not None:
            db.update_visit(visit_id, status="at_exit")


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
        return
    if not valid:
        logger.warning("Payment mismatch for %s: expected %s, got %s", plate, expected, amount)
    else:
        logger.info("Payment confirmed for %s: %s", plate, amount)
        client.car_goto(plate, "leavepark")
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

    if payload["Action"] == "Closed" and not gate_state.is_manually_closed(name):
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


def _process_webhook(payload: dict) -> None:
    global last_sequence_id

    event_id = payload.get("EventId")
    if db.has_event(event_id):
        return

    sequence_id = payload.get("SequenceId")
    if last_sequence_id is not None and sequence_id is not None and sequence_id != last_sequence_id + 1:
        logger.warning("Sequence gap: expected %s, got %s", last_sequence_id + 1, sequence_id)
    last_sequence_id = sequence_id

    db.record_event(event_id, payload.get("EventClass"), sequence_id, payload)

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

    await _webhook_queue.put(payload)
    return {"status": "queued"}
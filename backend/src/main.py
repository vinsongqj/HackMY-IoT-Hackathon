import logging
from datetime import datetime

from fastapi import FastAPI, Request

import backend.src.config as config
from backend.src.simulator_client import SimulatorClient
from backend.src.webhook_security import verify_signature

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("parking")

app = FastAPI()
client = SimulatorClient(config.SIMULATOR_BASE_URL, config.SIMULATOR_USERNAME, config.SIMULATOR_PASSWORD)

processed_event_ids: set[str] = set()
last_sequence_id: int | None = None

car_assigned_spot: dict[str, str] = {}
car_park_entry_time: dict[str, datetime] = {}
car_car_type: dict[str, str] = {}
car_pending_charge: dict[str, dict] = {}
car_expected_payment: dict[str, float] = {}


def parse_server_time(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


def pick_free_spot(car_type: str) -> str | None:
    spots = client.list_parking_spots()
    for spot in spots:
        if spot["purpose"] != "Park":
            continue
        if spot["broken"] or spot["isUnderMaintenance"]:
            continue
        if spot["detectedCars"]:
            continue
        if spot["parkingForCarType"] not in ("Any", car_type):
            continue
        return spot["name"]
    return None


def handle_car_spot_action(payload: dict) -> None:
    plate = payload["CarPlateNumber"]
    spot_type = payload["SpotType"]
    direction = payload["Direction"]
    car_type = payload.get("CarType", "Normal")

    if spot_type == "EntrySpot" and direction == "CarIn":
        car_car_type[plate] = car_type
        spot_name = pick_free_spot(car_type)
        if spot_name is None:
            logger.warning("No free spot for %s, sending to leave", plate)
            client.car_goto(plate, "leavepark")
            return
        car_assigned_spot[plate] = spot_name
        client.car_goto(plate, spot_name)
        logger.info("Routed %s to %s", plate, spot_name)

    elif spot_type == "Park" and direction == "CarIn":
        car_park_entry_time[plate] = parse_server_time(payload["ServerDateTime"])

    elif spot_type == "Park" and direction == "CarOut":
        entry_time = car_park_entry_time.pop(plate, None)
        if entry_time is None:
            return
        exit_time = parse_server_time(payload["ServerDateTime"])
        minutes = max(1, int((exit_time - entry_time).total_seconds() // 60) or 1)
        parking_cost = minutes * config.PARKING_RATE_PER_MINUTE
        charging_cost = parking_cost if car_car_type.get(plate) == "Electric" else 0
        car_pending_charge[plate] = {"parking_cost": parking_cost, "charging_cost": charging_cost}
        client.car_goto(plate, "exit")

    elif spot_type == "ExitSpot" and direction == "CarIn":
        charge = car_pending_charge.pop(plate, None)
        if charge is None:
            return
        client.car_charge(plate, charge["parking_cost"], charge["charging_cost"])
        car_expected_payment[plate] = charge["parking_cost"] + charge["charging_cost"]


def handle_payment_made(payload: dict) -> None:
    plate = payload["CarPlateNumber"]
    amount = float(payload["Amount"])
    expected = car_expected_payment.pop(plate, None)
    if expected is None:
        logger.warning("Unexpected payment from %s: %s", plate, amount)
        return
    if abs(amount - expected) > 0.01:
        logger.warning("Payment mismatch for %s: expected %s, got %s", plate, expected, amount)
    else:
        logger.info("Payment confirmed for %s: %s", plate, amount)


def handle_gate_action(payload: dict) -> None:
    logger.info("Gate %s is now %s", payload["Name"], payload["Action"])


def handle_component_broken(payload: dict) -> None:
    logger.warning("Component broken: %s %s (fine %s)", payload["Type"], payload["Name"], payload["FineAmount"])


def handle_component_fixed(payload: dict) -> None:
    logger.info("Component fixed: %s %s", payload["Type"], payload["Name"])


def handle_penalty(payload: dict) -> None:
    logger.warning("Penalty: %s (fine %s)", payload["Reason"], payload["FineAmount"])


def handle_carbon_monoxide_event(payload: dict) -> None:
    logger.warning("CO level %s in %s: %s", payload["DangerLevel"], payload["ZoneName"], payload["CarbonMonoxideLevel"])


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


@app.post("/webhook")
async def webhook(request: Request):
    global last_sequence_id
    payload = await request.json()

    if not verify_signature(payload):
        from backend.src.webhook_security import compute_signature
        logger.warning(
            "Invalid signature on event %s | received=%s computed=%s | payload=%s",
            payload.get("EventId"),
            payload.get("Signature"),
            compute_signature(payload),
            payload,
        )
        return {"status": "invalid_signature"}

    event_id = payload.get("EventId")
    if event_id in processed_event_ids:
        return {"status": "duplicate"}
    processed_event_ids.add(event_id)

    sequence_id = payload.get("SequenceId")
    if last_sequence_id is not None and sequence_id is not None and sequence_id != last_sequence_id + 1:
        logger.warning("Sequence gap: expected %s, got %s", last_sequence_id + 1, sequence_id)
    last_sequence_id = sequence_id

    handler = HANDLERS.get(payload.get("EventClass"))
    if handler is None:
        logger.warning("Unknown event class: %s", payload.get("EventClass"))
        return {"status": "unhandled"}

    handler(payload)
    return {"status": "ok"}

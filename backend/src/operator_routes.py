from datetime import datetime

from fastapi import APIRouter, Depends
import auth
import config
import db
from simulator_client import SimulatorClient


router = APIRouter(
    prefix="/api/operator",
    dependencies=[Depends(auth.require_operator)],
)

_client: SimulatorClient | None = None


def init(client: SimulatorClient) -> None:
    global _client
    _client = client


def _car_view(row: dict) -> dict:
    status = row.get("status")
    current_spot = row.get("assigned_spot") if status in ("entering", "parked") else None

    duration_minutes = 0
    parking_cost = row.get("parking_cost")
    entry_time = row.get("entry_time")
    if status == "parked" and entry_time:
        parsed = datetime.strptime(entry_time, "%Y-%m-%d %H:%M:%S")
        duration_minutes = max(0, int((datetime.now() - parsed).total_seconds() // 60))
    elif parking_cost is not None:
        duration_minutes = int(parking_cost / config.PARKING_RATE_PER_MINUTE)

    invoice = None
    if parking_cost is not None:
        invoice = {
            "plate": row["plate"],
            "parkingCost": parking_cost,
            "chargingCost": row.get("charging_cost"),
            "total": row.get("expected_payment"),
            "issuedAt": row.get("exit_time"),
            "paidAt": row.get("updated_at") if row.get("payment_valid") else None,
        }

    if status in ("entering", "parked"):
        payment_status = "None"
    elif row.get("payment_valid") is True:
        payment_status = "Validated"
    elif row.get("payment_valid") is False:
        payment_status = "Failed"
    elif status in ("pending_exit", "at_exit"):
        payment_status = "Requested"
    else:
        payment_status = "None"

    return {
        "plate": row["plate"],
        "type": row.get("car_type"),
        "currentSpot": current_spot,
        "parkedAt": entry_time,
        "parkingDurationMinutes": duration_minutes,
        "invoice": invoice,
        "paymentStatus": payment_status,
    }


@router.get("/state")
def operator_state():
    barriers = _client.list_barriers()
    spots = _client.list_parking_spots()
    fans = _client.list_exhaust_fans()
    lights = _client.list_lights()
    zones = _client.list_zones()
    cars = [_car_view(row) for row in db.list_cars()]
    penalties = db.list_penalties()
    return {
        "barriers": barriers,
        "spots": spots,
        "cars": cars,
        "fans": fans,
        "lights": lights,
        "zones": zones,
        "penalties": penalties,
    }


# ---- Barriers ----
@router.get("/barriers")
def list_barriers():
    return _client.list_barriers()


@router.post("/barriers/{name}/open", status_code=201)
def open_barrier(name: str):
    _client.open_gate(name)


@router.post("/barriers/{name}/close", status_code=201)
def close_barrier(name: str):
    _client.close_gate(name)


@router.post("/barriers/{name}/repair", status_code=201)
def repair_barrier(name: str):
    _client.repair_gate(name)


# ---- Spots ----
@router.get("/spots")
def list_spots():
    return _client.list_parking_spots()


@router.post("/spots/{name}/repair", status_code=201)
def repair_spot(name: str):
    _client.repair_spot(name)


# ---- Cars ----
@router.get("/cars")
def list_cars():
    return [_car_view(row) for row in db.list_cars()]


@router.get("/cars/{plate}")
def get_car(plate: str):
    row = db.get_car(plate)
    if row is None:
        return None
    return _car_view(row)


@router.post("/cars/{plate}/invoice")
def issue_invoice(plate: str):
    row = db.get_car(plate)
    if row is None:
        return None
    return _car_view(row).get("invoice")


@router.post("/cars/{plate}/charge", status_code=201)
def charge_car(plate: str, parkingCost: float, chargingCost: float):
    _client.car_charge(plate, parkingCost, chargingCost)


@router.post("/cars/{plate}/validate-payment", status_code=201)
def validate_payment(plate: str):
    db.upsert_car(plate, payment_valid=True)


@router.post("/cars/{plate}/goto/{destination}", status_code=201)
def send_car(plate: str, destination: str):
    _client.car_goto(plate, destination)


# ---- Fans ----
@router.get("/fans")
def list_fans():
    return _client.list_exhaust_fans()


@router.post("/fans/{name}/on", status_code=201)
def fan_on(name: str):
    _client.fan_on(name)


@router.post("/fans/{name}/off", status_code=201)
def fan_off(name: str):
    _client.fan_off(name)


@router.post("/fans/{name}/repair", status_code=201)
def fan_repair(name: str):
    _client.repair_fan(name)


# ---- Lights ----
@router.get("/lights")
def list_lights():
    return _client.list_lights()


@router.post("/lights/{name}/on", status_code=201)
def light_on(name: str):
    _client.light_on(name)


@router.post("/lights/{name}/off", status_code=201)
def light_off(name: str):
    _client.light_off(name)


@router.post("/lights/group/{group}/on", status_code=201)
def light_group_on(group: str):
    _client.light_group_on(group)


@router.post("/lights/group/{group}/off", status_code=201)
def light_group_off(group: str):
    _client.light_group_off(group)


# ---- Penalties ----
@router.get("/penalties")
def list_penalties():
    return db.list_penalties()


# ---- Zones ----
@router.get("/zones")
def list_zones():
    return _client.list_zones()

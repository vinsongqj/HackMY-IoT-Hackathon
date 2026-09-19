def map_car_spot_action(payload: dict) -> dict | None:
    spot_type = payload["SpotType"]
    direction = payload["Direction"]
    plate = payload["CarPlateNumber"]
    spot = payload["SpotName"]
    ts = payload["ServerDateTime"]

    if spot_type == "EntrySpot" and direction == "CarIn":
        return {
            "type": "CarIn",
            "plate": plate,
            "spot": spot,
            "carType": payload.get("CarType"),
            "plannedMinutes": int(payload.get("PlannedParkingDurationInMinutes", 0)),
            "ts": ts,
        }
    if spot_type == "Park" and direction == "CarIn":
        return {"type": "CarParked", "plate": plate, "spot": spot, "ts": ts}
    if spot_type == "Park" and direction == "CarOut":
        return {"type": "CarLeftSpot", "plate": plate, "spot": spot, "ts": ts}
    if spot_type == "ExitSpot" and direction == "CarOut":
        return {"type": "CarOut", "plate": plate, "spot": spot, "ts": ts}
    return None  # EntrySpot/CarOut, ExitSpot/CarIn: no distinct broadcast at this stage


def map_gate_action(payload: dict) -> dict | None:
    action = payload["Action"]
    ts = payload["ServerDateTime"]
    if action == "Open":
        return {"type": "GateOpened", "name": payload["Name"], "ts": ts}
    if action == "Closed":
        return {"type": "GateClosed", "name": payload["Name"], "ts": ts}
    return None  # Opening/Closing: transitional, no broadcast


def map_component_broken(payload: dict) -> dict:
    return {
        "type": "ComponentBroken",
        "name": payload["Name"],
        "componentType": payload["Type"],
        "fineAmount": payload["FineAmount"],
        "ts": payload["ServerDateTime"],
    }


def map_component_fixed(payload: dict) -> dict:
    return {
        "type": "ComponentRepaired",
        "name": payload["Name"],
        "componentType": payload["Type"],
        "repairCost": payload["RepairCost"],
        "ts": payload["ServerDateTime"],
    }


def map_payment_made(payload: dict, valid: bool) -> dict:
    if valid:
        return {
            "type": "PaymentReceived",
            "plate": payload["CarPlateNumber"],
            "amount": payload["Amount"],
            "ts": payload["ServerDateTime"],
        }
    return {
        "type": "PaymentFailed",
        "plate": payload["CarPlateNumber"],
        "reason": payload.get("Reason"),
        "ts": payload["ServerDateTime"],
    }


def map_penalty(payload: dict) -> dict:
    return {
        "type": "Penalty",
        "penalty": {
            "id": payload["EventId"],
            "type": payload["Reason"],
            "component": payload.get("ComponentName"),
            "plate": None,
            "fineAmount": payload["FineAmount"],
            "reason": payload["Reason"],
            "occurredAt": payload["ServerDateTime"],
        },
        "ts": payload["ServerDateTime"],
    }


def map_carbon_monoxide_event(payload: dict) -> dict:
    return {
        "type": "Co2Changed",
        "zone": payload["ZoneName"],
        "level": payload["CarbonMonoxideLevel"],
        "risk": payload["DangerLevel"],
        "ts": payload["ServerDateTime"],
    }

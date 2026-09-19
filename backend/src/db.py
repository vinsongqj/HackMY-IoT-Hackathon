import requests

import config

_BASE_URL = f"{config.SUPABASE_URL}/rest/v1"
_HEADERS = {
    "apikey": config.SUPABASE_SECRET_KEY,
    "Authorization": f"Bearer {config.SUPABASE_SECRET_KEY}",
    "Content-Type": "application/json",
}


def init_db() -> None:
    resp = requests.get(f"{_BASE_URL}/events?select=event_id&limit=1", headers=_HEADERS, timeout=10)
    resp.raise_for_status()


def has_event(event_id: str) -> bool:
    resp = requests.get(
        f"{_BASE_URL}/events",
        headers=_HEADERS,
        params={"event_id": f"eq.{event_id}", "select": "event_id"},
        timeout=10,
    )
    resp.raise_for_status()
    return len(resp.json()) > 0


def record_event(event_id: str, event_class: str, sequence_id: int | None, payload: dict) -> None:
    requests.post(
        f"{_BASE_URL}/events",
        headers={**_HEADERS, "Prefer": "resolution=ignore-duplicates,return=minimal"},
        params={"on_conflict": "event_id"},
        json={"event_id": event_id, "event_class": event_class, "sequence_id": sequence_id, "payload_json": payload},
        timeout=10,
    )


def upsert_car(plate: str, **fields) -> None:
    requests.post(
        f"{_BASE_URL}/cars",
        headers={**_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        params={"on_conflict": "plate"},
        json={"plate": plate, **fields},
        timeout=10,
    )


def record_payment(plate: str, amount: float, expected_amount: float | None, valid: bool) -> None:
    requests.post(
        f"{_BASE_URL}/payments",
        headers={**_HEADERS, "Prefer": "return=minimal"},
        json={"car_plate": plate, "amount": amount, "expected_amount": expected_amount, "valid": valid},
        timeout=10,
    )


def record_penalty(reason: str, fine_amount: float, component_type: str | None, component_name: str | None) -> None:
    requests.post(
        f"{_BASE_URL}/penalties",
        headers={**_HEADERS, "Prefer": "return=minimal"},
        json={
            "reason": reason,
            "fine_amount": fine_amount,
            "component_type": component_type,
            "component_name": component_name,
        },
        timeout=10,
    )


def list_cars() -> list[dict]:
    resp = requests.get(f"{_BASE_URL}/cars", headers=_HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()


def get_car(plate: str) -> dict | None:
    resp = requests.get(
        f"{_BASE_URL}/cars",
        headers=_HEADERS,
        params={"plate": f"eq.{plate}"},
        timeout=10,
    )
    resp.raise_for_status()
    rows = resp.json()
    return rows[0] if rows else None


def list_penalties(limit: int = 200) -> list[dict]:
    resp = requests.get(
        f"{_BASE_URL}/penalties",
        headers=_HEADERS,
        params={"order": "received_at.desc", "limit": limit},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()

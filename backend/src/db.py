import logging

import requests

import config

logger = logging.getLogger("parking.db")

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
        json={
            "event_id": event_id,
            "event_class": event_class,
            "sequence_id": sequence_id,
            "payload_json": payload,
        },
        timeout=10,
    )


def create_visit(plate: str, **fields) -> int | None:
    """cars is a per-VISIT history table - one row per car entry, synthetic id PK
    (a plate can have many visits over time; the old plate-keyed upsert silently
    overwrote earlier visits, which was a real bug). Returns the new visit's id,
    used for every subsequent update_visit/add_slot call for this visit."""
    try:
        resp = requests.post(
            f"{_BASE_URL}/cars",
            headers={**_HEADERS, "Prefer": "return=representation"},
            json={"plate": plate, "session_uid": config.SESSION_UID, **fields},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()[0]["id"]
    except requests.exceptions.RequestException:
        logger.warning("create_visit failed for %s", plate, exc_info=True)
        return None


def update_visit(visit_id: int, **fields) -> None:
    try:
        requests.patch(
            f"{_BASE_URL}/cars",
            headers={**_HEADERS, "Prefer": "return=minimal"},
            params={"id": f"eq.{visit_id}"},
            json=fields,
            timeout=10,
        )
    except requests.exceptions.RequestException:
        logger.warning("update_visit failed for visit_id=%s", visit_id, exc_info=True)


def record_payment(visit_id: int | None, plate: str, amount: float, expected_amount: float | None, valid: bool) -> None:
    try:
        requests.post(
            f"{_BASE_URL}/payments",
            headers={**_HEADERS, "Prefer": "return=minimal"},
            json={
                "visit_id": visit_id,
                "car_plate": plate,
                "amount": amount,
                "expected_amount": expected_amount,
                "valid": valid,
            },
            timeout=10,
        )
    except requests.exceptions.RequestException:
        logger.warning("record_payment failed for %s", plate, exc_info=True)


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


def wipe_car_slots() -> None:
    """Call once at startup. car_slots marks which visits are currently active THIS
    session - a row left over from a previous process can no longer be trusted
    (that simulator instance is gone), so instead of reconciling it, just start
    every session with a clean table. The visit's actual history in `cars` is
    untouched - this only drops the pointer that says 'currently active'."""
    try:
        requests.delete(
            f"{_BASE_URL}/car_slots",
            headers={**_HEADERS, "Prefer": "return=minimal"},
            params={"plate": "not.is.null"},
            timeout=10,
        )
    except requests.exceptions.RequestException:
        logger.warning("wipe_car_slots failed", exc_info=True)


def add_slot(visit_id: int, plate: str) -> None:
    try:
        requests.post(
            f"{_BASE_URL}/car_slots",
            headers={**_HEADERS, "Prefer": "return=minimal"},
            json={"visit_id": visit_id, "plate": plate},
            timeout=10,
        )
    except requests.exceptions.RequestException:
        logger.warning("add_slot failed for %s (visit_id=%s)", plate, visit_id, exc_info=True)


def remove_slot(visit_id: int) -> None:
    try:
        requests.delete(
            f"{_BASE_URL}/car_slots",
            headers=_HEADERS,
            params={"visit_id": f"eq.{visit_id}"},
            timeout=10,
        )
    except requests.exceptions.RequestException:
        logger.warning("remove_slot failed for visit_id=%s", visit_id, exc_info=True)


def list_slots() -> list[dict]:
    """Every currently-active visit's full data, via the car_slots -> cars FK.
    Returns rows shaped exactly like a `cars` row (plate, status, assigned_spot,
    entry_time, ...) since that's where the actual data lives - car_slots itself
    holds no data columns, it's just a 'this visit is live' marker."""
    resp = requests.get(
        f"{_BASE_URL}/car_slots",
        headers=_HEADERS,
        params={"select": "cars(*)"},
        timeout=10,
    )
    resp.raise_for_status()
    return [row["cars"] for row in resp.json() if row.get("cars")]


def list_cars() -> list[dict]:
    resp = requests.get(f"{_BASE_URL}/cars", headers=_HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()


def get_car(plate: str) -> dict | None:
    """Most recent visit for this plate - a plate can have many rows now, so this
    is no longer a unique lookup by plate alone."""
    resp = requests.get(
        f"{_BASE_URL}/cars",
        headers=_HEADERS,
        params={"plate": f"eq.{plate}", "order": "id.desc", "limit": 1},
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

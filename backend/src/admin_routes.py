# admin_routes.py — reads from your existing db.py, doesn't modify it
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query

import auth
import db
from simulator_client import SimulatorClient

logger = logging.getLogger("parking.admin_routes")

router = APIRouter(prefix="/api/admin", dependencies=[Depends(auth.require_admin)])

_client: SimulatorClient | None = None
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="admin-stats")


def init(client: SimulatorClient) -> None:
    global _client
    _client = client


def _live_occupancy() -> tuple[int, int]:
    """(current occupied Park spots, total Park spots) read straight from the simulator -
    the cars table accumulates stale 'parked' rows across test runs and can't be trusted for this."""
    try:
        spots = _client.list_parking_spots()
    except Exception:
        logger.warning("Failed to read live spot occupancy from simulator", exc_info=True)
        return 0, 0
    park_spots = [s for s in spots if s.get("purpose") == "Park"]
    occupied = sum(1 for s in park_spots if s.get("detectedCars"))
    return occupied, len(park_spots)


@router.get("/stats")
def stats():
    cars_f = _executor.submit(db.list_cars)
    penalties_f = _executor.submit(db.list_penalties, 10_000)
    occupancy_f = _executor.submit(_live_occupancy)

    cars = cars_f.result()
    penalties = penalties_f.result()

    validated = [c for c in cars if c.get("payment_valid") is True]

    def _revenue_since(cutoff: datetime) -> float:
        total = 0.0
        for c in validated:
            updated_at = c.get("updated_at")
            if not updated_at:
                continue
            try:
                ts = datetime.fromisoformat(updated_at.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                continue
            if ts >= cutoff:
                total += float(c.get("paid_amount") or 0)
        return total

    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)

    total_revenue = sum(float(c.get("paid_amount") or 0) for c in validated)

    today_str = now.strftime("%Y-%m-%d")
    today_arrivals = sum(1 for c in cars if (c.get("entry_time") or "").startswith(today_str))

    current_occupied, capacity = occupancy_f.result()

    return {
        "revenue": {
            "total": total_revenue,
            "today": _revenue_since(today_start),
            "thisWeek": _revenue_since(week_start),
            "thisMonth": _revenue_since(month_start),
        },
        "occupancy": {
            "current": current_occupied,
            "capacity": capacity,
            "today": today_arrivals,
            "peakToday": current_occupied,
        },
        "penalties": {
            "count": len(penalties),
            "totalAmount": sum(float(p.get("fine_amount") or 0) for p in penalties),
            "byType": {},
        },
    }


@router.get("/logs")
def logs(page: int = 1, pageSize: int = 50):
    cars = db.list_cars()
    penalties = db.list_penalties(limit=1000)

    items = []
    for c in cars:
        if c.get("entry_time"):
            items.append({
                "id": f"arr-{c['plate']}",
                "type": "Arrival",
                "timestamp": c["entry_time"],
                "plate": c["plate"],
                "component": None,
                "amount": None,
                "metadata": {},
            })
        if c.get("exit_time"):
            items.append({
                "id": f"dep-{c['plate']}",
                "type": "Departure",
                "timestamp": c["exit_time"],
                "plate": c["plate"],
                "component": None,
                "amount": None,
                "metadata": {},
            })
    for p in penalties:
        items.append({
            "id": str(p.get("id")),
            "type": "Penalty",
            "timestamp": p.get("received_at") or "",
            "plate": None,
            "component": p.get("component_name"),
            "amount": float(p.get("fine_amount") or 0),
            "metadata": {"reason": p.get("reason")},
        })

    items.sort(key=lambda i: i["timestamp"], reverse=True)
    total = len(items)
    start = (page - 1) * pageSize
    return {"items": items[start:start + pageSize], "page": page, "pageSize": pageSize, "total": total}


# ---------------------------------------------------------------------------
# Time-series helpers
# ---------------------------------------------------------------------------

def _parse_iso_local(value: str) -> datetime | None:
    """Parse a (possibly timezone-aware) ISO timestamp and normalise it to a
    naive *local* datetime — matches what the rest of this module does with
    `datetime.now()` and the simulator's `YYYY-MM-DD HH:MM:SS` strings."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone().replace(tzinfo=None)
    return dt


def _parse_server_dt(value: str) -> datetime | None:
    """Simulator timestamps are plain 'YYYY-MM-DD HH:MM:SS' strings."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def _floor_bucket(dt: datetime, bucket: str) -> datetime:
    if bucket == "day":
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    return dt.replace(minute=0, second=0, microsecond=0)


def _next_bucket(dt: datetime, bucket: str) -> datetime:
    return dt + (timedelta(days=1) if bucket == "day" else timedelta(hours=1))


def _bucket_range(start: datetime, end: datetime, bucket: str) -> list[datetime]:
    out: list[datetime] = []
    cursor = _floor_bucket(start, bucket)
    while cursor <= end:
        out.append(cursor)
        cursor = _next_bucket(cursor, bucket)
    return out


# ---------------------------------------------------------------------------
# Revenue series — bucket validated payments by hour/day from the `cars` table
# ---------------------------------------------------------------------------

@router.get("/revenue")
def revenue(
    from_: str = Query("", alias="from"),
    to: str = Query("", alias="to"),
    bucket: str = "hour",
):
    end = _parse_iso_local(to)
    start = _parse_iso_local(from_)
    if end is None:
        end = datetime.now()
    if start is None:
        start = end - timedelta(hours=24)
    if bucket not in ("hour", "day"):
        bucket = "hour"

    buckets: dict[datetime, float] = {b: 0.0 for b in _bucket_range(start, end, bucket)}

    for c in db.list_cars():
        if c.get("payment_valid") is not True:
            continue
        ts = _parse_iso_local(c.get("updated_at") or "")
        if ts is None or ts < start or ts > end:
            continue
        key = _floor_bucket(ts, bucket)
        if key in buckets:
            buckets[key] += float(c.get("paid_amount") or 0)

    return [
        {"ts": k.isoformat(), "amount": round(v, 2)}
        for k, v in sorted(buckets.items())
    ]


# ---------------------------------------------------------------------------
# Occupancy series — reconstruct from each visit's [entry_time, exit_time] window.
# A visit is "occupying a spot" at time T iff entry_time <= T and (exit_time is
# null OR exit_time > T). exit_time being null means the car hasn't left yet.
# ---------------------------------------------------------------------------

@router.get("/occupancy")
def occupancy(
    from_: str = Query("", alias="from"),
    to: str = Query("", alias="to"),
    bucket: str = "hour",
):
    end = _parse_iso_local(to)
    start = _parse_iso_local(from_)
    if end is None:
        end = datetime.now()
    if start is None:
        start = end - timedelta(hours=24)
    if bucket not in ("hour", "day"):
        bucket = "hour"

    intervals: list[tuple[datetime, datetime | None]] = []
    for c in db.list_cars():
        entry = _parse_server_dt(c.get("entry_time") or "")
        if entry is None:
            continue
        exit_dt = _parse_server_dt(c.get("exit_time") or "")
        # Drop visits that don't overlap the requested window at all.
        if entry > end:
            continue
        if exit_dt is not None and exit_dt < start:
            continue
        intervals.append((entry, exit_dt))

    points = []
    for b in _bucket_range(start, end, bucket):
        occupied = sum(
            1 for entry, exit_dt in intervals
            if entry <= b and (exit_dt is None or exit_dt > b)
        )
        points.append({"ts": b.isoformat(), "occupied": occupied})
    return points
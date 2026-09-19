# admin_routes.py — reads from your existing db.py, doesn't modify it
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

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
        # updated_at from Supabase is always UTC - cutoff must stay UTC too, or a
        # payment made "today" in local time can land on the wrong side of midnight
        # and silently vanish from every window except "total".
        total = 0.0
        for c in validated:
            updated_at = c.get("updated_at")
            if not updated_at:
                continue
            try:
                ts = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            except ValueError:
                continue
            if ts >= cutoff:
                total += float(c.get("paid_amount") or 0)
        return total

    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now_utc.weekday())
    month_start = today_start.replace(day=1)

    total_revenue = sum(float(c.get("paid_amount") or 0) for c in validated)

    # entry_time comes from the simulator's ServerDateTime as a local-naive string
    # (no timezone), unlike updated_at above - compare against local, not UTC, "today".
    today_str = datetime.now().strftime("%Y-%m-%d")
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


@router.get("/revenue")
def revenue(from_: str = "", to: str = "", bucket: str = "hour"):
    return []


@router.get("/occupancy")
def occupancy(from_: str = "", to: str = "", bucket: str = "hour"):
    return []
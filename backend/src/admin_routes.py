# admin_routes.py — reads from your existing db.py, doesn't modify it
from datetime import datetime

from fastapi import APIRouter, Depends

import auth
import db

router = APIRouter(prefix="/api/admin", dependencies=[Depends(auth.require_admin)])


@router.get("/stats")
def stats():
    cars = db.list_cars()
    penalties = db.list_penalties(limit=10_000)

    validated = [c for c in cars if c.get("payment_valid") is True]
    total_revenue = sum(float(c.get("paid_amount") or 0) for c in validated)
    parked = [c for c in cars if c.get("status") == "parked"]

    today = datetime.now().strftime("%Y-%m-%d")
    today_arrivals = sum(1 for c in cars if (c.get("entry_time") or "").startswith(today))

    return {
        "revenue": {
            "total": total_revenue,
            "today": total_revenue,
            "thisWeek": total_revenue,
            "thisMonth": total_revenue,
        },
        "occupancy": {
            "current": len(parked),
            "capacity": 20,
            "today": today_arrivals,
            "peakToday": len(parked),
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
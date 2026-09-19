import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import requests
import config

STALE_MINUTES = 10
NON_TERMINAL_STATUSES = ("entering", "parked", "pending_exit", "at_exit")


def main() -> None:
    headers = {"apikey": config.SUPABASE_SECRET_KEY, "Authorization": f"Bearer {config.SUPABASE_SECRET_KEY}"}
    base = f"{config.SUPABASE_URL}/rest/v1"
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=STALE_MINUTES)).isoformat()

    resp = requests.get(
        f"{base}/cars",
        headers=headers,
        params={
            "status": f"in.({','.join(NON_TERMINAL_STATUSES)})",
            "updated_at": f"lt.{cutoff}",
            "select": "id,plate,status,updated_at",
            "order": "updated_at.asc",
        },
    )
    resp.raise_for_status()
    stale = resp.json()

    if not stale:
        print("No orphaned visit records found.")
        return

    print(f"Found {len(stale)} orphaned visit record(s) (stuck > {STALE_MINUTES} min):")
    for c in stale:
        print(f"  id={c['id']:<6} {c['plate']:12s} status={c['status']:12s} last updated={c['updated_at']}")

    # Some of these may have a real payment attached (e.g. the payment write
    # succeeded but the follow-up status="left" update failed) - payments.visit_id
    # has no ON DELETE CASCADE, so deleting them would violate that FK. Check first:
    # a single blocked row would otherwise abort the whole batch, and we never want
    # to silently lose a payment record by cascading through it.
    ids = [c["id"] for c in stale]
    pay_resp = requests.get(
        f"{base}/payments",
        headers=headers,
        params={"visit_id": f"in.({','.join(str(i) for i in ids)})", "select": "visit_id"},
    )
    pay_resp.raise_for_status()
    blocked_ids = {p["visit_id"] for p in pay_resp.json()}

    deletable = [c for c in stale if c["id"] not in blocked_ids]
    blocked = [c for c in stale if c["id"] in blocked_ids]

    if blocked:
        print(f"\n{len(blocked)} record(s) have a payment attached and will be SKIPPED (not deleted):")
        for c in blocked:
            print(f"  id={c['id']:<6} {c['plate']:12s} status={c['status']:12s}")

    if not deletable:
        print("\nNothing left to delete.")
        return

    answer = input(f"\nDelete the remaining {len(deletable)} record(s)? [y/N] ").strip().lower()
    if answer != "y":
        print("Aborted, nothing deleted.")
        return

    # cars is now a per-VISIT table (a plate can have many rows), so deleting must
    # target the specific visit id - deleting by plate would also wipe that plate's
    # other, unrelated (possibly completed) visits. Any car_slots row for these
    # visits is removed automatically via ON DELETE CASCADE on visit_id.
    ids_filter = ",".join(str(c["id"]) for c in deletable)
    del_resp = requests.delete(f"{base}/cars", headers=headers, params={"id": f"in.({ids_filter})"})
    del_resp.raise_for_status()
    print(f"Deleted {len(deletable)} orphaned visit record(s).")


if __name__ == "__main__":
    main()

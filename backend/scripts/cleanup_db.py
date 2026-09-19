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
            "select": "plate,status,updated_at",
            "order": "updated_at.asc",
        },
    )
    resp.raise_for_status()
    stale = resp.json()

    if not stale:
        print("No orphaned car records found.")
        return

    print(f"Found {len(stale)} orphaned car record(s) (stuck > {STALE_MINUTES} min):")
    for c in stale:
        print(f"  {c['plate']:12s} status={c['status']:12s} last updated={c['updated_at']}")

    answer = input("\nDelete these? [y/N] ").strip().lower()
    if answer != "y":
        print("Aborted, nothing deleted.")
        return

    plates_filter = ",".join(f'"{c["plate"]}"' for c in stale)
    del_resp = requests.delete(f"{base}/cars", headers=headers, params={"plate": f"in.({plates_filter})"})
    del_resp.raise_for_status()
    print(f"Deleted {len(stale)} orphaned car record(s).")


if __name__ == "__main__":
    main()

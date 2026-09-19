import json

import config


def _load_level() -> dict:
    return json.loads(config.LEVEL_LAYOUT_FILE.read_text())


def _nearest_gate_name(x: float, y: float, gates: list[dict]) -> str | None:
    if not gates:
        return None
    closest = min(gates, key=lambda g: (g["X"] - x) ** 2 + (g["Y"] - y) ** 2)
    return closest["Name"]


def find_entry_exit_gates() -> tuple[str | None, str | None]:
    if not config.LEVEL_LAYOUT_FILE.exists():
        return None, None

    level = _load_level()
    spots = level.get("ParkingSpots", [])
    gates = level.get("Gates", [])

    entry_spot = next((s for s in spots if s["Purpose"] == "EntrySpot"), None)
    exit_spot = next((s for s in spots if s["Purpose"] == "ExitSpot"), None)

    entry_gate = _nearest_gate_name(entry_spot["X"], entry_spot["Y"], gates) if entry_spot else None
    exit_gate = _nearest_gate_name(exit_spot["X"], exit_spot["Y"], gates) if exit_spot else None
    return entry_gate, exit_gate

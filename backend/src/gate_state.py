import threading

# Gate control has two layers and the operator's always wins.
#
# _manually_closed is the operator override, unchanged in meaning: a gate an operator
# closed by hand is never opened by automation. Pressing Open in the UI clears the
# override and hands the gate back to automation.
#
# _holders counts the cars currently passing through a gate. Without it, one car leaving
# the entry spot would close the gate on another still standing on it - both cars' events
# run concurrently on different webhook workers. The gate opens for the first car to
# arrive and closes once the last one is through.
#
# _zoned is the set of gates that carry a zoneParent. Only those are driven automatically;
# gates with no zone sit on the approach roads and stay open.
_lock = threading.Lock()
_manually_closed: set[str] = set()
_holders: dict[str, set[str]] = {}
_zoned: set[str] = set()


def mark_manual_close(name: str) -> None:
    with _lock:
        _manually_closed.add(name)


def mark_reopened(name: str) -> None:
    with _lock:
        _manually_closed.discard(name)


def is_manually_closed(name: str) -> bool:
    with _lock:
        return name in _manually_closed


def set_zoned_gates(names) -> None:
    with _lock:
        _zoned.clear()
        _zoned.update(names)


def is_zoned(name: str) -> bool:
    with _lock:
        return name in _zoned


def acquire(name: str, plate: str) -> bool:
    """Registers a car as needing this gate open. True means it is the first one, so the
    caller should actually open the gate."""
    with _lock:
        holders = _holders.setdefault(name, set())
        was_empty = not holders
        holders.add(plate)
        return was_empty


def release(name: str, plate: str) -> bool:
    """Drops a car's claim. True means none are left, so the caller should close the gate.
    Releasing a claim the car never held is a no-op."""
    with _lock:
        holders = _holders.get(name)
        if not holders or plate not in holders:
            return False
        holders.discard(plate)
        if holders:
            return False
        _holders.pop(name, None)
        return True


def holder_count(name: str) -> int:
    with _lock:
        return len(_holders.get(name, ()))

_manually_closed: set[str] = set()


def mark_manual_close(name: str) -> None:
    _manually_closed.add(name)


def mark_reopened(name: str) -> None:
    _manually_closed.discard(name)


def is_manually_closed(name: str) -> bool:
    return name in _manually_closed

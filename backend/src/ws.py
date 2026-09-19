import asyncio

from fastapi import WebSocket

_subscribers: set[WebSocket] = set()
_loop: asyncio.AbstractEventLoop | None = None


def set_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


async def connect(ws: WebSocket) -> None:
    await ws.accept()
    _subscribers.add(ws)


def disconnect(ws: WebSocket) -> None:
    _subscribers.discard(ws)


async def broadcast(payload: dict) -> None:
    dead = []
    for ws in list(_subscribers):
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _subscribers.discard(ws)


def broadcast_nowait(payload: dict) -> None:
    """Safe to call from either the event loop thread or a threadpool worker thread
    (webhook handlers now run via run_in_threadpool, so there is no running loop
    in their thread — asyncio.run_coroutine_threadsafe schedules it on the real loop)."""
    if _loop is None:
        return
    asyncio.run_coroutine_threadsafe(broadcast(payload), _loop)

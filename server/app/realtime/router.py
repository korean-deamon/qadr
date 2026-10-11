"""Authenticated WebSocket (SPEC §13). Events are hints; history always loads from REST."""

import asyncio
import contextlib
import json
import time
import uuid

import jwt
import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.cookies import ACCESS_COOKIE
from app.core.db import SessionLocal
from app.core.redis import get_redis
from app.core.security import decode_access_token
from app.modules.auth.models import User
from app.realtime.hub import channel

router = APIRouter()
log = structlog.get_logger()
PING_SECONDS = 25


def _origin_ok(origin: str | None) -> bool:
    if not origin:
        return False
    return any(origin.startswith(o) for o in [settings.frontend_url, *settings.cors_origin_list])


@router.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    if not _origin_ok(websocket.headers.get("origin")):
        await websocket.close(code=4403)
        return
    token = websocket.cookies.get(ACCESS_COOKIE)
    try:
        claims = decode_access_token(token or "")
    except jwt.InvalidTokenError:
        await websocket.close(code=4401)  # client refreshes, then reconnects
        return
    # never trust client-sent ids: identity comes from the verified token only
    async with SessionLocal() as db:
        user = await db.get(User, uuid.UUID(claims["sub"]))
    if not user or not user.is_active or user.banned_at or not user.email_verified_at:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    pubsub = get_redis().pubsub()
    await pubsub.subscribe(channel(user.id), "broadcast")
    expires_in = max(1.0, claims["exp"] - time.time())

    async def pump() -> None:
        async for message in pubsub.listen():
            if message.get("type") == "message":
                await websocket.send_text(message["data"])

    async def ping() -> None:
        while True:
            await asyncio.sleep(PING_SECONDS)
            await websocket.send_text(json.dumps({"type": "ping"}))

    async def receive() -> None:
        while True:
            await websocket.receive_text()  # client pings; content ignored

    tasks = [asyncio.create_task(pump()), asyncio.create_task(ping()), asyncio.create_task(receive())]
    try:
        await asyncio.wait(tasks, timeout=expires_in, return_when=asyncio.FIRST_COMPLETED)
    except WebSocketDisconnect:
        pass
    finally:
        for t in tasks:
            t.cancel()
        with contextlib.suppress(Exception):
            await pubsub.unsubscribe()
            await pubsub.aclose()
        with contextlib.suppress(Exception):
            await websocket.close(code=4001)  # token expired: reconnect after refresh

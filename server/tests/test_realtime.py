import asyncio
import json

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.db import SessionLocal
from app.core.redis import get_redis
from app.main import app
from app.modules.notifications.service import notify
from app.realtime.hub import channel
from tests.conftest import make_user


def test_ws_rejects_foreign_origin_and_missing_session() -> None:
    # no `with TestClient(...)`: skip the lifespan, which would close the shared Redis client
    tc = TestClient(app)
    with (
        pytest.raises(WebSocketDisconnect) as bad_origin,
        tc.websocket_connect("/api/v1/ws", headers={"origin": "https://evil.example"}) as ws,
    ):
        ws.receive_text()
    assert bad_origin.value.code == 4403
    with (
        pytest.raises(WebSocketDisconnect) as no_cookie,
        tc.websocket_connect("/api/v1/ws", headers={"origin": "http://localhost:3000"}) as ws,
    ):
        ws.receive_text()
    assert no_cookie.value.code == 4401


async def test_events_publish_after_commit_only() -> None:
    user = await make_user()
    pubsub = get_redis().pubsub()
    await pubsub.subscribe(channel(user.id))
    await pubsub.get_message(timeout=1)  # subscribe ack

    async with SessionLocal() as db:
        await notify(db, user.id, "rating_received", {"actor": "A", "score": 5}, external=False)
        await db.rollback()  # rolled back: nothing must be published
    assert await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.5) is None

    async with SessionLocal() as db:
        await notify(db, user.id, "rating_received", {"actor": "A", "score": 5}, external=False)
        await db.commit()
    msg = None
    for _ in range(20):
        msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.2)
        if msg:
            break
        await asyncio.sleep(0.05)
    assert msg is not None
    event = json.loads(msg["data"])
    assert event["type"] == "notification.new" and event["data"]["type"] == "rating_received"
    await pubsub.aclose()

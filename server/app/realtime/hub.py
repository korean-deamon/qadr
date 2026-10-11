"""Real-time fan-out (SPEC §13): persist first, then publish via Redis Pub/Sub so
any API instance can deliver to the user's sockets."""

import asyncio
import json
import uuid
from typing import Any

import structlog
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.redis import get_redis

log = structlog.get_logger()
PENDING_KEY = "realtime_pending"


def channel(user_id: uuid.UUID | str) -> str:
    return f"user:{user_id}"


async def publish(user_id: uuid.UUID | str, event_type: str, data: dict[str, Any]) -> None:
    try:
        await get_redis().publish(channel(user_id), json.dumps({"type": event_type, "data": data}, default=str))
    except Exception as exc:  # realtime is best-effort; REST stays authoritative
        log.warning("realtime.publish_failed", error=str(exc))


async def publish_broadcast(event_type: str, data: dict[str, Any]) -> None:
    try:
        await get_redis().publish("broadcast", json.dumps({"type": event_type, "data": data}, default=str))
    except Exception as exc:
        log.warning("realtime.publish_failed", error=str(exc))


def defer(session: AsyncSession, user_id: uuid.UUID | str | None, event_type: str, data: dict[str, Any]) -> None:
    """Queue an event to publish only after the transaction commits (user_id None = broadcast)."""
    session.sync_session.info.setdefault(PENDING_KEY, []).append((user_id, event_type, data))


@event.listens_for(Session, "after_commit")
def _after_commit(sync_session: Session) -> None:
    pending = sync_session.info.pop(PENDING_KEY, [])
    if not pending:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    for user_id, event_type, data in pending:
        coro = publish_broadcast(event_type, data) if user_id is None else publish(user_id, event_type, data)
        task = loop.create_task(coro)
        _TASKS.add(task)
        task.add_done_callback(_TASKS.discard)


@event.listens_for(Session, "after_rollback")
def _after_rollback(sync_session: Session) -> None:
    sync_session.info.pop(PENDING_KEY, None)


_TASKS: set[asyncio.Task[None]] = set()

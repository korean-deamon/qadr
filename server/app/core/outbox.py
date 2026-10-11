"""Transactional outbox: side effects are recorded in the same DB transaction
as the state change and dispatched by Celery (idempotent, retried)."""

import asyncio
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String, event, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.config import settings
from app.core.db import Base, UUIDPk


class TaskOutbox(UUIDPk, Base):
    __tablename__ = "task_outbox"
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    last_error: Mapped[str | None] = mapped_column(String(500))


def enqueue(session: AsyncSession, event_type: str, payload: dict[str, Any]) -> TaskOutbox:
    row = TaskOutbox(id=uuid.uuid4(), event_type=event_type, payload=payload, attempts=0)
    session.add(row)
    session.sync_session.info["kick_outbox"] = True
    return row


@event.listens_for(Session, "after_commit")
def _kick_after_commit(sync_session: Session) -> None:
    if not sync_session.info.pop("kick_outbox", False) or settings.app_env == "test":
        return
    from app.tasks.trigger import kick_outbox

    try:
        asyncio.get_running_loop().run_in_executor(None, kick_outbox)
    except RuntimeError:
        kick_outbox()


@event.listens_for(Session, "after_rollback")
def _forget_kick(sync_session: Session) -> None:
    sync_session.info.pop("kick_outbox", None)

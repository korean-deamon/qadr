"""Persisted notifications (SPEC §10 rule 8) with external delivery via the outbox."""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.outbox import enqueue
from app.modules.notifications.models import Notification
from app.realtime import hub

# Types that also go to Telegram (or email when Telegram isn't linked): SPEC §22
EXTERNAL_TYPES = {
    "request_received",
    "request_approved",
    "return_due_tomorrow",
    "return_due_today",
    "moderation_message",
    "account_warned",
    "account_restricted",
    "listing_hidden",
    "listing_removed",
    "report_resolved",
}


async def notify(
    session: AsyncSession,
    user_id: uuid.UUID,
    type_: str,
    payload: dict[str, Any],
    *,
    dedupe_key: str | None = None,
    external: bool | None = None,
) -> Notification | None:
    """Create a notification once per dedupe key; queue Telegram/email delivery for key types."""
    if dedupe_key:
        exists = await session.scalar(select(Notification.id).where(Notification.dedupe_key == dedupe_key))
        if exists:
            return None
    n = Notification(id=uuid.uuid4(), user_id=user_id, type=type_, payload=payload, dedupe_key=dedupe_key)
    session.add(n)
    if external if external is not None else type_ in EXTERNAL_TYPES:
        enqueue(session, "notification.deliver", {"notification_id": str(n.id)})
    hub.defer(session, user_id, "notification.new", {"id": str(n.id), "type": type_, "payload": payload})
    return n

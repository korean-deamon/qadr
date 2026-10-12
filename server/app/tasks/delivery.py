"""Outbox dispatch: OTP codes and notifications to Telegram, with email fallback.
At-least-once with bounded exponential backoff; rows are locked with SKIP LOCKED
so several workers never process the same event."""

import uuid
from datetime import date, timedelta
from typing import Any

import httpx
import structlog
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.i18n import t
from app.core.outbox import TaskOutbox
from app.core.time import now_utc
from app.modules.auth.models import User
from app.modules.notifications.models import Notification

log = structlog.get_logger()
MAX_ATTEMPTS = 8
BATCH = 50


class TelegramBlocked(Exception):
    pass


async def send_telegram(chat_id: int, text: str) -> None:
    if not settings.telegram_enabled:
        raise TelegramBlocked("telegram not configured")
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True},
        )
    if res.status_code == 403:
        raise TelegramBlocked("bot blocked by user")
    if res.status_code == 429:
        raise RuntimeError(f"telegram rate limited: {res.text[:200]}")
    res.raise_for_status()


def _fmt_date(value: str | None, locale: str) -> str:
    if not value:
        return ""
    try:
        d = date.fromisoformat(value[:10])
    except ValueError:
        return value
    return d.strftime("%d.%m.%Y") if locale != "en" else d.strftime("%b %d, %Y")


def render(n: Notification, locale: str) -> str:
    p: dict[str, Any] = dict(n.payload or {})
    dates = ""
    if p.get("start") and p.get("end"):
        dates = f"{_fmt_date(p['start'], locale)} – {_fmt_date(p['end'], locale)}"
    p.setdefault("dates", dates)
    p.setdefault("actor", "")
    p.setdefault("item", "")
    p["due"] = _fmt_date(p.get("due"), locale) if p.get("due") else ""
    p["until"] = _fmt_date(p.get("until"), locale) if p.get("until") else ""
    p.setdefault("reason", "")
    p.setdefault("text", "")
    p.setdefault("preview", "")
    return t(f"n.{n.type}", locale, **p)


def site_link(n: Notification) -> str:
    p = n.payload or {}
    base = settings.frontend_url.rstrip("/")
    if p.get("listing_id") and n.type.startswith(("request_", "loan_", "return_")):
        return f"{base}/dashboard"
    return f"{base}/notifications"


async def _mark_blocked(db: AsyncSession, user: User) -> None:
    user.telegram_blocked_at = now_utc()
    await db.flush()


async def deliver_otp(db: AsyncSession, payload: dict[str, Any]) -> None:
    """Codes go only to Telegram (SPEC §11). A blocked bot means no code; the user
    is told on the site to reopen the bot and request a new one."""
    user = await db.get(User, uuid.UUID(payload["user_id"]))
    code = payload.get("code")
    if not user or not code or not user.telegram_id or user.telegram_blocked_at:
        return
    try:
        await send_telegram(user.telegram_id, t("bot.otp", user.preferred_locale, code=code))
    except TelegramBlocked:
        await _mark_blocked(db, user)
        log.warning("otp.undeliverable", user=str(user.id))


async def deliver_notification(db: AsyncSession, payload: dict[str, Any]) -> None:
    """Telegram copy of an in-app notification. The in-app row already exists, so
    users without a reachable Telegram simply see it on the site."""
    n = await db.get(Notification, uuid.UUID(payload["notification_id"]))
    if not n:
        return
    user = await db.get(User, n.user_id)
    if not user or not user.is_active:
        return
    if not (user.telegram_id and user.telegram_notifications and not user.telegram_blocked_at):
        return
    if not settings.telegram_enabled:
        return
    try:
        await send_telegram(user.telegram_id, f"{render(n, user.preferred_locale)}\n\n{site_link(n)}")
    except TelegramBlocked:
        await _mark_blocked(db, user)


HANDLERS = {"otp.deliver": deliver_otp, "notification.deliver": deliver_notification}


async def process_outbox(db: AsyncSession, limit: int = BATCH) -> int:
    rows = (
        await db.scalars(
            select(TaskOutbox)
            .where(TaskOutbox.processed_at.is_(None), TaskOutbox.attempts < MAX_ATTEMPTS)
            .where(or_(TaskOutbox.next_attempt_at.is_(None), TaskOutbox.next_attempt_at <= now_utc()))
            .order_by(TaskOutbox.created_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
    ).all()
    done = 0
    for row in rows:
        handler = HANDLERS.get(row.event_type)
        try:
            if handler:
                await handler(db, row.payload)
            row.processed_at = now_utc()
            row.payload = {k: v for k, v in row.payload.items() if k != "code"}  # never keep codes
            done += 1
        except Exception as exc:
            row.attempts += 1
            row.last_error = str(exc)[:500]
            row.next_attempt_at = now_utc() + timedelta(seconds=min(3600, 15 * 2**row.attempts))
            log.warning(
                "outbox.retry", id=str(row.id), type=row.event_type, attempts=row.attempts, error=str(exc)[:200]
            )
    await db.commit()
    return done

"""Telegram phone linking (SPEC §22). Used by the API (tokens) and the bot (linking)."""

import re
import uuid
from datetime import timedelta
from enum import StrEnum

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit as rl
from app.core.config import settings
from app.core.errors import AppError
from app.core.security import hash_token, new_token
from app.core.time import now_utc
from app.modules.auth.models import User
from app.modules.notifications.service import notify
from app.modules.telegram.models import TelegramLinkToken
from app.realtime import hub


class LinkResult(StrEnum):
    LINKED = "linked"
    TOKEN_INVALID = "token_invalid"  # noqa: S105 (not a secret)
    WRONG_CONTACT = "wrong_contact"
    PHONE_TAKEN = "phone_taken"
    TELEGRAM_TAKEN = "telegram_taken"


def normalize_phone(raw: str) -> str | None:
    """E.164; Uzbek numbers without a country code get +998."""
    digits = re.sub(r"\D", "", raw or "")
    if not digits:
        return None
    if len(digits) == 9:
        digits = "998" + digits
    if len(digits) < 10 or len(digits) > 15:
        return None
    return "+" + digits


async def create_link_token(db: AsyncSession, user: User) -> tuple[str, str]:
    if not settings.telegram_enabled:
        raise AppError("TELEGRAM_NOT_CONFIGURED", 503)
    await rl.hit(rl.TELEGRAM_LINK, str(user.id))
    # only the newest token stays usable
    await db.execute(
        update(TelegramLinkToken)
        .where(TelegramLinkToken.user_id == user.id, TelegramLinkToken.consumed_at.is_(None))
        .values(consumed_at=now_utc())
    )
    token = new_token(24)
    db.add(
        TelegramLinkToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=now_utc() + timedelta(minutes=settings.telegram_link_token_ttl_minutes),
        )
    )
    await db.commit()
    return token, f"https://t.me/{settings.telegram_bot_username}?start={token}"


async def pending_user(db: AsyncSession, token: str) -> User | None:
    row = await db.scalar(select(TelegramLinkToken).where(TelegramLinkToken.token_hash == hash_token(token)))
    if not row or row.consumed_at or row.expires_at < now_utc():
        return None
    return await db.get(User, row.user_id)


async def link(
    db: AsyncSession, token: str, *, from_id: int, contact_user_id: int | None, phone: str, username: str | None
) -> tuple[LinkResult, User | None]:
    """Verify and store the contact. `contact.user_id == from.id` proves the number is the sender's."""
    row = await db.scalar(
        select(TelegramLinkToken).where(TelegramLinkToken.token_hash == hash_token(token)).with_for_update()
    )
    if not row or row.consumed_at or row.expires_at < now_utc():
        return LinkResult.TOKEN_INVALID, None
    if contact_user_id is None or contact_user_id != from_id:
        return LinkResult.WRONG_CONTACT, None
    e164 = normalize_phone(phone)
    if not e164:
        return LinkResult.WRONG_CONTACT, None
    user = await db.get(User, row.user_id, with_for_update=True)
    if not user or not user.is_active:
        return LinkResult.TOKEN_INVALID, None
    phone_owner = await db.scalar(
        select(User.id).where(User.phone == e164, User.phone_verified_at.is_not(None), User.id != user.id)
    )
    if phone_owner:
        return LinkResult.PHONE_TAKEN, user
    tg_owner = await db.scalar(select(User.id).where(User.telegram_id == from_id, User.id != user.id))
    if tg_owner:
        return LinkResult.TELEGRAM_TAKEN, user
    now = now_utc()
    user.phone = e164
    user.phone_verified_at = now
    user.verified_at = user.verified_at or now  # first link verifies the account for good
    user.telegram_id = from_id
    user.telegram_username = username
    user.telegram_linked_at = now
    user.telegram_blocked_at = None
    row.consumed_at = now
    await notify(
        db,
        user.id,
        "telegram_linked",
        {"phone": e164},
        dedupe_key=f"telegram_linked:{user.id}:{int(now.timestamp())}",
        external=False,
    )
    hub.defer(db, user.id, "telegram.linked", {"phone": e164})
    await db.commit()
    return LinkResult.LINKED, user


async def unlink(db: AsyncSession, user: User) -> None:
    """Unlinking keeps nothing from Telegram; the phone stays but is no longer verified.
    The account is then limited again until Telegram is linked (SPEC §11)."""
    user.telegram_id = None
    user.telegram_username = None
    user.telegram_linked_at = None
    user.phone_verified_at = None
    await db.commit()

"""Registration, email OTP, login, rotating refresh tokens with reuse detection, reset."""

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit as rl
from app.core.config import settings
from app.core.errors import AppError
from app.core.outbox import enqueue
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    needs_rehash,
    new_otp,
    new_token,
    verify_password,
)
from app.core.time import now_utc
from app.modules.auth.models import EmailOtp, RefreshToken, User

OTP_TTL = timedelta(minutes=10)
OTP_MAX_ATTEMPTS = 5
TELEGRAM_PROMPT_SNOOZE = timedelta(days=7)
# Equalise timing for unknown emails (no account enumeration via latency)
_DUMMY_HASH = hash_password("timing-equaliser-password")


def normalize_email(email: str) -> str:
    return email.strip().lower()


@dataclass
class Session:
    access: str
    refresh: str
    user: User


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == normalize_email(email)))


def code_channel(user: User, purpose: str) -> str:
    """Registration codes always go by email; later codes prefer a linked Telegram (SPEC §11)."""
    if purpose == "verify":
        return "email"
    if user.telegram_id and not user.telegram_blocked_at and settings.telegram_enabled:
        return "telegram"
    return "email"


async def issue_otp(db: AsyncSession, user: User, purpose: str) -> str:
    """Invalidate older codes of the same purpose and queue delivery of a fresh one."""
    await db.execute(
        update(EmailOtp)
        .where(EmailOtp.user_id == user.id, EmailOtp.purpose == purpose, EmailOtp.consumed_at.is_(None))
        .values(consumed_at=now_utc())
    )
    code = new_otp()
    channel = code_channel(user, purpose)
    db.add(
        EmailOtp(
            id=uuid.uuid4(),
            user_id=user.id,
            code_hash=hash_token(f"{user.id}:{purpose}:{code}"),
            purpose=purpose,
            channel=channel,
            expires_at=now_utc() + OTP_TTL,
            attempts=0,
        )
    )
    # The code travels in the outbox payload and is wiped once delivered.
    enqueue(db, "otp.deliver", {"user_id": str(user.id), "purpose": purpose, "channel": channel, "code": code})
    return channel


async def check_otp(db: AsyncSession, user: User, purpose: str, code: str) -> None:
    otp = await db.scalar(
        select(EmailOtp)
        .where(EmailOtp.user_id == user.id, EmailOtp.purpose == purpose, EmailOtp.consumed_at.is_(None))
        .order_by(EmailOtp.created_at.desc())
        .with_for_update()
    )
    if not otp:
        raise AppError("OTP_INVALID", 400, attempts_left=0)
    if otp.expires_at < now_utc():
        raise AppError("OTP_EXPIRED", 400)
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        raise AppError("OTP_ATTEMPTS_EXCEEDED", 400)
    if otp.code_hash != hash_token(f"{user.id}:{purpose}:{code}"):
        otp.attempts += 1
        left = OTP_MAX_ATTEMPTS - otp.attempts
        await db.commit()
        raise AppError("OTP_ATTEMPTS_EXCEEDED" if left <= 0 else "OTP_INVALID", 400, attempts_left=max(left, 0))
    otp.consumed_at = now_utc()


async def register(db: AsyncSession, email: str, password: str, name: str, locale: str) -> User:
    email = normalize_email(email)
    existing = await get_by_email(db, email)
    if existing and existing.email_verified_at:
        raise AppError("EMAIL_TAKEN", 409)
    if existing:  # unverified re-registration: refresh credentials, send a new code
        existing.password_hash = hash_password(password)
        existing.display_name = name
        existing.preferred_locale = locale
        user = existing
    else:
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=hash_password(password),
            display_name=name,
            preferred_locale=locale,
        )
        db.add(user)
        await db.flush()
    await rl.hit(rl.OTP_RESEND_COOLDOWN, f"verify:{email}")
    await issue_otp(db, user, "verify")
    await db.commit()
    return user


async def create_session(
    db: AsyncSession, user: User, *, auth_time: datetime | None = None, family: uuid.UUID | None = None
) -> Session:
    auth_time = auth_time or now_utc()
    refresh = new_token(48)
    db.add(
        RefreshToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(refresh),
            family_id=family or uuid.uuid4(),
            auth_time=auth_time,
            expires_at=now_utc() + timedelta(days=settings.jwt_refresh_ttl_days),
        )
    )
    access = create_access_token(user.id, is_admin=user.is_admin, auth_time=auth_time)
    return Session(access=access, refresh=refresh, user=user)


async def verify_email(db: AsyncSession, email: str, code: str) -> Session:
    user = await get_by_email(db, email)
    if not user:
        raise AppError("OTP_INVALID", 400, attempts_left=0)
    if user.email_verified_at:
        raise AppError("ALREADY_VERIFIED", 409)
    await check_otp(db, user, "verify", code)
    user.email_verified_at = now_utc()
    session = await create_session(db, user)
    await db.commit()
    return session


async def resend(db: AsyncSession, email: str, purpose: str) -> str:
    user = await get_by_email(db, email)
    # Cooldown is keyed by email so unknown addresses behave identically.
    key = normalize_email(email)
    await rl.hit(rl.OTP_RESEND_COOLDOWN, f"{purpose}:{key}")
    await rl.hit(rl.OTP_RESEND_HOURLY, f"{purpose}:{key}")
    if not user or (purpose == "verify" and user.email_verified_at):
        return "email"
    channel = await issue_otp(db, user, purpose)
    await db.commit()
    return channel


async def login(db: AsyncSession, email: str, password: str, ip: str) -> Session:
    key = normalize_email(email)
    await rl.hit(rl.LOGIN_IP, ip)
    await rl.hit(rl.LOGIN_EMAIL, key)
    user = await get_by_email(db, key)
    if not user:
        verify_password(password, _DUMMY_HASH)
        raise AppError("INVALID_CREDENTIALS", 401)
    if not verify_password(password, user.password_hash):
        raise AppError("INVALID_CREDENTIALS", 401)
    if user.banned_at or not user.is_active:
        raise AppError("ACCOUNT_BANNED", 403)
    if not user.email_verified_at:
        try:
            await rl.hit(rl.OTP_RESEND_COOLDOWN, f"verify:{key}")
            await issue_otp(db, user, "verify")
            await db.commit()
        except AppError:
            pass  # a code was sent less than a minute ago
        raise AppError("EMAIL_NOT_VERIFIED", 403)
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    await rl.reset(rl.LOGIN_EMAIL, key)
    session = await create_session(db, user)
    await db.commit()
    return session


async def refresh(db: AsyncSession, token: str | None) -> Session:
    if not token:
        raise AppError("REFRESH_MISSING", 401)
    row = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)).with_for_update())
    if not row:
        raise AppError("REFRESH_INVALID", 401)
    if row.revoked_at is not None:
        # Reuse of a rotated/revoked token: assume theft, revoke the whole family.
        await revoke_family(db, row.family_id)
        await db.commit()
        raise AppError("REFRESH_REUSED", 401)
    if row.expires_at < now_utc():
        raise AppError("REFRESH_EXPIRED", 401)
    user = await db.get(User, row.user_id)
    if not user or not user.is_active or user.banned_at:
        await revoke_family(db, row.family_id)
        await db.commit()
        raise AppError("ACCOUNT_BANNED", 403)
    new = await create_session(db, user, auth_time=row.auth_time, family=row.family_id)
    row.revoked_at = now_utc()
    await db.commit()
    return new


async def revoke_family(db: AsyncSession, family_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now_utc())
    )


async def revoke_all(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now_utc())
    )


async def logout(db: AsyncSession, token: str | None) -> None:
    if not token:
        return
    row = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)))
    if row:
        await revoke_family(db, row.family_id)
        await db.commit()


async def forgot(db: AsyncSession, email: str) -> None:
    key = normalize_email(email)
    await rl.hit(rl.FORGOT, key)
    user = await get_by_email(db, key)
    if user and user.email_verified_at and not user.banned_at:
        await issue_otp(db, user, "reset")
        await db.commit()


async def reset_password(db: AsyncSession, email: str, code: str, password: str) -> None:
    key = normalize_email(email)
    await rl.hit(rl.RESET, key)
    user = await get_by_email(db, key)
    if not user:
        raise AppError("OTP_INVALID", 400, attempts_left=0)
    await check_otp(db, user, "reset", code)
    user.password_hash = hash_password(password)
    await revoke_all(db, user.id)
    await db.commit()


def me(user: User) -> dict[str, object]:
    now = now_utc()
    prompt = settings.telegram_enabled and not user.phone_verified_at and (
        user.telegram_prompt_dismissed_at is None or user.telegram_prompt_dismissed_at < now - TELEGRAM_PROMPT_SNOOZE
    )
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "area": user.area,
        "preferred_locale": user.preferred_locale,
        "email_verified": user.email_verified_at is not None,
        "phone": user.phone if user.phone_verified_at else None,
        "phone_verified": user.phone_verified_at is not None,
        "telegram_linked": user.telegram_id is not None,
        "telegram_username": user.telegram_username,
        "telegram_notifications": user.telegram_notifications,
        "show_telegram_prompt": bool(prompt),
        "is_admin": user.is_admin,
        "restricted_until": user.restricted_until if user.is_restricted(now) else None,
        "created_at": user.created_at,
    }

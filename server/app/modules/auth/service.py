"""Registration, login, rotating refresh tokens with reuse detection, password reset.

SPEC §11 (v3.3): there is no email verification. A new account signs in at once
but can do nothing until it links Telegram (contact share = phone verification).
One-time codes (password reset) are delivered only through the Telegram bot.
Accounts that never link are deleted after UNVERIFIED_TTL (see tasks/jobs.py).
"""

import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
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
UNVERIFIED_TTL = timedelta(hours=24)
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


def can_receive_codes(user: User) -> bool:
    """Codes go only to a linked, unblocked Telegram chat."""
    return bool(
        settings.telegram_enabled and user.telegram_id and user.phone_verified_at and not user.telegram_blocked_at
    )


async def issue_otp(db: AsyncSession, user: User, purpose: str) -> None:
    """Invalidate older codes of the same purpose and queue Telegram delivery of a fresh one."""
    await db.execute(
        update(EmailOtp)
        .where(EmailOtp.user_id == user.id, EmailOtp.purpose == purpose, EmailOtp.consumed_at.is_(None))
        .values(consumed_at=now_utc())
    )
    code = new_otp()
    channel = "telegram"
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


async def register(db: AsyncSession, email: str, password: str, name: str, locale: str) -> Session:
    """Create the account and sign in. Access stays limited until Telegram is linked."""
    email = normalize_email(email)
    existing = await get_by_email(db, email)
    if existing and existing.verified_at is None and existing.created_at < now_utc() - UNVERIFIED_TTL:
        await db.delete(existing)  # abandoned and due for cleanup anyway: free the address now
        await db.flush()
    elif existing:
        # Never overwrite an existing account, verified or not: the owner signs in instead.
        raise AppError("EMAIL_TAKEN", 409)
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password(password),
        display_name=name,
        preferred_locale=locale,
    )
    db.add(user)
    await db.flush()
    session = await create_session(db, user)
    await db.commit()
    return session


async def google_login(db: AsyncSession, credential: str, locale: str, ip: str) -> Session:
    """Verifies a Google ID token (the Identity Services button) and signs the user
    in, creating the account on first use. Matches by verified email: an existing
    email+password account signing in with the same Google account just logs in,
    nothing is overwritten. Telegram linking is still required afterward (SPEC §11)
    — Google only replaces the password, never the verification gate."""
    if not settings.google_enabled:
        raise AppError("GOOGLE_NOT_CONFIGURED", 503)
    await rl.hit(rl.GOOGLE_LOGIN_IP, ip)
    try:
        # Verifies the signature against Google's public keys and the `aud` claim
        # against our client ID; network call (fetches/caches Google's certs), so
        # it runs off the event loop.
        claims = await asyncio.to_thread(
            google_id_token.verify_oauth2_token, credential, google_requests.Request(), settings.google_client_id
        )
    except ValueError as exc:
        raise AppError("GOOGLE_TOKEN_INVALID", 401) from exc
    if not claims.get("email_verified"):
        raise AppError("GOOGLE_EMAIL_UNVERIFIED", 401)
    email = normalize_email(claims["email"])
    user = await get_by_email(db, email)
    if user:
        if user.banned_at or not user.is_active:
            raise AppError("ACCOUNT_BANNED", 403)
    else:
        name = (claims.get("name") or claims.get("given_name") or email.split("@")[0]).strip()[:80]
        user = User(id=uuid.uuid4(), email=email, password_hash=None, display_name=name, preferred_locale=locale)
        db.add(user)
        await db.flush()
    session = await create_session(db, user)
    await db.commit()
    return session


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
    access = create_access_token(
        user.id, is_admin=user.is_admin, auth_time=auth_time, linked=user.phone_verified_at is not None
    )
    return Session(access=access, refresh=refresh, user=user)


async def resend(db: AsyncSession, email: str) -> None:
    """Resend a password-reset code. Identical behaviour for unknown or unlinked emails."""
    key = normalize_email(email)
    await rl.hit(rl.OTP_RESEND_COOLDOWN, f"reset:{key}")
    await rl.hit(rl.OTP_RESEND_HOURLY, f"reset:{key}")
    user = await get_by_email(db, key)
    if user and can_receive_codes(user) and not user.banned_at:
        await issue_otp(db, user, "reset")
        await db.commit()


async def login(db: AsyncSession, email: str, password: str, ip: str) -> Session:
    key = normalize_email(email)
    await rl.hit(rl.LOGIN_IP, ip)
    await rl.hit(rl.LOGIN_EMAIL, key)
    user = await get_by_email(db, key)
    if not user or user.password_hash is None:
        # No account, or a Google-only account with no password: identical response
        # either way (no enumeration, no hint that this email uses Google).
        verify_password(password, _DUMMY_HASH)
        raise AppError("INVALID_CREDENTIALS", 401)
    if not verify_password(password, user.password_hash):
        raise AppError("INVALID_CREDENTIALS", 401)
    if user.banned_at or not user.is_active:
        raise AppError("ACCOUNT_BANNED", 403)
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
    if user and can_receive_codes(user) and not user.banned_at:
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
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "area": user.area,
        "preferred_locale": user.preferred_locale,
        "phone": user.phone if user.phone_verified_at else None,
        "phone_verified": user.phone_verified_at is not None,
        "telegram_linked": user.telegram_id is not None,
        "telegram_username": user.telegram_username,
        "telegram_notifications": user.telegram_notifications,
        "telegram_required": user.phone_verified_at is None,
        "delete_unverified_at": user.created_at + UNVERIFIED_TTL if user.verified_at is None else None,
        "is_admin": user.is_admin,
        "restricted_until": user.restricted_until if user.is_restricted(now) else None,
        "created_at": user.created_at,
    }

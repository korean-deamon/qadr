"""Request dependencies: DB session, current user, admin, CSRF."""

import uuid
from collections.abc import AsyncIterator
from datetime import timedelta
from typing import Annotated, Any

import jwt
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.cookies import ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER
from app.core.db import SessionLocal
from app.core.errors import AppError
from app.core.security import constant_time_equals, decode_access_token
from app.core.time import now_utc
from app.modules.auth.models import User

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
ADMIN_FRESH_LOGIN = timedelta(hours=12)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


DB = Annotated[AsyncSession, Depends(get_db)]


def _token_from(request: Request) -> str | None:
    token = request.cookies.get(ACCESS_COOKIE)
    if token:
        return token
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:]
    return None


def _claims(request: Request) -> dict[str, Any] | None:
    token = _token_from(request)
    if not token:
        return None
    try:
        return decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise AppError("TOKEN_EXPIRED", 401) from exc
    except jwt.InvalidTokenError as exc:
        raise AppError("TOKEN_INVALID", 401) from exc


async def optional_user(request: Request, db: DB) -> User | None:
    try:
        claims = _claims(request)
    except AppError:
        return None
    if not claims:
        return None
    user = await db.get(User, uuid.UUID(claims["sub"]))
    if not user or not user.is_active or user.banned_at:
        return None
    request.state.claims = claims
    return user


async def current_user_any(request: Request, db: DB) -> User:
    """Authenticated, Telegram linked or not. Only /auth/me, logout and the
    Telegram linking routes accept unlinked users (SPEC §11)."""
    claims = _claims(request)
    if not claims:
        raise AppError("NOT_AUTHENTICATED", 401)
    user = await db.get(User, uuid.UUID(claims["sub"]))
    if not user or not user.is_active:
        raise AppError("NOT_AUTHENTICATED", 401)
    if user.banned_at:
        raise AppError("ACCOUNT_BANNED", 403)
    request.state.claims = claims
    return user


async def current_user(user: Annotated[User, Depends(current_user_any)]) -> User:
    """Verified user: Telegram is linked, which verified their phone number."""
    if not user.phone_verified_at:
        raise AppError("TELEGRAM_REQUIRED", 403)
    return user


async def active_writer(user: Annotated[User, Depends(current_user)]) -> User:
    """Verified user who is not restricted: may create listings, requests, messages."""
    if user.is_restricted(now_utc()):
        raise AppError(
            "ACCOUNT_RESTRICTED", 403, until=user.restricted_until.isoformat() if user.restricted_until else None
        )
    return user


async def require_admin(user: Annotated[User, Depends(current_user)]) -> User:
    if not user.is_admin:
        raise AppError("ADMIN_REQUIRED", 403)
    return user


async def require_fresh_admin(request: Request, user: Annotated[User, Depends(require_admin)]) -> User:
    """Admin write actions need a login within the last 12 hours (SPEC §23)."""
    auth_time = getattr(request.state, "claims", {}).get("auth_time", 0)
    if now_utc().timestamp() - auth_time > ADMIN_FRESH_LOGIN.total_seconds():
        raise AppError("REAUTH_REQUIRED", 403)
    return user


async def csrf_protect(request: Request) -> None:
    """Double-submit CSRF + Origin check for cookie-authenticated unsafe requests."""
    if request.method in SAFE_METHODS:
        return
    if not request.cookies.get(ACCESS_COOKIE) and not request.cookies.get("qadr_refresh"):
        return  # not cookie-authenticated (e.g. login/register before a session exists)
    origin = request.headers.get("origin") or request.headers.get("referer", "")
    allowed = [settings.frontend_url, *settings.cors_origin_list]
    if origin and not any(origin.startswith(a) for a in allowed):
        raise AppError("CSRF_ORIGIN", 403)
    cookie = request.cookies.get(CSRF_COOKIE, "")
    header = request.headers.get(CSRF_HEADER, "")
    if not cookie or not header or not constant_time_equals(cookie, header):
        raise AppError("CSRF_FAILED", 403)


AnyUser = Annotated[User, Depends(current_user_any)]
CurrentUser = Annotated[User, Depends(current_user)]
Writer = Annotated[User, Depends(active_writer)]
Admin = Annotated[User, Depends(require_admin)]
FreshAdmin = Annotated[User, Depends(require_fresh_admin)]
OptionalUser = Annotated[User | None, Depends(optional_user)]

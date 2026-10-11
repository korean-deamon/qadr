"""Session cookies (SPEC §11.2): httpOnly access + refresh, readable CSRF token."""

from fastapi import Response

from app.core.config import settings
from app.core.security import new_token

ACCESS_COOKIE = "qadr_access"
REFRESH_COOKIE = "qadr_refresh"
CSRF_COOKIE = "qadr_csrf"
CSRF_HEADER = "x-csrf-token"


def _set(response: Response, name: str, value: str, max_age: int, *, httponly: bool) -> None:
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        httponly=httponly,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        domain=settings.cookie_domain or None,
    )


def set_session_cookies(response: Response, access: str, refresh: str) -> None:
    _set(response, ACCESS_COOKIE, access, settings.jwt_access_ttl_minutes * 60, httponly=True)
    _set(response, REFRESH_COOKIE, refresh, settings.jwt_refresh_ttl_days * 86400, httponly=True)
    ensure_csrf_cookie(response, force=True)


def ensure_csrf_cookie(response: Response, *, force: bool = False, current: str | None = None) -> str:
    token = current if (current and not force) else new_token(24)
    _set(response, CSRF_COOKIE, token, settings.jwt_refresh_ttl_days * 86400, httponly=False)
    return token


def clear_session_cookies(response: Response) -> None:
    for name in (ACCESS_COOKIE, REFRESH_COOKIE):
        response.delete_cookie(name, path="/", domain=settings.cookie_domain or None)

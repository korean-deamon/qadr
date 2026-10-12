from fastapi import APIRouter, Depends, Request, Response, status

from app.core.cookies import REFRESH_COOKIE, clear_session_cookies, ensure_csrf_cookie, set_session_cookies
from app.core.deps import DB, csrf_protect, current_user_any
from app.core.rate_limit import client_ip
from app.modules.auth import service
from app.modules.auth.models import User
from app.modules.auth.schemas import ForgotIn, GoogleLoginIn, LoginIn, MeOut, RegisterIn, ResendIn, ResetIn

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, request: Request, response: Response, db: DB) -> MeOut:
    """Creates the account and signs in. Next step for the client: link Telegram."""
    from app.core import rate_limit as rl

    await rl.hit(rl.REGISTER_IP, client_ip(request))
    session = await service.register(db, body.email, body.password, body.display_name, body.locale)
    set_session_cookies(response, session.access, session.refresh)
    return MeOut.model_validate(service.me(session.user))


@router.post("/resend-otp")
async def resend_otp(body: ResendIn, db: DB) -> dict[str, bool]:
    # Same response whether or not the account exists or has Telegram linked.
    await service.resend(db, body.email)
    return {"ok": True}


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response, db: DB) -> MeOut:
    session = await service.login(db, body.email, body.password, client_ip(request))
    set_session_cookies(response, session.access, session.refresh)
    return MeOut.model_validate(service.me(session.user))


@router.post("/google")
async def google_login(body: GoogleLoginIn, request: Request, response: Response, db: DB) -> MeOut:
    session = await service.google_login(db, body.credential, body.locale, client_ip(request))
    set_session_cookies(response, session.access, session.refresh)
    return MeOut.model_validate(service.me(session.user))


@router.post("/refresh", dependencies=[Depends(csrf_protect)])
async def refresh(request: Request, response: Response, db: DB) -> dict[str, bool]:
    try:
        session = await service.refresh(db, request.cookies.get(REFRESH_COOKIE))
    except Exception:
        clear_session_cookies(response)
        raise
    set_session_cookies(response, session.access, session.refresh)
    return {"ok": True}


@router.post("/logout", dependencies=[Depends(csrf_protect)])
async def logout(request: Request, response: Response, db: DB) -> dict[str, bool]:
    await service.logout(db, request.cookies.get(REFRESH_COOKIE))
    clear_session_cookies(response)
    return {"ok": True}


@router.post("/forgot-password")
async def forgot_password(body: ForgotIn, db: DB) -> dict[str, bool]:
    # Same response whether or not the account exists (no enumeration).
    await service.forgot(db, body.email)
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(body: ResetIn, db: DB) -> dict[str, bool]:
    await service.reset_password(db, body.email, body.code, body.password)
    return {"ok": True}


@router.get("/csrf")
async def csrf(request: Request, response: Response) -> dict[str, str]:
    """Ensures a CSRF cookie exists and returns its value."""
    token = ensure_csrf_cookie(response, current=request.cookies.get("qadr_csrf"))
    return {"csrf": token}


@router.get("/me")
async def me(user: User = Depends(current_user_any)) -> MeOut:
    return MeOut.model_validate(service.me(user))

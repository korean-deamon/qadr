import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select, update

from app.core.cookies import REFRESH_COOKIE, clear_session_cookies
from app.core.deps import DB, CurrentUser, csrf_protect
from app.core.errors import AppError, not_found
from app.core.security import verify_password
from app.core.time import now_utc
from app.modules.auth import service as auth_service
from app.modules.auth.models import User
from app.modules.auth.schemas import MeOut
from app.modules.listings.models import Listing
from app.modules.users.service import public_users

router = APIRouter(prefix="/users", tags=["users"])


class ProfileIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=80)
    area: str | None = Field(default=None, max_length=80)
    preferred_locale: Literal["uz", "ru", "en"] | None = None
    telegram_notifications: bool | None = None


class DeleteIn(BaseModel):
    password: str


@router.get("/me")
async def get_me(user: CurrentUser) -> MeOut:
    return MeOut.model_validate(auth_service.me(user))


@router.patch("/me", dependencies=[Depends(csrf_protect)])
async def update_me(body: ProfileIn, db: DB, user: CurrentUser) -> MeOut:
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(
                user, field, " ".join(value.split()) if isinstance(value, str) and field == "display_name" else value
            )
    await db.commit()
    return MeOut.model_validate(auth_service.me(user))


@router.delete("/me", dependencies=[Depends(csrf_protect)])
async def delete_me(body: DeleteIn, request: Request, response: Response, db: DB, user: CurrentUser) -> dict[str, bool]:
    """Account deletion (SPEC §16): anonymise personal data, hide listings, end sessions.
    Loans/ratings stay for the counterparty's history, attributed to a deleted account."""
    from app.modules.loans.models import Loan

    if not verify_password(body.password, user.password_hash):
        raise AppError("INVALID_CREDENTIALS", 401)
    open_loan = await db.scalar(
        select(Loan.id).where(
            (Loan.owner_id == user.id) | (Loan.borrower_id == user.id), Loan.status.in_(("approved", "active"))
        )
    )
    if open_loan:
        raise AppError("ACCOUNT_HAS_OPEN_LOANS", 409)
    await db.execute(update(Listing).where(Listing.owner_id == user.id).values(status="removed"))
    user.email = f"deleted-{user.id}@deleted.qadr"
    user.display_name = "—"
    user.phone = None
    user.phone_verified_at = None
    user.telegram_id = None
    user.telegram_username = None
    user.avatar_url = None
    user.area = None
    user.is_active = False
    await auth_service.revoke_all(db, user.id)
    await db.commit()
    clear_session_cookies(response)
    _ = request.cookies.get(REFRESH_COOKIE)
    return {"ok": True}


@router.post("/me/telegram-prompt/dismiss", dependencies=[Depends(csrf_protect)])
async def dismiss_prompt(db: DB, user: CurrentUser) -> dict[str, bool]:
    user.telegram_prompt_dismissed_at = now_utc()
    await db.commit()
    return {"ok": True}


@router.get("/{user_id}")
async def get_user(user_id: uuid.UUID, db: DB) -> dict[str, object]:
    user = await db.get(User, user_id)
    if not user or not user.is_active or user.banned_at:
        raise not_found("USER")
    return (await public_users(db, [user]))[user.id]

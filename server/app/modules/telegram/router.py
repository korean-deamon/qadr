from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.deps import DB, AnyUser, CurrentUser, csrf_protect
from app.modules.telegram import service

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/link-token", dependencies=[Depends(csrf_protect)])
async def link_token(db: DB, user: AnyUser) -> dict[str, object]:
    _, url = await service.create_link_token(db, user)
    return {"url": url, "expires_in": settings.telegram_link_token_ttl_minutes * 60}


@router.get("/status")
async def status(user: AnyUser) -> dict[str, object]:
    return {
        "enabled": settings.telegram_enabled,
        "linked": user.telegram_id is not None,
        "username": user.telegram_username,
        "phone": user.phone if user.phone_verified_at else None,
        "notifications": user.telegram_notifications,
        "blocked": user.telegram_blocked_at is not None,
    }


@router.delete("/link", dependencies=[Depends(csrf_protect)])
async def unlink(db: DB, user: CurrentUser) -> dict[str, bool]:
    await service.unlink(db, user)
    return {"ok": True}

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, update

from app.core.deps import DB, CurrentUser, csrf_protect
from app.core.errors import not_found
from app.core.time import now_utc
from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    db: DB, user: CurrentUser, unread: bool = False, limit: int = Query(30, le=100), before: str | None = None
) -> dict[str, object]:
    q = select(Notification).where(Notification.user_id == user.id)
    if unread:
        q = q.where(Notification.read_at.is_(None))
    if before:
        q = q.where(Notification.created_at < before)
    rows = (await db.scalars(q.order_by(Notification.created_at.desc()).limit(limit))).all()
    unread_count = await db.scalar(
        select(func.count()).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    )
    return {"items": [NotificationOut.model_validate(r) for r in rows], "unread": unread_count or 0}


@router.post("/{notification_id}/read", dependencies=[Depends(csrf_protect)])
async def mark_read(notification_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, bool]:
    n = await db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise not_found("NOTIFICATION")
    if not n.read_at:
        n.read_at = now_utc()
        await db.commit()
    return {"ok": True}


@router.post("/read-all", dependencies=[Depends(csrf_protect)])
async def mark_all_read(db: DB, user: CurrentUser) -> dict[str, bool]:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=now_utc())
    )
    await db.commit()
    return {"ok": True}

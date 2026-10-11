import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select

from app.core import rate_limit as rl
from app.core.deps import DB, CurrentUser, Writer, csrf_protect
from app.core.errors import AppError, forbidden, not_found
from app.core.time import now_utc
from app.modules.auth.models import User
from app.modules.borrowing.models import BorrowRequest
from app.modules.listings.models import Listing
from app.modules.loans.models import Loan
from app.modules.messages import service
from app.modules.messages.models import Conversation, ConversationParticipant, Message
from app.modules.notifications.models import Notification

router = APIRouter(prefix="/conversations", tags=["messages"])
me_router = APIRouter(prefix="/me", tags=["messages"])


class StartIn(BaseModel):
    listing_id: uuid.UUID
    body: str = Field(min_length=1, max_length=2000)


class SendIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


def _msg(m: Message) -> dict[str, object]:
    return {"id": m.id, "kind": m.kind, "body": m.body, "sender_id": m.sender_id, "created_at": m.created_at}


async def _participant(
    db: DB, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> tuple[Conversation, ConversationParticipant]:
    conv = await db.get(Conversation, conversation_id)
    part = await db.get(ConversationParticipant, (conversation_id, user_id))
    if not conv or not part:
        raise not_found("CONVERSATION")  # never reveal conversations you are not in
    return conv, part


async def unread_counts(db: DB, user_id: uuid.UUID) -> dict[uuid.UUID, int]:
    rows = (
        await db.execute(
            select(Message.conversation_id, func.count())
            .join(
                ConversationParticipant,
                and_(
                    ConversationParticipant.conversation_id == Message.conversation_id,
                    ConversationParticipant.user_id == user_id,
                ),
            )
            .where(
                or_(Message.sender_id.is_(None), Message.sender_id != user_id),
                Message.kind == "text",
                or_(
                    ConversationParticipant.last_read_at.is_(None),
                    Message.created_at > ConversationParticipant.last_read_at,
                ),
            )
            .group_by(Message.conversation_id)
        )
    ).all()
    return {r[0]: int(r[1]) for r in rows}


@router.get("")
async def list_conversations(db: DB, user: CurrentUser) -> list[dict[str, object]]:
    parts = (
        await db.execute(
            select(Conversation, ConversationParticipant)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .where(
                ConversationParticipant.user_id == user.id,
                Conversation.last_message_at.is_not(None),
                or_(
                    ConversationParticipant.deleted_at.is_(None),
                    Conversation.last_message_at > ConversationParticipant.deleted_at,
                ),
            )
            .order_by(Conversation.last_message_at.desc())
        )
    ).all()
    convs = [p[0] for p in parts]
    if not convs:
        return []
    listings = {
        l.id: l for l in (await db.scalars(select(Listing).where(Listing.id.in_({c.listing_id for c in convs})))).all()
    }
    other_ids = {
        c.borrower_id if listings[c.listing_id].owner_id == user.id else listings[c.listing_id].owner_id for c in convs
    }
    others = {u.id: u for u in (await db.scalars(select(User).where(User.id.in_(other_ids)))).all()}
    last = {}
    for c in convs:
        last[c.id] = await db.scalar(
            select(Message).where(Message.conversation_id == c.id).order_by(Message.created_at.desc()).limit(1)
        )
    unread = await unread_counts(db, user.id)
    out = []
    for c in convs:
        listing = listings[c.listing_id]
        other = others.get(c.borrower_id if listing.owner_id == user.id else listing.owner_id)
        m = last[c.id]
        out.append(
            {
                "id": c.id,
                "listing": {
                    "id": listing.id,
                    "title": listing.title,
                    "image": listing.images[0].url if listing.images else None,
                },
                "with": {"id": other.id, "name": other.display_name, "area": other.area} if other else None,
                "role": "owner" if listing.owner_id == user.id else "borrower",
                "last_message": _msg(m) if m else None,
                "unread": unread.get(c.id, 0),
                "updated_at": c.last_message_at,
            }
        )
    return out


@router.post("", status_code=201, dependencies=[Depends(csrf_protect)])
async def start(body: StartIn, db: DB, user: Writer) -> dict[str, object]:
    await rl.hit(rl.MESSAGES, str(user.id))
    listing = await db.get(Listing, body.listing_id)
    if not listing or listing.status != "active":
        raise not_found("LISTING")
    if listing.owner_id == user.id:
        raise forbidden("CANNOT_MESSAGE_SELF")
    conv = await service.get_or_create(db, listing, user.id)
    await service.post(db, conv, user.id, body.body.strip())
    part = await db.get(ConversationParticipant, (conv.id, user.id))
    if part:
        part.deleted_at = None
        part.last_read_at = now_utc()
    await db.commit()
    return {"id": conv.id}


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, object]:
    conv, _ = await _participant(db, conversation_id, user.id)
    listing = await db.get(Listing, conv.listing_id)
    assert listing is not None
    is_owner = listing.owner_id == user.id
    other = await db.get(User, conv.borrower_id if is_owner else listing.owner_id)
    req = await db.scalar(
        select(BorrowRequest)
        .where(BorrowRequest.listing_id == listing.id, BorrowRequest.borrower_id == conv.borrower_id)
        .order_by(BorrowRequest.created_at.desc())
    )
    loan = None
    if req and req.status == "approved":
        loan = await db.scalar(select(Loan).where(Loan.request_id == req.id))
    phone_visible = bool(loan and loan.status in ("approved", "active") and other and other.phone_verified_at)
    return {
        "id": conv.id,
        "role": "owner" if is_owner else "borrower",
        "listing": {
            "id": listing.id,
            "title": listing.title,
            "image": listing.images[0].url if listing.images else None,
            "status": listing.status,
        },
        "with": {
            "id": other.id,
            "name": other.display_name,
            "area": other.area,
            "phone": other.phone if phone_visible else None,
        }
        if other
        else None,
        "request": {"id": req.id, "status": req.status, "start": req.start_date, "end": req.end_date} if req else None,
        "loan": {"id": loan.id, "status": loan.status} if loan else None,
    }


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: uuid.UUID,
    db: DB,
    user: CurrentUser,
    before: datetime | None = None,
    limit: int = Query(50, le=100),
) -> dict[str, object]:
    await _participant(db, conversation_id, user.id)
    q = select(Message).where(Message.conversation_id == conversation_id)
    if before:
        q = q.where(Message.created_at < before)
    rows = list((await db.scalars(q.order_by(Message.created_at.desc()).limit(limit + 1))).all())
    more = len(rows) > limit
    rows = rows[:limit]
    return {"items": [_msg(m) for m in reversed(rows)], "has_more": more}


@router.post("/{conversation_id}/messages", status_code=201, dependencies=[Depends(csrf_protect)])
async def send(conversation_id: uuid.UUID, body: SendIn, db: DB, user: Writer) -> dict[str, object]:
    await rl.hit(rl.MESSAGES, str(user.id))
    conv, part = await _participant(db, conversation_id, user.id)
    listing = await db.get(Listing, conv.listing_id)
    if not listing or listing.status == "removed":
        raise AppError("LISTING_REMOVED", 409)
    msg = await service.post(db, conv, user.id, body.body.strip())
    part.last_read_at = msg.created_at
    part.deleted_at = None
    await db.commit()
    return _msg(msg)


@router.post("/{conversation_id}/read", dependencies=[Depends(csrf_protect)])
async def mark_read(conversation_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, bool]:
    _, part = await _participant(db, conversation_id, user.id)
    part.last_read_at = now_utc()
    await db.commit()
    return {"ok": True}


@router.delete("/{conversation_id}", dependencies=[Depends(csrf_protect)])
async def hide(conversation_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, bool]:
    """Hides the conversation for the current user only (SPEC §12)."""
    _, part = await _participant(db, conversation_id, user.id)
    part.deleted_at = now_utc()
    part.last_read_at = now_utc()
    await db.commit()
    return {"ok": True}


@me_router.get("/counters")
async def counters(db: DB, user: CurrentUser) -> dict[str, int]:
    unread = await unread_counts(db, user.id)
    notif = (
        await db.scalar(select(func.count()).where(Notification.user_id == user.id, Notification.read_at.is_(None)))
        or 0
    )
    pending = (
        await db.scalar(
            select(func.count())
            .select_from(BorrowRequest)
            .join(Listing, Listing.id == BorrowRequest.listing_id)
            .where(Listing.owner_id == user.id, BorrowRequest.status == "pending")
        )
        or 0
    )
    return {
        "unread_messages": sum(unread.values()),
        "unread_notifications": int(notif),
        "pending_requests": int(pending),
    }

"""Conversations: one per (listing, borrower); participants = borrower + owner."""

import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import now_utc
from app.modules.listings.models import Listing
from app.modules.messages.models import Conversation, ConversationParticipant, Message
from app.realtime import hub


async def get_or_create(db: AsyncSession, listing: Listing, borrower_id: uuid.UUID) -> Conversation:
    conv = await db.scalar(
        select(Conversation).where(Conversation.listing_id == listing.id, Conversation.borrower_id == borrower_id)
    )
    if conv:
        return conv
    stmt = (
        insert(Conversation)
        .values(id=uuid.uuid4(), listing_id=listing.id, borrower_id=borrower_id)
        .on_conflict_do_nothing(constraint="uq_conversations_listing_borrower")
        .returning(Conversation.id)
    )
    new_id = await db.scalar(stmt)
    if new_id is None:  # created concurrently
        conv = await db.scalar(
            select(Conversation).where(Conversation.listing_id == listing.id, Conversation.borrower_id == borrower_id)
        )
        assert conv is not None
        return conv
    for uid in {borrower_id, listing.owner_id}:
        db.add(ConversationParticipant(conversation_id=new_id, user_id=uid))
    await db.flush()
    conv = await db.get(Conversation, new_id)
    assert conv is not None
    return conv


async def participants(db: AsyncSession, conversation_id: uuid.UUID) -> list[uuid.UUID]:
    return list(
        (
            await db.scalars(
                select(ConversationParticipant.user_id).where(
                    ConversationParticipant.conversation_id == conversation_id
                )
            )
        ).all()
    )


async def post(
    db: AsyncSession, conv: Conversation, sender_id: uuid.UUID | None, body: str, kind: str = "text"
) -> Message:
    """Persist a message (or a system event) and fan it out after commit."""
    msg = Message(
        id=uuid.uuid4(), conversation_id=conv.id, sender_id=sender_id, kind=kind, body=body, created_at=now_utc()
    )
    db.add(msg)
    conv.last_message_at = msg.created_at
    for uid in await participants(db, conv.id):
        hub.defer(
            db,
            uid,
            "message.new",
            {
                "conversation_id": str(conv.id),
                "message": {
                    "id": str(msg.id),
                    "kind": kind,
                    "body": body,
                    "sender_id": str(sender_id) if sender_id else None,
                    "created_at": msg.created_at.isoformat(),
                },
            },
        )
    return msg


async def post_event(db: AsyncSession, listing: Listing, borrower_id: uuid.UUID, event: str) -> None:
    conv = await get_or_create(db, listing, borrower_id)
    await post(db, conv, None, event, kind="event")

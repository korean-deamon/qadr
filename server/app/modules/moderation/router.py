"""User-facing reports (SPEC §10 trust): incl. `not_returned` with high priority."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core import rate_limit as rl
from app.core.deps import DB, CurrentUser, csrf_protect
from app.core.errors import AppError, conflict, forbidden, not_found
from app.core.time import today_tashkent
from app.modules.auth.models import User
from app.modules.listings.models import Listing
from app.modules.loans.models import Loan
from app.modules.messages.models import Conversation, ConversationParticipant, Message
from app.modules.moderation.models import Report

router = APIRouter(prefix="/reports", tags=["moderation"])
Reason = Literal["not_returned", "damaged", "no_show", "fraud", "inappropriate", "harassment", "spam", "other"]


class ReportIn(BaseModel):
    target_type: Literal["user", "listing", "message"]
    target_id: uuid.UUID
    reason: Reason
    description: str | None = Field(default=None, max_length=2000)
    loan_id: uuid.UUID | None = None


@router.post("", status_code=201, dependencies=[Depends(csrf_protect)])
async def create_report(body: ReportIn, db: DB, user: CurrentUser) -> dict[str, object]:
    await rl.hit(rl.REPORTS, str(user.id))
    target_user_id: uuid.UUID | None = None
    listing_id: uuid.UUID | None = None
    loan: Loan | None = None
    if body.target_type == "user":
        target = await db.get(User, body.target_id)
        if not target:
            raise not_found("USER")
        target_user_id = target.id
    elif body.target_type == "listing":
        listing = await db.get(Listing, body.target_id)
        if not listing:
            raise not_found("LISTING")
        listing_id, target_user_id = listing.id, listing.owner_id
    else:
        msg = await db.get(Message, body.target_id)
        part = await db.get(ConversationParticipant, (msg.conversation_id, user.id)) if msg else None
        if not msg or not part:
            raise not_found("MESSAGE")
        conv = await db.get(Conversation, msg.conversation_id)
        listing_id, target_user_id = (conv.listing_id if conv else None), msg.sender_id
    if target_user_id == user.id:
        raise forbidden("CANNOT_REPORT_SELF")
    if body.loan_id:
        loan = await db.get(Loan, body.loan_id)
        if not loan or user.id not in (loan.owner_id, loan.borrower_id):
            raise not_found("LOAN")
        listing_id = listing_id or loan.listing_id
    if body.reason == "not_returned":
        # only the owner of an active loan, from the day after end_date (§10.1)
        if not loan or loan.owner_id != user.id:
            raise AppError("NOT_RETURNED_NEEDS_LOAN", 422)
        if loan.status != "active" or today_tashkent() <= loan.end_date:
            raise conflict("NOT_RETURNED_TOO_EARLY")
        target_user_id = loan.borrower_id
    report = Report(
        id=uuid.uuid4(),
        reporter_id=user.id,
        target_type=body.target_type,
        target_id=body.target_id,
        target_user_id=target_user_id,
        listing_id=listing_id,
        loan_id=loan.id if loan else None,
        reason=body.reason,
        description=(body.description or "").strip() or None,
        status="open",
        priority="high" if body.reason == "not_returned" else "normal",
    )
    db.add(report)
    await db.commit()
    return {"id": report.id, "status": report.status, "priority": report.priority}

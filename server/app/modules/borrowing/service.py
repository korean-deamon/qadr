"""Borrow requests and loans (SPEC §10, §10.1). Every transition is explicit and
validated; booking validity is decided only here, inside PostgreSQL transactions."""

import uuid
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, conflict, forbidden, not_found
from app.core.time import now_utc, today_tashkent
from app.modules.auth.models import User
from app.modules.borrowing.models import BorrowRequest
from app.modules.listings.models import Listing
from app.modules.loans.models import Loan
from app.modules.messages import service as messages
from app.modules.notifications.service import notify

MAX_AHEAD_DAYS = 90
REQUEST_TTL = timedelta(hours=48)


def overlaps(a_start: date, a_end: date, b_start: date, b_end: date) -> bool:
    """Inclusive overlap: existing.start <= requested.end AND existing.end >= requested.start."""
    return a_start <= b_end and a_end >= b_start


def _payload(listing: Listing, actor: User, start: date, end: date, **extra: Any) -> dict[str, Any]:
    return {
        "listing_id": str(listing.id),
        "item": listing.title,
        "actor": actor.display_name.split(" ")[0],
        "actor_id": str(actor.id),
        "start": start.isoformat(),
        "end": end.isoformat(),
        **extra,
    }


def validate_dates(listing: Listing, start: date, end: date) -> None:
    today = today_tashkent()
    if start < today:
        raise AppError("DATES_IN_PAST", 422)
    if end < start:
        raise AppError("DATES_INVALID", 422)
    if start > today + timedelta(days=MAX_AHEAD_DAYS):
        raise AppError("DATES_TOO_FAR", 422, max_days_ahead=MAX_AHEAD_DAYS)
    if (end - start).days + 1 > listing.max_days:
        raise AppError("DATES_TOO_LONG", 422, max_days=listing.max_days)


async def _has_loan_conflict(db: AsyncSession, listing_id: uuid.UUID, start: date, end: date) -> bool:
    return bool(
        await db.scalar(
            select(Loan.id).where(
                Loan.listing_id == listing_id,
                Loan.status.in_(("approved", "active")),
                Loan.start_date <= end,
                Loan.end_date >= start,
            )
        )
    )


async def create_request(
    db: AsyncSession,
    borrower: User,
    listing_id: uuid.UUID,
    start: date,
    end: date,
    message: str | None,
    accept_terms: bool,
) -> BorrowRequest:
    listing = await db.get(Listing, listing_id, with_for_update=True)
    if not listing or listing.status != "active":
        raise not_found("LISTING")
    owner = await db.get(User, listing.owner_id)
    if not owner or owner.banned_at or not owner.is_active:
        raise not_found("LISTING")
    if listing.owner_id == borrower.id:
        raise forbidden("CANNOT_BORROW_OWN")  # rule 1
    if not accept_terms:
        raise AppError("TERMS_NOT_ACCEPTED", 422)  # rule 3
    validate_dates(listing, start, end)  # rule 4
    if await _has_loan_conflict(db, listing.id, start, end):
        raise conflict("DATES_UNAVAILABLE")  # rule 5
    dup = await db.scalar(
        select(BorrowRequest.id).where(
            BorrowRequest.listing_id == listing.id,
            BorrowRequest.borrower_id == borrower.id,
            BorrowRequest.status == "pending",
        )
    )
    if dup:
        raise conflict("REQUEST_ALREADY_PENDING")
    req = BorrowRequest(
        id=uuid.uuid4(),
        listing_id=listing.id,
        borrower_id=borrower.id,
        start_date=start,
        end_date=end,
        message=(message or "").strip() or None,
        terms_accepted_at=now_utc(),
        status="pending",
    )
    db.add(req)
    conv = await messages.get_or_create(db, listing, borrower.id)
    if req.message:
        await messages.post(db, conv, borrower.id, req.message)
    await messages.post(db, conv, None, "requested", kind="event")
    await notify(
        db,
        listing.owner_id,
        "request_received",
        _payload(listing, borrower, start, end, request_id=str(req.id)),
        dedupe_key=f"request_received:{req.id}",
    )
    await db.commit()
    return req


async def _load_request(db: AsyncSession, request_id: uuid.UUID) -> tuple[BorrowRequest, Listing]:
    """Lock order is always listing → requests, so concurrent transitions never deadlock."""
    listing_id = await db.scalar(select(BorrowRequest.listing_id).where(BorrowRequest.id == request_id))
    if not listing_id:
        raise not_found("REQUEST")
    listing = await db.get(Listing, listing_id, with_for_update=True)
    req = await db.get(BorrowRequest, request_id, with_for_update=True, populate_existing=True)
    assert listing is not None and req is not None
    return req, listing


async def approve(db: AsyncSession, owner: User, request_id: uuid.UUID) -> Loan:
    """Approval creates the loan atomically and rejects overlapping pending requests (rule 6)."""
    req, listing = await _load_request(db, request_id)
    if listing.owner_id != owner.id:
        raise forbidden("NOT_OWNER")  # rule 2
    if req.status != "pending":
        raise conflict("INVALID_TRANSITION")  # rule 10
    if req.start_date < today_tashkent():
        req.status = "expired"
        await db.commit()
        raise conflict("REQUEST_EXPIRED")
    if await _has_loan_conflict(db, listing.id, req.start_date, req.end_date):
        raise conflict("DATES_UNAVAILABLE")
    loan = Loan(
        id=uuid.uuid4(),
        request_id=req.id,
        listing_id=listing.id,
        borrower_id=req.borrower_id,
        owner_id=listing.owner_id,
        start_date=req.start_date,
        end_date=req.end_date,
        status="approved",
    )
    db.add(loan)
    try:
        await db.flush()  # the exclusion constraint is the final authority on races
    except IntegrityError as exc:
        await db.rollback()
        raise conflict("DATES_UNAVAILABLE") from exc
    req.status = "approved"
    req.decided_at = now_utc()
    borrower = await db.get(User, req.borrower_id)
    assert borrower is not None
    others = (
        await db.scalars(
            select(BorrowRequest)
            .where(
                BorrowRequest.listing_id == listing.id,
                BorrowRequest.status == "pending",
                BorrowRequest.id != req.id,
                BorrowRequest.start_date <= req.end_date,
                BorrowRequest.end_date >= req.start_date,
            )
            .with_for_update()
        )
    ).all()
    for other in others:
        other.status = "rejected"
        other.decided_at = now_utc()
        await notify(
            db,
            other.borrower_id,
            "request_rejected",
            _payload(listing, owner, other.start_date, other.end_date, request_id=str(other.id), reason="dates_taken"),
            dedupe_key=f"request_rejected:{other.id}",
        )
        await messages.post_event(db, listing, other.borrower_id, "rejected")
    await messages.post_event(db, listing, req.borrower_id, "approved")
    await notify(
        db,
        req.borrower_id,
        "request_approved",
        _payload(listing, owner, req.start_date, req.end_date, request_id=str(req.id), loan_id=str(loan.id)),
        dedupe_key=f"request_approved:{req.id}",
    )
    await db.commit()
    return loan


async def reject(db: AsyncSession, owner: User, request_id: uuid.UUID) -> BorrowRequest:
    req, listing = await _load_request(db, request_id)
    if listing.owner_id != owner.id:
        raise forbidden("NOT_OWNER")
    if req.status != "pending":
        raise conflict("INVALID_TRANSITION")
    req.status = "rejected"
    req.decided_at = now_utc()
    await messages.post_event(db, listing, req.borrower_id, "rejected")
    await notify(
        db,
        req.borrower_id,
        "request_rejected",
        _payload(listing, owner, req.start_date, req.end_date, request_id=str(req.id)),
        dedupe_key=f"request_rejected:{req.id}",
    )
    await db.commit()
    return req


async def cancel_request(db: AsyncSession, borrower: User, request_id: uuid.UUID) -> BorrowRequest:
    req, listing = await _load_request(db, request_id)
    if req.borrower_id != borrower.id:
        raise forbidden("NOT_BORROWER")  # borrower can cancel own pending request (rule 2)
    if req.status != "pending":
        raise conflict("INVALID_TRANSITION")
    req.status = "cancelled"
    req.decided_at = now_utc()
    await messages.post_event(db, listing, req.borrower_id, "cancelled")
    await notify(
        db,
        listing.owner_id,
        "request_cancelled",
        _payload(listing, borrower, req.start_date, req.end_date, request_id=str(req.id)),
        dedupe_key=f"request_cancelled:{req.id}",
    )
    await db.commit()
    return req


async def expire_stale(db: AsyncSession) -> int:
    """Expiry policy (§10.1): pending > 48 h, or start_date reached. Never touches loans."""
    now = now_utc()
    today = today_tashkent()
    rows = (
        await db.scalars(
            select(BorrowRequest)
            .where(BorrowRequest.status == "pending")
            .where((BorrowRequest.created_at < now - REQUEST_TTL) | (BorrowRequest.start_date <= today))
            .with_for_update(skip_locked=True)
        )
    ).all()
    for req in rows:
        req.status = "expired"
        req.decided_at = now
        listing = await db.get(Listing, req.listing_id)
        borrower = await db.get(User, req.borrower_id)
        if listing and borrower:
            payload = _payload(listing, borrower, req.start_date, req.end_date, request_id=str(req.id))
            await notify(db, req.borrower_id, "request_expired", payload, dedupe_key=f"request_expired:{req.id}:b")
            await notify(db, listing.owner_id, "request_expired", payload, dedupe_key=f"request_expired:{req.id}:o")
    await db.commit()
    return len(rows)


# ---------------------------------------------------------------- loans
async def _load_loan(db: AsyncSession, loan_id: uuid.UUID) -> tuple[Loan, Listing]:
    loan = await db.get(Loan, loan_id, with_for_update=True)
    if not loan:
        raise not_found("LOAN")
    listing = await db.get(Listing, loan.listing_id)
    assert listing is not None
    return loan, listing


def _ensure_party(loan: Loan, user: User) -> None:
    if user.id not in (loan.owner_id, loan.borrower_id):
        raise not_found("LOAN")


async def pickup(db: AsyncSession, user: User, loan_id: uuid.UUID) -> Loan:
    loan, listing = await _load_loan(db, loan_id)
    _ensure_party(loan, user)
    if user.id != loan.owner_id:
        raise forbidden("NOT_OWNER")  # rule 7: the owner hands the item over
    if loan.status != "approved":
        raise conflict("INVALID_TRANSITION")
    if today_tashkent() < loan.start_date - timedelta(days=1):
        raise conflict("PICKUP_TOO_EARLY")
    loan.status = "active"
    loan.picked_up_at = now_utc()
    await messages.post_event(db, listing, loan.borrower_id, "pickedUp")
    await notify(
        db,
        loan.borrower_id,
        "loan_picked_up",
        {
            **_payload(listing, user, loan.start_date, loan.end_date),
            "loan_id": str(loan.id),
            "due": loan.end_date.isoformat(),
        },
        dedupe_key=f"loan_picked_up:{loan.id}",
    )
    from app.realtime import hub

    hub.defer(db, None, "listing.updated", {"id": str(listing.id)})
    await db.commit()
    return loan


async def mark_returned(db: AsyncSession, user: User, loan_id: uuid.UUID) -> Loan:
    loan, listing = await _load_loan(db, loan_id)
    _ensure_party(loan, user)
    if loan.status != "active":
        raise conflict("INVALID_TRANSITION")
    if user.id == loan.borrower_id:
        if loan.borrower_returned_at:
            raise conflict("INVALID_TRANSITION")
        loan.borrower_returned_at = now_utc()
        await notify(
            db,
            loan.owner_id,
            "loan_return_claimed",
            {**_payload(listing, user, loan.start_date, loan.end_date), "loan_id": str(loan.id)},
            dedupe_key=f"loan_return_claimed:{loan.id}",
        )
        await db.commit()
        return loan
    loan.status = "returned"  # the owner's confirmation is final (§10.1)
    loan.returned_at = now_utc()
    await messages.post_event(db, listing, loan.borrower_id, "returned")
    borrower = await db.get(User, loan.borrower_id)
    assert borrower is not None
    base = _payload(listing, user, loan.start_date, loan.end_date)
    await notify(
        db,
        loan.borrower_id,
        "loan_returned",
        {**base, "loan_id": str(loan.id)},
        dedupe_key=f"loan_returned:{loan.id}:b",
    )
    await notify(
        db,
        loan.owner_id,
        "loan_returned",
        {**base, "actor": borrower.display_name.split(" ")[0], "loan_id": str(loan.id)},
        dedupe_key=f"loan_returned:{loan.id}:o",
    )
    from app.realtime import hub

    hub.defer(db, None, "listing.updated", {"id": str(listing.id)})
    await db.commit()
    return loan


async def cancel_loan(db: AsyncSession, user: User, loan_id: uuid.UUID) -> Loan:
    loan, listing = await _load_loan(db, loan_id)
    _ensure_party(loan, user)
    if loan.status != "approved":
        raise conflict("INVALID_TRANSITION")  # only before pickup
    loan.status = "cancelled"
    loan.cancelled_at = now_utc()
    other = loan.borrower_id if user.id == loan.owner_id else loan.owner_id
    await messages.post_event(db, listing, loan.borrower_id, "cancelled")
    await notify(
        db,
        other,
        "loan_cancelled",
        {**_payload(listing, user, loan.start_date, loan.end_date), "loan_id": str(loan.id)},
        dedupe_key=f"loan_cancelled:{loan.id}",
    )
    await db.commit()
    return loan


async def loan_view(db: AsyncSession, loan: Loan, viewer: User) -> dict[str, Any]:
    listing = await db.get(Listing, loan.listing_id)
    other_id = loan.borrower_id if viewer.id == loan.owner_id else loan.owner_id
    other = await db.get(User, other_id)
    assert listing is not None and other is not None
    # rule 13: phone visible only for approved/active loans, only verified phones
    phone = other.phone if loan.status in ("approved", "active") and other.phone_verified_at else None
    today = today_tashkent()
    return {
        "id": loan.id,
        "status": loan.status,
        "role": "owner" if viewer.id == loan.owner_id else "borrower",
        "start": loan.start_date,
        "end": loan.end_date,
        "picked_up_at": loan.picked_up_at,
        "returned_at": loan.returned_at,
        "borrower_returned_at": loan.borrower_returned_at,
        "overdue": loan.status == "active" and loan.end_date < today,
        "can_report_not_returned": viewer.id == loan.owner_id and loan.status == "active" and today > loan.end_date,
        "listing": {
            "id": listing.id,
            "title": listing.title,
            "image": listing.images[0].url if listing.images else None,
            "area": listing.location_area,
        },
        "with": {"id": other.id, "name": other.display_name, "phone": phone},
    }

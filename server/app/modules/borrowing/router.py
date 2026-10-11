import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.deps import DB, CurrentUser, Writer, csrf_protect
from app.core.errors import not_found
from app.modules.auth.models import User
from app.modules.borrowing import service
from app.modules.borrowing.models import BorrowRequest
from app.modules.listings.models import Listing

router = APIRouter(tags=["borrowing"])


class RequestIn(BaseModel):
    start_date: date
    end_date: date
    message: str | None = Field(default=None, max_length=1000)
    accept_terms: bool


async def _view(db: DB, req: BorrowRequest, viewer: User) -> dict[str, object]:
    listing = await db.get(Listing, req.listing_id)
    borrower = await db.get(User, req.borrower_id)
    owner = await db.get(User, listing.owner_id) if listing else None
    assert listing and borrower and owner
    other = owner if viewer.id == borrower.id else borrower
    return {
        "id": req.id,
        "status": req.status,
        "role": "borrower" if viewer.id == borrower.id else "owner",
        "start": req.start_date,
        "end": req.end_date,
        "message": req.message,
        "created_at": req.created_at,
        "listing": {
            "id": listing.id,
            "title": listing.title,
            "image": listing.images[0].url if listing.images else None,
        },
        "with": {"id": other.id, "name": other.display_name},
    }


@router.post("/listings/{listing_id}/requests", status_code=201, dependencies=[Depends(csrf_protect)])
async def create(listing_id: uuid.UUID, body: RequestIn, db: DB, user: Writer) -> dict[str, object]:
    req = await service.create_request(
        db, user, listing_id, body.start_date, body.end_date, body.message, body.accept_terms
    )
    return await _view(db, req, user)


@router.get("/requests/incoming")
async def incoming(
    db: DB,
    user: CurrentUser,
    status: Literal["pending", "approved", "rejected", "cancelled", "expired", "all"] = "pending",
) -> list[dict[str, object]]:
    q = select(BorrowRequest).join(Listing, Listing.id == BorrowRequest.listing_id).where(Listing.owner_id == user.id)
    if status != "all":
        q = q.where(BorrowRequest.status == status)
    rows = (await db.scalars(q.order_by(BorrowRequest.created_at.desc()).limit(100))).all()
    return [await _view(db, r, user) for r in rows]


@router.get("/requests/outgoing")
async def outgoing(
    db: DB, user: CurrentUser, status: Literal["pending", "approved", "rejected", "cancelled", "expired", "all"] = "all"
) -> list[dict[str, object]]:
    q = select(BorrowRequest).where(BorrowRequest.borrower_id == user.id)
    if status != "all":
        q = q.where(BorrowRequest.status == status)
    rows = (await db.scalars(q.order_by(BorrowRequest.created_at.desc()).limit(100))).all()
    return [await _view(db, r, user) for r in rows]


@router.get("/requests/{request_id}")
async def get_request(request_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, object]:
    req = await db.get(BorrowRequest, request_id)
    listing = await db.get(Listing, req.listing_id) if req else None
    if not req or not listing or user.id not in (req.borrower_id, listing.owner_id):
        raise not_found("REQUEST")
    return await _view(db, req, user)


@router.post("/requests/{request_id}/approve", dependencies=[Depends(csrf_protect)])
async def approve(request_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, object]:
    loan = await service.approve(db, user, request_id)
    return {"loan_id": loan.id, "status": "approved"}


@router.post("/requests/{request_id}/reject", dependencies=[Depends(csrf_protect)])
async def reject(request_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, str]:
    await service.reject(db, user, request_id)
    return {"status": "rejected"}


@router.post("/requests/{request_id}/cancel", dependencies=[Depends(csrf_protect)])
async def cancel(request_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, str]:
    await service.cancel_request(db, user, request_id)
    return {"status": "cancelled"}

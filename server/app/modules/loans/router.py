import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select

from app.core.deps import DB, CurrentUser, csrf_protect
from app.core.errors import not_found
from app.modules.borrowing import service
from app.modules.loans.models import Loan

router = APIRouter(prefix="/loans", tags=["loans"])


@router.get("")
async def list_loans(
    db: DB,
    user: CurrentUser,
    role: Literal["owner", "borrower", "any"] = "any",
    status: Literal["open", "approved", "active", "returned", "cancelled", "all"] = "open",
) -> list[dict[str, object]]:
    q = select(Loan)
    if role == "owner":
        q = q.where(Loan.owner_id == user.id)
    elif role == "borrower":
        q = q.where(Loan.borrower_id == user.id)
    else:
        q = q.where(or_(Loan.owner_id == user.id, Loan.borrower_id == user.id))
    if status == "open":
        q = q.where(Loan.status.in_(("approved", "active")))
    elif status != "all":
        q = q.where(Loan.status == status)
    rows = (await db.scalars(q.order_by(Loan.start_date.asc()).limit(200))).all()
    return [await service.loan_view(db, loan, user) for loan in rows]


@router.get("/{loan_id}")
async def get_loan(loan_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, object]:
    loan = await db.get(Loan, loan_id)
    if not loan or user.id not in (loan.owner_id, loan.borrower_id):
        raise not_found("LOAN")
    from app.modules.ratings.models import Rating

    view = await service.loan_view(db, loan, user)
    view["my_rating"] = await db.scalar(
        select(Rating.score).where(Rating.loan_id == loan.id, Rating.rater_id == user.id)
    )
    return view


@router.post("/{loan_id}/pickup", dependencies=[Depends(csrf_protect)])
async def pickup(loan_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, object]:
    loan = await service.pickup(db, user, loan_id)
    return await service.loan_view(db, loan, user)


@router.post("/{loan_id}/return", dependencies=[Depends(csrf_protect)])
async def return_(loan_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, object]:
    loan = await service.mark_returned(db, user, loan_id)
    return await service.loan_view(db, loan, user)


@router.post("/{loan_id}/cancel", dependencies=[Depends(csrf_protect)])
async def cancel(loan_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, object]:
    loan = await service.cancel_loan(db, user, loan_id)
    return await service.loan_view(db, loan, user)

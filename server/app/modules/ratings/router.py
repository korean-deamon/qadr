import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.deps import DB, CurrentUser, csrf_protect
from app.core.errors import conflict, not_found
from app.core.time import now_utc
from app.modules.listings.models import Listing
from app.modules.loans.models import Loan
from app.modules.notifications.service import notify
from app.modules.ratings.models import Rating

router = APIRouter(tags=["ratings"])
RATING_WINDOW = timedelta(days=14)


class RatingIn(BaseModel):
    score: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


@router.post("/loans/{loan_id}/rating", status_code=201, dependencies=[Depends(csrf_protect)])
async def rate(loan_id: uuid.UUID, body: RatingIn, db: DB, user: CurrentUser) -> dict[str, object]:
    loan = await db.get(Loan, loan_id)
    if not loan or user.id not in (loan.owner_id, loan.borrower_id):
        raise not_found("LOAN")
    if loan.status != "returned" or not loan.returned_at:
        raise conflict("LOAN_NOT_RETURNED")
    if now_utc() - loan.returned_at > RATING_WINDOW:
        raise conflict("RATING_WINDOW_CLOSED")
    ratee = loan.borrower_id if user.id == loan.owner_id else loan.owner_id
    rating = Rating(
        id=uuid.uuid4(),
        loan_id=loan.id,
        rater_id=user.id,
        ratee_id=ratee,
        score=body.score,
        comment=(body.comment or "").strip() or None,
    )
    db.add(rating)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise conflict("ALREADY_RATED") from exc
    listing = await db.get(Listing, loan.listing_id)
    await notify(
        db,
        ratee,
        "rating_received",
        {
            "actor": user.display_name.split(" ")[0],
            "score": body.score,
            "item": listing.title if listing else "",
            "loan_id": str(loan.id),
        },
        dedupe_key=f"rating:{rating.id}",
    )
    await db.commit()
    return {"id": rating.id, "score": rating.score}


@router.get("/users/{user_id}/ratings")
async def user_ratings(user_id: uuid.UUID, db: DB) -> list[dict[str, object]]:
    from app.modules.auth.models import User

    rows = (
        await db.execute(
            select(Rating, User.display_name)
            .join(User, User.id == Rating.rater_id)
            .where(Rating.ratee_id == user_id)
            .order_by(Rating.created_at.desc())
            .limit(30)
        )
    ).all()
    return [
        {"score": r[0].score, "comment": r[0].comment, "from": r[1].split(" ")[0], "created_at": r[0].created_at}
        for r in rows
    ]

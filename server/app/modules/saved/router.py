import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from app.core.deps import DB, CurrentUser, csrf_protect
from app.core.errors import not_found
from app.modules.auth.models import User
from app.modules.listings import service
from app.modules.listings.models import Listing
from app.modules.ratings.models import Rating
from app.modules.saved.models import SavedItem

router = APIRouter(tags=["saved"])


@router.get("/saved")
async def list_saved(db: DB, user: CurrentUser) -> list[dict[str, object]]:
    rows = (
        await db.execute(
            select(Listing, SavedItem.created_at)
            .join(SavedItem, SavedItem.listing_id == Listing.id)
            .where(SavedItem.user_id == user.id, *service.visible_listing_filter())
            .order_by(SavedItem.created_at.desc())
        )
    ).all()
    listings = [r[0] for r in rows]
    owners = {
        u.id: u for u in (await db.scalars(select(User).where(User.id.in_({l.owner_id for l in listings})))).all()
    }
    from sqlalchemy import func

    ratings: dict[uuid.UUID, float] = dict(
        (
            await db.execute(
                select(Rating.ratee_id, func.avg(Rating.score))
                .where(Rating.ratee_id.in_(owners.keys()))
                .group_by(Rating.ratee_id)
            )
        ).all()
    )
    return [
        service.card(
            l,
            owners.get(l.owner_id),
            rating=float(ratings[l.owner_id]) if l.owner_id in ratings else None,
            distance=None,
            is_saved=True,
        )
        for l in listings
    ]


@router.post("/listings/{listing_id}/save", dependencies=[Depends(csrf_protect)])
async def save(listing_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, bool]:
    listing = await db.get(Listing, listing_id)
    if not listing or listing.status != "active":
        raise not_found("LISTING")
    await db.execute(insert(SavedItem).values(user_id=user.id, listing_id=listing_id).on_conflict_do_nothing())
    await db.commit()
    return {"saved": True}


@router.delete("/listings/{listing_id}/save", dependencies=[Depends(csrf_protect)])
async def unsave(listing_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, bool]:
    await db.execute(delete(SavedItem).where(SavedItem.user_id == user.id, SavedItem.listing_id == listing_id))
    await db.commit()
    return {"saved": False}

"""Listing search, visibility rules and serialisation (SPEC §10 rule 11, §12)."""

import uuid
from datetime import date
from typing import Any

from sqlalchemy import Float, and_, case, cast, exists, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.core.time import today_tashkent
from app.modules.auth.models import User
from app.modules.categories.models import Category
from app.modules.listings.models import Listing
from app.modules.loans.models import Loan
from app.modules.ratings.models import Rating
from app.modules.saved.models import SavedItem

APOSTROPHES = "ʻʼ'‘’`"


def visible_listing_filter() -> list[ColumnElement[bool]]:
    """Public visibility: active listing, active non-banned owner, no item currently on loan."""
    on_loan = exists().where(Loan.listing_id == Listing.id, Loan.status == "active")
    owner_ok = exists().where(User.id == Listing.owner_id, User.is_active.is_(True), User.banned_at.is_(None))
    return [Listing.status == "active", owner_ok, ~on_loan]


def distance_expr(lat: float, lng: float) -> ColumnElement[float]:
    """Great-circle distance in km (haversine) to the listing's private coordinates."""
    rlat, rlng = func.radians(Listing.latitude), func.radians(Listing.longitude)
    qlat, qlng = func.radians(literal(lat)), func.radians(literal(lng))
    a = func.pow(func.sin((rlat - qlat) / 2), 2) + func.cos(qlat) * func.cos(rlat) * func.pow(
        func.sin((rlng - qlng) / 2), 2
    )
    return cast(6371.0 * 2 * func.asin(func.sqrt(a)), Float)


def _norm(col: Any) -> ColumnElement[str]:
    return func.lower(func.translate(col, APOSTROPHES, ""))


def text_filter(q: str) -> ColumnElement[bool]:
    needle = q.lower()
    for ch in APOSTROPHES:
        needle = needle.replace(ch, "")
    doc = Listing.title + " " + Listing.description + " " + Listing.location_area
    fts = func.to_tsvector("simple", doc).op("@@")(func.plainto_tsquery("simple", q))
    return or_(fts, _norm(doc).contains(needle))


async def search(
    db: AsyncSession,
    *,
    viewer_id: uuid.UUID | None,
    q: str | None = None,
    category: str | None = None,
    area: str | None = None,
    conditions: list[str] | None = None,
    min_days: int | None = None,
    lat: float | None = None,
    lng: float | None = None,
    km: float | None = None,
    available_from: date | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 24,
    owner_id: uuid.UUID | None = None,
    exclude_id: uuid.UUID | None = None,
) -> tuple[list[dict[str, Any]], int]:
    where: list[ColumnElement[bool]] = [*visible_listing_filter()]
    if q:
        where.append(text_filter(q))
    if category:
        where.append(Listing.category_id == select(Category.id).where(Category.slug == category).scalar_subquery())
    if area:
        where.append(_norm(Listing.location_area).contains(area.lower()))
    if conditions:
        where.append(Listing.condition.in_(conditions))
    if min_days:
        where.append(Listing.max_days >= min_days)
    if owner_id:
        where.append(Listing.owner_id == owner_id)
    if exclude_id:
        where.append(Listing.id != exclude_id)
    if available_from:
        week_end = available_from.toordinal() + 6
        where.append(
            ~exists().where(
                Loan.listing_id == Listing.id,
                Loan.status.in_(("approved", "active")),
                Loan.start_date <= date.fromordinal(week_end),
                Loan.end_date >= available_from,
            )
        )
    has_loc = lat is not None and lng is not None
    dist = distance_expr(lat, lng) if has_loc else None  # type: ignore[arg-type]
    if dist is not None and km:
        where.append(and_(Listing.latitude.is_not(None), dist <= km))

    owner_rating = select(func.avg(Rating.score)).where(Rating.ratee_id == Listing.owner_id).scalar_subquery()
    total = await db.scalar(select(func.count()).select_from(Listing).where(*where)) or 0

    cols: list[Any] = [Listing, owner_rating.label("owner_rating")]
    if dist is not None:
        cols.append(dist.label("distance"))
    stmt = select(*cols).where(*where)
    if sort == "nearest" and dist is not None:
        stmt = stmt.order_by(dist.asc().nulls_last(), Listing.created_at.desc())
    elif sort == "rating":
        stmt = stmt.order_by(owner_rating.desc().nulls_last(), Listing.created_at.desc())
    else:
        stmt = stmt.order_by(Listing.created_at.desc())
    rows = (await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))).all()

    listings = [r[0] for r in rows]
    owners = {
        u.id: u for u in (await db.scalars(select(User).where(User.id.in_({l.owner_id for l in listings})))).all()
    }
    saved = await saved_ids(db, viewer_id, [l.id for l in listings])
    items = []
    for r in rows:
        listing: Listing = r[0]
        items.append(
            card(
                listing,
                owners.get(listing.owner_id),
                rating=float(r[1]) if r[1] is not None else None,
                distance=float(r[2]) if dist is not None and r[2] is not None else None,
                is_saved=listing.id in saved,
            )
        )
    return items, int(total)


async def saved_ids(db: AsyncSession, viewer_id: uuid.UUID | None, ids: list[uuid.UUID]) -> set[uuid.UUID]:
    if not viewer_id or not ids:
        return set()
    return set(
        (
            await db.scalars(
                select(SavedItem.listing_id).where(SavedItem.user_id == viewer_id, SavedItem.listing_id.in_(ids))
            )
        ).all()
    )


def round_km(km: float | None) -> float | None:
    if km is None:
        return None
    return round(km, 1) if km < 10 else float(round(km))


def image_out(img: Any) -> dict[str, Any]:
    return {"id": img.id, "url": img.url, "width": img.width, "height": img.height}


def card(
    listing: Listing, owner: User | None, *, rating: float | None, distance: float | None, is_saved: bool
) -> dict[str, Any]:
    first = listing.images[0] if listing.images else None
    return {
        "id": listing.id,
        "title": listing.title,
        "area": listing.location_area,
        "distance_km": round_km(distance),
        "max_days": listing.max_days,
        "condition": listing.condition,
        "status": listing.status,
        "image": image_out(first) if first else None,
        "owner": {
            "id": owner.id if owner else None,
            "first_name": owner.display_name.split(" ")[0] if owner else "—",
            "rating": round(rating, 1) if rating is not None else None,
        },
        "is_saved": is_saved,
        "created_at": listing.created_at,
    }


async def booked_ranges(db: AsyncSession, listing_id: uuid.UUID) -> list[dict[str, date]]:
    rows = (
        await db.execute(
            select(Loan.start_date, Loan.end_date)
            .where(
                Loan.listing_id == listing_id,
                Loan.status.in_(("approved", "active")),
                Loan.end_date >= today_tashkent(),
            )
            .order_by(Loan.start_date)
        )
    ).all()
    return [{"start": r[0], "end": r[1]} for r in rows]


def is_publicly_visible(listing: Listing, owner: User | None) -> bool:
    return listing.status == "active" and owner is not None and owner.is_active and owner.banned_at is None


def availability_case() -> Any:
    return case((Listing.status == "active", True), else_=False)

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select

from app.core.deps import DB, CurrentUser, OptionalUser, Writer, csrf_protect
from app.core.errors import AppError, conflict, forbidden, not_found
from app.core.time import today_tashkent
from app.modules.auth.models import User
from app.modules.borrowing.models import BorrowRequest
from app.modules.categories.models import Category
from app.modules.listings import service
from app.modules.listings.models import Listing, ListingImage
from app.modules.loans.models import Loan
from app.modules.messages.models import Conversation
from app.modules.users.service import public_users
from app.realtime import hub
from app.storage.base import get_storage

router = APIRouter(prefix="/listings", tags=["listings"])
me_router = APIRouter(prefix="/me", tags=["listings"])

MAX_IMAGES = 8
Condition = Literal["new", "good", "used"]


class ListingIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=4000)
    category: str = Field(min_length=2, max_length=40)  # slug
    condition: Condition
    max_days: int = Field(ge=1, le=30)
    borrowing_terms: list[Annotated[str, Field(min_length=2, max_length=200)]] = Field(
        default_factory=list, max_length=10
    )
    location_area: str = Field(min_length=2, max_length=80)
    latitude: float | None = Field(default=None, ge=37, le=46)  # Uzbekistan bounding box
    longitude: float | None = Field(default=None, ge=55, le=74)

    @field_validator("title", "location_area")
    @classmethod
    def squash(cls, v: str) -> str:
        return " ".join(v.split())


class ListingPatch(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=120)
    description: str | None = Field(default=None, min_length=10, max_length=4000)
    category: str | None = None
    condition: Condition | None = None
    max_days: int | None = Field(default=None, ge=1, le=30)
    borrowing_terms: list[Annotated[str, Field(min_length=2, max_length=200)]] | None = Field(
        default=None, max_length=10
    )
    location_area: str | None = Field(default=None, min_length=2, max_length=80)
    latitude: float | None = Field(default=None, ge=37, le=46)
    longitude: float | None = Field(default=None, ge=55, le=74)
    status: Literal["active", "hidden_by_owner"] | None = None


async def _category_id(db: DB, slug: str) -> uuid.UUID:
    cid = await db.scalar(select(Category.id).where(Category.slug == slug, Category.is_active))
    if not cid:
        raise AppError("CATEGORY_NOT_FOUND", 422)
    return cid


async def _owned(db: DB, listing_id: uuid.UUID, user: User) -> Listing:
    listing = await db.get(Listing, listing_id)
    if not listing or listing.status == "removed":
        raise not_found("LISTING")
    if listing.owner_id != user.id:
        raise forbidden("NOT_OWNER")
    return listing


@router.get("")
async def search_listings(
    db: DB,
    viewer: OptionalUser,
    q: str | None = Query(None, max_length=100),
    category: str | None = Query(None, max_length=40),
    area: str | None = Query(None, max_length=80),
    condition: list[Condition] = Query(default_factory=list),
    min_days: int | None = Query(None, ge=1, le=30),
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    km: float | None = Query(None, gt=0, le=100),
    available: bool = False,
    sort: Literal["nearest", "newest", "rating"] = "newest",
    page: int = Query(1, ge=1, le=500),
    page_size: int = Query(24, ge=1, le=48),
    owner: uuid.UUID | None = None,
    exclude: uuid.UUID | None = None,
) -> dict[str, object]:
    items, total = await service.search(
        db,
        viewer_id=viewer.id if viewer else None,
        q=q.strip() if q else None,
        category=category,
        area=area.strip() if area else None,
        conditions=list(condition),
        min_days=min_days,
        lat=lat,
        lng=lng,
        km=km,
        available_from=today_tashkent() if available else None,
        sort=sort,
        page=page,
        page_size=page_size,
        owner_id=owner,
        exclude_id=exclude,
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", status_code=201, dependencies=[Depends(csrf_protect)])
async def create_listing(body: ListingIn, db: DB, user: Writer) -> dict[str, object]:
    listing = Listing(
        id=uuid.uuid4(),
        owner_id=user.id,
        category_id=await _category_id(db, body.category),
        title=body.title,
        description=body.description.strip(),
        condition=body.condition,
        max_days=body.max_days,
        borrowing_terms=[t.strip() for t in body.borrowing_terms],
        location_area=body.location_area,
        latitude=body.latitude,
        longitude=body.longitude,
        status="active",
    )
    db.add(listing)
    hub.defer(db, None, "listing.created", {"id": str(listing.id)})
    await db.commit()
    return {"id": listing.id}


@router.get("/{listing_id}")
async def get_listing(
    listing_id: uuid.UUID,
    db: DB,
    viewer: OptionalUser,
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    locale: str = Query("uz", pattern="^(uz|ru|en)$"),
) -> dict[str, object]:
    listing = await db.get(Listing, listing_id)
    if not listing:
        raise not_found("LISTING")
    owner = await db.get(User, listing.owner_id)
    is_owner = viewer is not None and viewer.id == listing.owner_id
    is_admin = viewer is not None and viewer.is_admin
    if (
        not service.is_publicly_visible(listing, owner)
        and not (is_owner and listing.status != "removed")
        and not is_admin
    ):
        raise not_found("LISTING")
    assert owner is not None
    category = await db.get(Category, listing.category_id)
    tr = {t.locale: t.name for t in category.translations} if category else {}
    distance = None
    if lat is not None and lng is not None and listing.latitude is not None:
        distance = await db.scalar(select(service.distance_expr(lat, lng)).where(Listing.id == listing.id))
    on_loan = bool(await db.scalar(select(Loan.id).where(Loan.listing_id == listing.id, Loan.status == "active")))
    my_request = None
    conversation_id = None
    if viewer and not is_owner:
        req = await db.scalar(
            select(BorrowRequest)
            .where(BorrowRequest.listing_id == listing.id, BorrowRequest.borrower_id == viewer.id)
            .order_by(BorrowRequest.created_at.desc())
        )
        if req and req.status in ("pending", "approved"):
            my_request = {"id": req.id, "status": req.status, "start": req.start_date, "end": req.end_date}
        conversation_id = await db.scalar(
            select(Conversation.id).where(Conversation.listing_id == listing.id, Conversation.borrower_id == viewer.id)
        )
    profiles = await public_users(db, [owner])
    saved = await service.saved_ids(db, viewer.id if viewer else None, [listing.id])
    return {
        "id": listing.id,
        "title": listing.title,
        "description": listing.description,
        "condition": listing.condition,
        "status": listing.status,
        "max_days": listing.max_days,
        "borrowing_terms": listing.borrowing_terms,
        "area": listing.location_area,
        "distance_km": service.round_km(distance),
        "category": {"slug": category.slug if category else None, "name": tr.get(locale) or tr.get("uz")},
        "images": [service.image_out(i) for i in listing.images],
        "owner": profiles[owner.id],
        "booked": await service.booked_ranges(db, listing.id),
        "on_loan": on_loan,
        "is_owner": is_owner,
        "is_saved": listing.id in saved,
        "my_request": my_request,
        "conversation_id": conversation_id,
        "moderation_reason": listing.moderation_reason if (is_owner or is_admin) else None,
        "created_at": listing.created_at,
        "updated_at": listing.updated_at,
    }


@router.get("/{listing_id}/availability")
async def availability(listing_id: uuid.UUID, db: DB) -> dict[str, object]:
    listing = await db.get(Listing, listing_id)
    if not listing or listing.status == "removed":
        raise not_found("LISTING")
    return {"booked": await service.booked_ranges(db, listing_id), "max_days": listing.max_days}


@router.patch("/{listing_id}", dependencies=[Depends(csrf_protect)])
async def update_listing(listing_id: uuid.UUID, body: ListingPatch, db: DB, user: Writer) -> dict[str, object]:
    listing = await _owned(db, listing_id, user)
    if listing.status == "hidden_by_admin" and body.status == "active":
        raise forbidden("LISTING_HIDDEN_BY_ADMIN")
    data = body.model_dump(exclude_unset=True)
    if "category" in data:
        listing.category_id = await _category_id(db, data.pop("category"))
    for field, value in data.items():
        setattr(listing, field, value)
    await db.commit()
    return {"id": listing.id}


@router.delete("/{listing_id}", dependencies=[Depends(csrf_protect)])
async def delete_listing(listing_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, bool]:
    listing = await _owned(db, listing_id, user)
    open_loan = await db.scalar(
        select(Loan.id).where(Loan.listing_id == listing.id, Loan.status.in_(("approved", "active")))
    )
    if open_loan:
        raise conflict("LISTING_HAS_ACTIVE_LOAN")  # SPEC §10 rule 12
    # pending requests on a deleted listing are cancelled
    for req in (
        await db.scalars(
            select(BorrowRequest).where(BorrowRequest.listing_id == listing.id, BorrowRequest.status == "pending")
        )
    ).all():
        req.status = "cancelled"
    listing.status = "removed"
    hub.defer(db, None, "listing.deleted", {"id": str(listing.id)})
    await db.commit()
    return {"ok": True}


@router.post("/{listing_id}/images", status_code=201, dependencies=[Depends(csrf_protect)])
async def upload_image(listing_id: uuid.UUID, db: DB, user: Writer, file: UploadFile = File(...)) -> dict[str, object]:
    listing = await _owned(db, listing_id, user)
    count = await db.scalar(select(func.count()).where(ListingImage.listing_id == listing.id)) or 0
    if count >= MAX_IMAGES:
        raise AppError("TOO_MANY_IMAGES", 400, max=MAX_IMAGES)
    data = await file.read(8 * 1024 * 1024 + 1)
    stored = await get_storage().save_image(data, f"listings/{listing.id}")
    img = ListingImage(
        id=uuid.uuid4(),
        listing_id=listing.id,
        cloudinary_public_id=stored.key,
        url=stored.url,
        width=stored.width,
        height=stored.height,
        position=count,
    )
    db.add(img)
    await db.commit()
    return service.image_out(img)


@router.delete("/{listing_id}/images/{image_id}", dependencies=[Depends(csrf_protect)])
async def delete_image(listing_id: uuid.UUID, image_id: uuid.UUID, db: DB, user: CurrentUser) -> dict[str, bool]:
    listing = await _owned(db, listing_id, user)
    img = await db.get(ListingImage, image_id)
    if not img or img.listing_id != listing.id:
        raise not_found("IMAGE")
    await get_storage().delete(img.cloudinary_public_id)
    await db.delete(img)
    await db.flush()
    for pos, other in enumerate(sorted([i for i in listing.images if i.id != image_id], key=lambda i: i.position)):
        other.position = pos
    await db.commit()
    return {"ok": True}


@me_router.get("/listings")
async def my_listings(db: DB, user: CurrentUser) -> list[dict[str, object]]:
    rows = (
        await db.scalars(
            select(Listing)
            .where(Listing.owner_id == user.id, Listing.status != "removed")
            .order_by(Listing.created_at.desc())
        )
    ).all()
    active = set(
        (await db.scalars(select(Loan.listing_id).where(Loan.owner_id == user.id, Loan.status == "active"))).all()
    )
    pending = dict(
        (
            await db.execute(
                select(BorrowRequest.listing_id, func.count())
                .where(BorrowRequest.listing_id.in_([r.id for r in rows]), BorrowRequest.status == "pending")
                .group_by(BorrowRequest.listing_id)
            )
        ).all()
    )
    out = []
    for listing in rows:
        c = service.card(listing, user, rating=None, distance=None, is_saved=False)
        c["on_loan"] = listing.id in active
        c["pending_requests"] = pending.get(listing.id, 0)
        c["moderation_reason"] = listing.moderation_reason
        out.append(c)
    return out

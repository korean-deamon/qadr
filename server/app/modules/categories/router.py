from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.deps import DB
from app.modules.categories.models import Category
from app.modules.listings.models import Listing
from app.modules.listings.service import visible_listing_filter

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def list_categories(db: DB, locale: str = Query("uz", pattern="^(uz|ru|en)$")) -> list[dict[str, object]]:
    counts = dict(
        (
            await db.execute(
                select(Listing.category_id, func.count()).where(*visible_listing_filter()).group_by(Listing.category_id)
            )
        ).all()
    )
    rows = (await db.scalars(select(Category).where(Category.is_active).order_by(Category.position))).all()
    out = []
    for c in rows:
        tr = {t.locale: t for t in c.translations}
        t = tr.get(locale) or tr.get("uz")
        out.append(
            {
                "id": c.id,
                "slug": c.slug,
                "icon": c.icon,
                "image": c.image,
                "name": t.name if t else c.slug,
                "description": t.description if t else None,
                "count": counts.get(c.id, 0),
            }
        )
    return out

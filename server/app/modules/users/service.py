"""Public profiles and trust signals (SPEC §10: verified email, completed loans, rating)."""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.loans.models import Loan
from app.modules.ratings.models import Rating


def first_name(name: str) -> str:
    return name.split(" ")[0]


async def trust_signals(db: AsyncSession, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict[str, Any]]:
    if not user_ids:
        return {}
    ratings = dict(
        (row[0], (float(row[1]), int(row[2])))
        for row in (
            await db.execute(
                select(Rating.ratee_id, func.avg(Rating.score), func.count())
                .where(Rating.ratee_id.in_(user_ids))
                .group_by(Rating.ratee_id)
            )
        ).all()
    )
    loans: dict[uuid.UUID, int] = {}
    for col in (Loan.owner_id, Loan.borrower_id):
        for uid, n in (
            await db.execute(
                select(col, func.count()).where(col.in_(user_ids), Loan.status == "returned").group_by(col)
            )
        ).all():
            loans[uid] = loans.get(uid, 0) + int(n)
    out = {}
    for uid in user_ids:
        avg, count = ratings.get(uid, (0.0, 0))
        out[uid] = {
            "rating": round(avg, 1) if count else None,
            "rating_count": count,
            "completed_loans": loans.get(uid, 0),
        }
    return out


def public_user(user: User, trust: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.display_name,
        "first_name": first_name(user.display_name),
        "avatar_url": user.avatar_url,
        "area": user.area,
        "phone_verified": user.phone_verified_at is not None,
        "member_since": user.created_at,
        **trust,
    }


async def public_users(db: AsyncSession, users: list[User]) -> dict[uuid.UUID, dict[str, Any]]:
    trust = await trust_signals(db, [u.id for u in users])
    return {u.id: public_user(u, trust[u.id]) for u in users}

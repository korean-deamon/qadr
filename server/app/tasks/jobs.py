"""Scheduled jobs: return reminders, stale-request expiry, unverified-account and data cleanup."""

from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.outbox import TaskOutbox
from app.core.time import TASHKENT, now_utc, today_tashkent
from app.modules.auth.models import EmailOtp, RefreshToken, User
from app.modules.auth.service import UNVERIFIED_TTL
from app.modules.borrowing.service import expire_stale
from app.modules.listings.models import Listing
from app.modules.loans.models import Loan
from app.modules.notifications.service import notify
from app.modules.telegram.models import TelegramLinkToken

REMINDER_HOURS = range(9, 21)  # don't ping people at night (Tashkent time)


async def return_reminders(db: AsyncSession, *, force: bool = False) -> int:
    """Day before and on end_date. Dedupe keys make this safe to run every hour."""
    if not force and datetime.now(TASHKENT).hour not in REMINDER_HOURS:
        return 0
    today = today_tashkent()
    sent = 0
    for due, kind in ((today + timedelta(days=1), "return_due_tomorrow"), (today, "return_due_today")):
        loans = (await db.scalars(select(Loan).where(Loan.status == "active", Loan.end_date == due))).all()
        for loan in loans:
            listing = await db.get(Listing, loan.listing_id)
            payload = {"item": listing.title if listing else "", "loan_id": str(loan.id), "due": due.isoformat()}
            for uid, who in ((loan.borrower_id, "b"), (loan.owner_id, "o")):
                if await notify(db, uid, kind, payload, dedupe_key=f"{kind}:{loan.id}:{who}"):
                    sent += 1
    await db.commit()
    return sent


async def expire_requests(db: AsyncSession) -> int:
    return await expire_stale(db)


async def delete_unverified(db: AsyncSession) -> int:
    """Remove accounts that never linked Telegram within UNVERIFIED_TTL (SPEC §11).
    Frees the email address. Such accounts cannot own listings, requests or
    messages (every write needs a linked Telegram), so the cascade only takes
    their sessions, link tokens and codes."""
    result = await db.execute(
        delete(User)
        .where(User.verified_at.is_(None), User.is_admin.is_(False), User.created_at < now_utc() - UNVERIFIED_TTL)
        .returning(User.id)
    )
    removed = len(result.all())
    await db.commit()
    return removed


async def cleanup(db: AsyncSession) -> None:
    now = now_utc()
    await db.execute(delete(EmailOtp).where(EmailOtp.expires_at < now - timedelta(days=1)))
    await db.execute(delete(TelegramLinkToken).where(TelegramLinkToken.expires_at < now - timedelta(days=1)))
    await db.execute(delete(RefreshToken).where(RefreshToken.expires_at < now - timedelta(days=7)))
    await db.execute(delete(TaskOutbox).where(TaskOutbox.processed_at < now - timedelta(days=14)))
    await db.commit()

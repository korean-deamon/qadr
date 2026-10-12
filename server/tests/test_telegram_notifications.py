from datetime import timedelta

from sqlalchemy import func, select, update

from app.core.db import SessionLocal
from app.core.outbox import TaskOutbox
from app.core.time import now_utc, today_tashkent
from app.modules.auth.models import User
from app.modules.borrowing.models import BorrowRequest
from app.modules.loans.models import Loan
from app.modules.notifications.models import Notification
from app.modules.telegram import service as tg
from app.modules.telegram.models import TelegramLinkToken
from app.modules.telegram.service import LinkResult
from app.tasks import delivery, jobs
from tests.conftest import Client, login, make_listing, make_user, run_outbox


async def link_token(client: Client) -> str:
    res = await client.post("/telegram/link-token")
    assert res.status_code == 200, res.text
    url = res.json()["url"]
    assert url.startswith("https://t.me/qadr_test_bot?start=")
    return url.split("start=")[1]


async def test_link_flow_verifies_contact_ownership(client: Client) -> None:
    user = await make_user(verified=False)
    await login(client, user)
    assert (await client.get("/auth/me")).json()["telegram_required"] is True
    token = await link_token(client)
    async with SessionLocal() as db:
        # someone else's contact: contact.user_id != from.id
        res, _ = await tg.link(db, token, from_id=777, contact_user_id=888, phone="+998 90 123 45 67", username="x")
        assert res == LinkResult.WRONG_CONTACT
        res, linked = await tg.link(db, token, from_id=777, contact_user_id=777, phone="901234567", username="dilnoza")
        assert res == LinkResult.LINKED and linked
    me = (await client.get("/auth/me")).json()
    assert (
        me["phone"] == "+998901234567"
        and me["phone_verified"]
        and me["telegram_linked"]
        and not me["telegram_required"]
    )
    async with SessionLocal() as db:
        res, _ = await tg.link(db, token, from_id=777, contact_user_id=777, phone="901234567", username="x")
        assert res == LinkResult.TOKEN_INVALID  # single use


async def test_link_token_expiry_rate_limit_and_conflicts(client: Client) -> None:
    other = await make_user(phone="+998901111111", telegram_id=42)
    user = await make_user(verified=False)
    await login(client, user)
    token = await link_token(client)
    async with SessionLocal() as db:
        assert (await tg.link(db, token, from_id=99, contact_user_id=99, phone="+998901111111", username=None))[
            0
        ] == LinkResult.PHONE_TAKEN
        assert (await tg.link(db, token, from_id=42, contact_user_id=42, phone="+998902222222", username=None))[
            0
        ] == LinkResult.TELEGRAM_TAKEN
        await db.execute(update(TelegramLinkToken).values(expires_at=now_utc() - timedelta(seconds=1)))
        await db.commit()
        assert (await tg.link(db, token, from_id=99, contact_user_id=99, phone="+998903333333", username=None))[
            0
        ] == LinkResult.TOKEN_INVALID
    for _ in range(4):
        await link_token(client)
    res = await client.post("/telegram/link-token")
    assert res.status_code == 429  # 5 per hour
    assert other.telegram_id == 42


async def test_notifications_go_to_telegram_otherwise_stay_in_app(client: Client, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    sent: list[tuple[int, str]] = []

    async def fake_send(chat_id: int, text: str) -> None:
        if chat_id == 2:
            raise delivery.TelegramBlocked("blocked")
        sent.append((chat_id, text))

    monkeypatch.setattr(delivery, "send_telegram", fake_send)
    linked = await make_user(name="Linked", telegram_id=1)
    blocked = await make_user(name="Blocked", telegram_id=2)
    muted = await make_user(name="Muted", telegram_id=3)
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.id == muted.id).values(telegram_notifications=False))
        await db.commit()
    listing = await make_listing(await make_user(name="Owner"))
    async with SessionLocal() as db:
        from app.modules.notifications.service import notify

        for u in (linked, blocked, muted):
            await notify(
                db,
                u.id,
                "request_approved",
                {"item": listing.title, "actor": "Sardor", "start": "2026-10-15", "end": "2026-10-17"},
                dedupe_key=f"t:{u.id}",
            )
            assert await notify(db, u.id, "request_approved", {}, dedupe_key=f"t:{u.id}") is None  # deduped
        await db.commit()
    await run_outbox()
    assert [chat for chat, _ in sent] == [1]
    assert "15.10.2026 – 17.10.2026" in sent[0][1] or "Oct 15, 2026" in sent[0][1]
    async with SessionLocal() as db:
        assert (await db.get(User, blocked.id)).telegram_blocked_at is not None  # type: ignore[union-attr]
        # everyone still has the in-app notification
        assert await db.scalar(select(func.count()).select_from(Notification)) == 3
        assert (
            await db.scalar(select(func.count()).select_from(TaskOutbox).where(TaskOutbox.processed_at.is_(None))) == 0
        )
    await run_outbox()
    assert len(sent) == 1  # idempotent: nothing re-sent


async def test_outbox_retries_with_backoff(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    async def boom(db, payload):  # type: ignore[no-untyped-def]
        raise RuntimeError("telegram down")

    monkeypatch.setitem(delivery.HANDLERS, "otp.deliver", boom)
    user = await make_user()
    async with SessionLocal() as db:
        from app.modules.auth.service import issue_otp

        await issue_otp(db, user, "reset")
        await db.commit()
    assert await run_outbox() == 0
    async with SessionLocal() as db:
        row = await db.scalar(select(TaskOutbox))
        assert (
            row and row.attempts == 1 and row.next_attempt_at > now_utc() and "telegram down" in (row.last_error or "")
        )
    assert await run_outbox() == 0  # not yet due


async def test_return_reminders_are_sent_once() -> None:
    owner, b = await make_user(), await make_user()
    listing = await make_listing(owner)
    today = today_tashkent()
    async with SessionLocal() as db:
        r = BorrowRequest(
            listing_id=listing.id,
            borrower_id=b.id,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=1),
            terms_accepted_at=now_utc(),
            status="approved",
        )
        db.add(r)
        await db.flush()
        db.add(
            Loan(
                request_id=r.id,
                listing_id=listing.id,
                borrower_id=b.id,
                owner_id=owner.id,
                start_date=r.start_date,
                end_date=r.end_date,
                status="active",
            )
        )
        await db.commit()
        assert await jobs.return_reminders(db, force=True) == 2
        assert await jobs.return_reminders(db, force=True) == 0
        types = (await db.scalars(select(Notification.type))).all()
        assert sorted(types) == ["return_due_tomorrow", "return_due_tomorrow"]


async def test_unlink_clears_verification(client: Client) -> None:
    await login(client, await make_user(phone="+998907777777", telegram_id=7))
    assert (await client.get("/telegram/status")).json()["linked"] is True
    await client.delete("/telegram/link")
    me = (await client.get("/auth/me")).json()
    assert me["telegram_linked"] is False and me["phone_verified"] is False and me["telegram_required"] is True
    # limited again until a Telegram account is linked, but never deleted (it was verified once)
    res = await client.get("/users/me")
    assert res.status_code == 403 and res.json()["error"]["code"] == "TELEGRAM_REQUIRED"
    assert me["delete_unverified_at"] is None

import asyncio
from datetime import timedelta

from sqlalchemy import select, update

from app.core.db import SessionLocal
from app.core.time import today_tashkent
from app.modules.borrowing import service
from app.modules.borrowing.models import BorrowRequest
from app.modules.loans.models import Loan
from app.modules.notifications.models import Notification
from tests.conftest import Client, days, login, make_listing, make_user, new_client


async def request(c: Client, listing_id: object, start: int, end: int, accept: bool = True) -> dict:  # type: ignore[type-arg]
    res = await c.post(
        f"/listings/{listing_id}/requests",
        json={"start_date": days(start), "end_date": days(end), "message": "Hi!", "accept_terms": accept},
    )
    return {**res.json(), "http": res.status_code}


async def test_request_rules(client: Client) -> None:
    owner = await make_user(name="Owner One")
    listing = await make_listing(owner, max_days=3)
    await login(client, owner)
    assert (await request(client, listing.id, 1, 2))["error"]["code"] == "CANNOT_BORROW_OWN"  # rule 1

    async with new_client() as c:
        await login(c, await make_user(name="Borrower"))
        assert (await request(c, listing.id, 1, 2, accept=False))["error"]["code"] == "TERMS_NOT_ACCEPTED"  # rule 3
        assert (await request(c, listing.id, -1, 1))["error"]["code"] == "DATES_IN_PAST"  # rule 4
        assert (await request(c, listing.id, 3, 1))["error"]["code"] == "DATES_INVALID"
        assert (await request(c, listing.id, 1, 5))["error"]["code"] == "DATES_TOO_LONG"
        assert (await request(c, listing.id, 100, 101))["error"]["code"] == "DATES_TOO_FAR"
        ok = await request(c, listing.id, 1, 3)
        assert ok["http"] == 201 and ok["status"] == "pending" and ok["role"] == "borrower"
        assert (await request(c, listing.id, 5, 6))["error"]["code"] == "REQUEST_ALREADY_PENDING"

    async with SessionLocal() as db:
        n = await db.scalar(select(Notification).where(Notification.user_id == owner.id))
        assert n and n.type == "request_received"  # rule 8


async def test_approve_creates_loan_and_rejects_overlaps(client: Client) -> None:
    owner = await make_user(name="Owner", phone="+998900000001")
    listing = await make_listing(owner)
    a, b, c_ = (
        await make_user(name="Ann", phone="+998900000002"),
        await make_user(name="Bob"),
        await make_user(name="Cid"),
    )
    ids = {}
    for who, (s, e) in ((a, (2, 4)), (b, (3, 5)), (c_, (8, 9))):
        async with new_client() as cl:
            await login(cl, who)
            ids[who.email] = (await request(cl, listing.id, s, e))["id"]

    await login(client, owner)
    res = await client.post(f"/requests/{ids[a.email]}/approve")
    assert res.status_code == 200, res.text
    loan_id = res.json()["loan_id"]
    # repeated transition → 409 (rule 10)
    assert (await client.post(f"/requests/{ids[a.email]}/approve")).status_code == 409
    async with SessionLocal() as db:
        statuses = {r.borrower_id: r.status for r in (await db.scalars(select(BorrowRequest))).all()}
    assert statuses[a.id] == "approved" and statuses[b.id] == "rejected" and statuses[c_.id] == "pending"

    # phone reveal only between the two parties of the approved loan (rule 13)
    owner_view = (await client.get(f"/loans/{loan_id}")).json()
    assert owner_view["with"]["phone"] == "+998900000002"
    async with new_client() as cl:
        await login(cl, a)
        assert (await cl.get(f"/loans/{loan_id}")).json()["with"]["phone"] == "+998900000001"
        listing_view = (await cl.get(f"/listings/{listing.id}")).json()
        assert "phone" not in str(listing_view["owner"]).lower() or listing_view["owner"].get("phone") is None
    async with new_client() as cl:
        await login(cl, b)
        assert (await cl.get(f"/loans/{loan_id}")).status_code == 404

    # booked dates are now unavailable for new requests (rule 5)
    async with new_client() as cl:
        await login(cl, await make_user(name="Dee"))
        assert (await request(cl, listing.id, 4, 4))["error"]["code"] == "DATES_UNAVAILABLE"


async def test_concurrent_approvals_only_one_wins() -> None:
    """Two owners' sessions approving overlapping requests at once: the DB decides."""
    owner = await make_user(name="Owner")
    listing = await make_listing(owner)
    x, y = await make_user(name="X"), await make_user(name="Y")
    async with SessionLocal() as db:
        today = today_tashkent()
        rx = BorrowRequest(
            listing_id=listing.id,
            borrower_id=x.id,
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=4),
            terms_accepted_at=today,
            status="pending",
        )
        ry = BorrowRequest(
            listing_id=listing.id,
            borrower_id=y.id,
            start_date=today + timedelta(days=3),
            end_date=today + timedelta(days=6),
            terms_accepted_at=today,
            status="pending",
        )
        db.add_all([rx, ry])
        await db.commit()

    async def approve(req_id):  # type: ignore[no-untyped-def]
        async with SessionLocal() as db:
            from app.modules.auth.models import User

            o = await db.get(User, owner.id)
            try:
                await service.approve(db, o, req_id)
                return "ok"
            except Exception as exc:
                return getattr(exc, "code", type(exc).__name__)

    results = await asyncio.gather(approve(rx.id), approve(ry.id))
    assert sorted(results) == ["INVALID_TRANSITION", "ok"] or sorted(results) == ["DATES_UNAVAILABLE", "ok"]
    async with SessionLocal() as db:
        loans = (await db.scalars(select(Loan).where(Loan.listing_id == listing.id))).all()
        assert len(loans) == 1


async def test_exclusion_constraint_is_final_authority() -> None:
    owner, b = await make_user(), await make_user()
    listing = await make_listing(owner)
    today = today_tashkent()
    async with SessionLocal() as db:
        reqs = [
            BorrowRequest(
                listing_id=listing.id,
                borrower_id=b.id,
                start_date=today,
                end_date=today + timedelta(days=2),
                terms_accepted_at=today,
                status="approved",
            )
            for _ in range(2)
        ]
        db.add_all(reqs)
        await db.flush()
        db.add(
            Loan(
                request_id=reqs[0].id,
                listing_id=listing.id,
                borrower_id=b.id,
                owner_id=owner.id,
                start_date=today,
                end_date=today + timedelta(days=2),
                status="approved",
            )
        )
        await db.flush()
        db.add(
            Loan(
                request_id=reqs[1].id,
                listing_id=listing.id,
                borrower_id=b.id,
                owner_id=owner.id,
                start_date=today + timedelta(days=2),
                end_date=today + timedelta(days=3),
                status="active",
            )
        )
        try:
            await db.flush()
            raise AssertionError("overlapping loans were accepted")
        except Exception as exc:
            assert "no_overlapping_loans" in str(exc)


async def test_reject_and_cancel_permissions(client: Client) -> None:
    owner, b = await make_user(), await make_user()
    listing = await make_listing(owner)
    async with new_client() as cb:
        await login(cb, b)
        rid = (await request(cb, listing.id, 1, 2))["id"]
        assert (await cb.post(f"/requests/{rid}/approve")).json()["error"]["code"] == "NOT_OWNER"  # rule 2
        assert (await cb.post(f"/requests/{rid}/cancel")).status_code == 200
        assert (await cb.post(f"/requests/{rid}/cancel")).status_code == 409
    await login(client, owner)
    assert (await client.post(f"/requests/{rid}/reject")).status_code == 409  # already cancelled


async def test_pickup_return_rating_and_hidden_from_explore(client: Client) -> None:
    owner, b = await make_user(name="Owner"), await make_user(name="Borrower")
    listing = await make_listing(owner, title="Unique tent")
    async with new_client() as cb:
        await login(cb, b)
        rid = (await request(cb, listing.id, 0, 2))["id"]
        await login(client, owner)
        loan_id = (await client.post(f"/requests/{rid}/approve")).json()["loan_id"]

        assert (await cb.post(f"/loans/{loan_id}/pickup")).json()["error"]["code"] == "NOT_OWNER"
        assert (await client.post(f"/loans/{loan_id}/pickup")).json()["status"] == "active"
        # rule 11: on-loan items vanish from explore, owner still sees them
        assert (await cb.get("/listings", params={"q": "Unique"})).json()["total"] == 0
        assert (await client.get(f"/listings/{listing.id}")).status_code == 200
        assert any(i["on_loan"] for i in (await client.get("/me/listings")).json())

        # rating before return is refused
        assert (await cb.post(f"/loans/{loan_id}/rating", json={"score": 5})).json()["error"][
            "code"
        ] == "LOAN_NOT_RETURNED"
        # borrower claims return, owner confirms (final)
        assert (await cb.post(f"/loans/{loan_id}/return")).json()["status"] == "active"
        assert (await client.post(f"/loans/{loan_id}/return")).json()["status"] == "returned"
        assert (await client.post(f"/loans/{loan_id}/return")).status_code == 409
        assert (await cb.get("/listings", params={"q": "Unique"})).json()["total"] == 1

        assert (await cb.post(f"/loans/{loan_id}/rating", json={"score": 5, "comment": "Great"})).status_code == 201
        assert (await cb.post(f"/loans/{loan_id}/rating", json={"score": 4})).json()["error"]["code"] == "ALREADY_RATED"
        assert (await client.post(f"/loans/{loan_id}/rating", json={"score": 4})).status_code == 201
        profile = (await cb.get(f"/users/{owner.id}")).json()
        assert profile["rating"] == 5.0 and profile["completed_loans"] == 1 and profile["phone_verified"] is True


async def test_delete_listing_blocked_by_open_loan(client: Client) -> None:
    owner, b = await make_user(), await make_user()
    listing = await make_listing(owner)
    async with new_client() as cb:
        await login(cb, b)
        rid = (await request(cb, listing.id, 1, 2))["id"]
    await login(client, owner)
    await client.post(f"/requests/{rid}/approve")
    res = await client.delete(f"/listings/{listing.id}")
    assert res.status_code == 409 and res.json()["error"]["code"] == "LISTING_HAS_ACTIVE_LOAN"  # rule 12


async def test_not_returned_report_rules(client: Client) -> None:
    owner, b = await make_user(), await make_user()
    listing = await make_listing(owner)
    today = today_tashkent()
    async with SessionLocal() as db:
        r = BorrowRequest(
            listing_id=listing.id,
            borrower_id=b.id,
            start_date=today - timedelta(days=5),
            end_date=today,
            terms_accepted_at=today,
            status="approved",
        )
        db.add(r)
        await db.flush()
        loan = Loan(
            request_id=r.id,
            listing_id=listing.id,
            borrower_id=b.id,
            owner_id=owner.id,
            start_date=r.start_date,
            end_date=r.end_date,
            status="active",
        )
        db.add(loan)
        await db.commit()
    await login(client, owner)
    body = {"target_type": "user", "target_id": str(b.id), "reason": "not_returned", "loan_id": str(loan.id)}
    assert (await client.post("/reports", json=body)).json()["error"]["code"] == "NOT_RETURNED_TOO_EARLY"
    async with SessionLocal() as db:
        await db.execute(
            update(Loan)
            .where(Loan.id == loan.id)
            .values(start_date=today - timedelta(days=6), end_date=today - timedelta(days=1))
        )
        await db.commit()
    res = await client.post("/reports", json=body)
    assert res.status_code == 201 and res.json()["priority"] == "high"


async def test_expiry_policy_never_touches_loans() -> None:
    owner, b = await make_user(), await make_user()
    listing = await make_listing(owner)
    today = today_tashkent()
    async with SessionLocal() as db:
        stale = BorrowRequest(
            listing_id=listing.id,
            borrower_id=b.id,
            start_date=today,
            end_date=today + timedelta(days=1),
            terms_accepted_at=today,
            status="pending",
        )
        fresh = BorrowRequest(
            listing_id=listing.id,
            borrower_id=owner.id,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=6),
            terms_accepted_at=today,
            status="pending",
        )
        db.add_all([stale, fresh])
        await db.commit()
        assert await service.expire_stale(db) == 1
        await db.refresh(stale)
        await db.refresh(fresh)
        assert stale.status == "expired" and fresh.status == "pending"

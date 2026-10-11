from datetime import timedelta

import pytest
from sqlalchemy import select, text, update

from app.core.db import SessionLocal, engine
from app.core.time import now_utc
from app.modules.auth.models import RefreshToken
from app.modules.listings.models import Listing
from app.modules.moderation.models import AdminAuditLog, Report
from tests.conftest import PASSWORD, Client, login, make_listing, make_user, new_client


async def setup_report(reason: str = "fraud", priority: str = "normal") -> tuple[object, object, object, Report]:
    owner, reporter = await make_user(name="Target Owner"), await make_user(name="Reporter")
    listing = await make_listing(owner, title="Suspicious camera")
    async with SessionLocal() as db:
        r = Report(
            reporter_id=reporter.id,
            target_type="listing",
            target_id=listing.id,
            target_user_id=owner.id,
            listing_id=listing.id,
            reason=reason,
            priority=priority,
            status="open",
        )
        db.add(r)
        await db.commit()
    return owner, reporter, listing, r


async def actions() -> list[str]:
    async with SessionLocal() as db:
        return list((await db.scalars(select(AdminAuditLog.action).order_by(AdminAuditLog.created_at))).all())


async def test_reports_queue_puts_not_returned_first(client: Client) -> None:
    await setup_report("fraud")
    _, _, _, high = await setup_report("not_returned", "high")
    await login(client, await make_user(admin=True))
    items = (await client.get("/admin/reports")).json()["items"]
    assert items[0]["id"] == str(high.id) and items[0]["priority"] == "high"
    assert (await client.get("/admin/reports", params={"reason": "fraud"})).json()["total"] == 1
    assert (await client.get("/admin/reports", params={"q": "suspicious"})).json()["total"] == 2


async def test_report_detail_conversation_view_is_audited(client: Client) -> None:
    owner, reporter, listing, report = await setup_report()
    async with new_client() as cr:
        await login(cr, reporter)  # type: ignore[arg-type]
        await cr.post("/conversations", json={"listing_id": str(listing.id), "body": "Is it real?"})  # type: ignore[attr-defined]
    await login(client, await make_user(admin=True))
    detail = (await client.get(f"/admin/reports/{report.id}")).json()
    assert detail["reporter"]["name"] == "Reporter" and detail["target"]["name"] == "Target Owner"
    assert detail["conversation_id"] is not None and "rating" in detail["target"]
    assert await actions() == []  # viewing the detail is fine; the conversation needs a reason
    assert (await client.get(f"/admin/reports/{report.id}/conversation")).status_code == 422
    conv = (
        await client.get(f"/admin/reports/{report.id}/conversation", params={"reason": "verify fraud claim"})
    ).json()
    assert conv["messages"][0]["body"] == "Is it real?"
    assert await actions() == ["view_conversation"]


async def test_moderation_actions_are_all_audited(client: Client) -> None:
    owner, reporter, listing, report = await setup_report()
    await login(client, await make_user(admin=True))
    rid = str(report.id)
    assert (await client.post(f"/admin/reports/{rid}/notes", json={"body": "Checked photos"})).status_code == 201
    assert (await client.post(f"/admin/reports/{rid}/assign", json={})).status_code == 200
    assert (
        await client.post(f"/admin/reports/{rid}/contact", json={"to": "both", "text": "Please send proof."})
    ).json() == {"sent": 2}
    assert (
        await client.post(f"/admin/users/{owner.id}/warn", json={"reason": "Misleading photos", "report_id": rid})
    ).status_code == 200  # type: ignore[attr-defined]
    assert (await client.post(f"/admin/listings/{listing.id}/hide", json={"reason": "Misleading photos"})).json()[
        "status"
    ] == "hidden_by_admin"  # type: ignore[attr-defined]
    assert (
        await client.post(f"/admin/users/{owner.id}/restrict", json={"reason": "Repeat issue", "days": 7})
    ).status_code == 200  # type: ignore[attr-defined]
    assert (
        await client.post(f"/admin/reports/{rid}/resolve", json={"reason": "Listing hidden, user warned"})
    ).json() == {"status": "resolved"}
    assert (await client.post(f"/admin/reports/{rid}/dismiss", json={"reason": "again"})).status_code == 409
    assert await actions() == [
        "add_note",
        "assign_report",
        "contact_parties",
        "warn_user",
        "hide_listing",
        "restrict_user",
        "resolve_report",
    ]
    async with SessionLocal() as db:
        assert (await db.get(Listing, listing.id)).status == "hidden_by_admin"  # type: ignore[union-attr,attr-defined]
    # resolving requires a reason
    _, _, _, other = await setup_report()
    assert (await client.post(f"/admin/reports/{other.id}/dismiss", json={"reason": ""})).status_code == 422


async def test_ban_revokes_sessions_and_hides_listings(client: Client) -> None:
    target = await make_user(name="Spammer")
    listing = await make_listing(target)
    async with new_client() as ct:
        await login(ct, target)
    await login(client, await make_user(admin=True))
    assert (await client.post(f"/admin/users/{target.id}/ban", json={"reason": "Spam"})).status_code == 200
    async with SessionLocal() as db:
        assert (
            await db.scalars(
                select(RefreshToken).where(RefreshToken.user_id == target.id, RefreshToken.revoked_at.is_(None))
            )
        ).all() == []
        assert (await db.get(Listing, listing.id)).status == "hidden_by_admin"  # type: ignore[union-attr]
    async with new_client() as ct:
        res = await ct.post("/auth/login", json={"email": target.email, "password": PASSWORD})
        assert res.status_code == 403
    assert (await client.post(f"/admin/users/{target.id}/unban", json={"reason": "Appeal accepted"})).status_code == 200
    async with SessionLocal() as db:
        assert (await db.get(Listing, listing.id)).status == "active"  # type: ignore[union-attr]


async def test_admin_writes_need_fresh_login(client: Client) -> None:
    from app.core.security import create_access_token

    admin = await make_user(admin=True)
    _, _, _, report = await setup_report()
    stale = create_access_token(admin.id, is_admin=True, auth_time=now_utc() - timedelta(hours=13))
    client.cookies.set("qadr_access", stale)
    client.cookies.set("qadr_csrf", "c")
    assert (await client.get("/admin/reports")).status_code == 200  # reading is fine
    res = await client.post(f"/admin/reports/{report.id}/notes", json={"body": "x"}, headers={"x-csrf-token": "c"})
    assert res.status_code == 403 and res.json()["error"]["code"] == "REAUTH_REQUIRED"


async def test_audit_log_is_append_only(client: Client) -> None:
    _, _, _, report = await setup_report()
    await login(client, await make_user(admin=True))
    await client.post(f"/admin/reports/{report.id}/notes", json={"body": "note"})
    log = (await client.get("/admin/audit-log")).json()
    assert log["total"] == 1 and log["items"][0]["action"] == "add_note" and log["actions"] == ["add_note"]
    async with engine.begin() as conn:
        with pytest.raises(Exception, match="append-only"):
            await conn.execute(text("UPDATE admin_audit_log SET reason = 'tampered'"))
    async with engine.begin() as conn:
        with pytest.raises(Exception, match="append-only"):
            await conn.execute(text("DELETE FROM admin_audit_log"))
    async with SessionLocal() as db:
        await db.execute(update(Report).where(Report.id == report.id).values(status="in_review"))
        await db.commit()

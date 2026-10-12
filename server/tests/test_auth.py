"""SPEC §11 (v3.3): sign-up without email codes, Telegram as the verification gate,
password reset by Telegram code, sessions with rotating refresh tokens."""

import re
from datetime import timedelta

import jwt
import pytest
from sqlalchemy import func, select, update

from app.core.db import SessionLocal
from app.core.redis import get_redis
from app.core.security import decode_access_token
from app.core.time import now_utc
from app.modules.auth.models import EmailOtp, RefreshToken, User
from app.modules.telegram import service as tg
from app.tasks import jobs
from tests.conftest import PASSWORD, Client, login, make_user, new_client, run_outbox


async def register(client: Client, email: str = "new@test.uz") -> dict:  # type: ignore[type-arg]
    res = await client.post(
        "/auth/register", json={"email": email, "password": PASSWORD, "display_name": "Nodira A", "locale": "uz"}
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest.fixture
def telegram(monkeypatch):  # type: ignore[no-untyped-def]
    """Captures bot messages instead of calling the Telegram API."""
    sent: list[tuple[int, str]] = []

    async def fake_send(chat_id: int, text: str) -> None:
        sent.append((chat_id, text))

    monkeypatch.setattr("app.tasks.delivery.send_telegram", fake_send)
    return sent


def code_in(text: str) -> str:
    m = re.search(r"<b>(\d{6})</b>", text)
    assert m, text
    return m.group(1)


async def test_register_signs_in_without_any_code(client: Client) -> None:
    me = await register(client, "New@Test.UZ")
    assert me["email"] == "new@test.uz"  # normalized
    assert me["telegram_required"] is True and me["phone_verified"] is False
    assert me["delete_unverified_at"] is not None
    assert "qadr_access" in client.cookies and "qadr_refresh" in client.cookies and "qadr_csrf" in client.cookies
    assert decode_access_token(client.cookies["qadr_access"])["tg"] is False
    async with SessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(EmailOtp)) == 0  # nothing is sent at sign-up


async def test_unlinked_account_can_only_link_telegram(client: Client) -> None:
    await register(client)
    assert (await client.get("/auth/me")).status_code == 200
    assert (await client.get("/telegram/status")).json()["linked"] is False
    assert (await client.post("/telegram/link-token")).status_code == 200
    for method, path in (("GET", "/users/me"), ("GET", "/saved"), ("GET", "/notifications"), ("POST", "/listings")):
        res = await client.request(method, path, json={} if method == "POST" else None)
        assert res.status_code == 403, (path, res.text)
        assert res.json()["error"]["code"] == "TELEGRAM_REQUIRED"


async def test_linking_telegram_unlocks_the_account(client: Client) -> None:
    await register(client)
    token = (await client.post("/telegram/link-token")).json()["url"].split("start=")[1]
    async with SessionLocal() as db:
        result, _ = await tg.link(db, token, from_id=501, contact_user_id=501, phone="901112233", username="nodira")
        assert result == tg.LinkResult.LINKED
    assert (await client.get("/users/me")).status_code == 200  # the API checks the row, not the token
    me = (await client.get("/auth/me")).json()
    assert me["telegram_required"] is False and me["delete_unverified_at"] is None
    assert (await client.post("/auth/refresh")).status_code == 200
    assert decode_access_token(client.cookies["qadr_access"])["tg"] is True  # proxy hint follows on refresh
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.email == "new@test.uz"))
        assert user and user.verified_at is not None


async def test_email_is_never_overwritten(client: Client) -> None:
    await register(client)
    async with new_client() as other:
        res = await other.post(
            "/auth/register",
            json={"email": "new@test.uz", "password": "Another123!", "display_name": "Imposter", "locale": "en"},
        )
        assert res.status_code == 409 and res.json()["error"]["code"] == "EMAIL_TAKEN"
    res = await client.post("/auth/login", json={"email": "new@test.uz", "password": PASSWORD})
    assert res.status_code == 200  # the original password still works


async def test_abandoned_unverified_email_can_be_registered_again(client: Client) -> None:
    await register(client)
    async with SessionLocal() as db:
        await db.execute(update(User).values(created_at=now_utc() - timedelta(hours=25)))
        await db.commit()
    async with new_client() as fresh:
        res = await fresh.post(
            "/auth/register",
            json={"email": "new@test.uz", "password": "Another123!", "display_name": "Real Owner", "locale": "en"},
        )
        assert res.status_code == 201 and res.json()["display_name"] == "Real Owner"


async def test_unverified_accounts_are_deleted_after_24_hours() -> None:
    old = now_utc() - timedelta(hours=25)
    stale = await make_user(verified=False)
    recent = await make_user(verified=False)
    linked_long_ago = await make_user()
    unlinked_later = await make_user(verified=False)
    admin = await make_user(verified=False, admin=True)
    async with SessionLocal() as db:
        await db.execute(
            update(User)
            .where(User.id.in_([stale.id, linked_long_ago.id, unlinked_later.id, admin.id]))
            .values(created_at=old)
        )
        # verified once, then unlinked: keeps verified_at, must never be deleted
        await db.execute(update(User).where(User.id == unlinked_later.id).values(verified_at=old))
        await db.commit()
        assert await jobs.delete_unverified(db) == 1
        remaining = set((await db.scalars(select(User.id))).all())
    assert stale.id not in remaining
    assert {recent.id, linked_long_ago.id, unlinked_later.id, admin.id} <= remaining


def google_claims(**overrides: object) -> dict:  # type: ignore[type-arg]
    claims = {"email": "googler@test.uz", "email_verified": True, "name": "Googler Test"}
    claims.update(overrides)
    return claims


@pytest.fixture
def google(monkeypatch):  # type: ignore[no-untyped-def]
    """Stubs Google's token verification (no real network call) and enables the feature."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "google_client_id", "test-client-id.apps.googleusercontent.com")
    calls: list[str] = []

    def fake_verify(token, request, audience):  # type: ignore[no-untyped-def]
        calls.append(token)
        if token == "bad-token":
            raise ValueError("Wrong number of segments")
        assert audience == settings.google_client_id
        return google_claims() if token == "valid-token" else google_claims(email=token)

    monkeypatch.setattr("app.modules.auth.service.google_id_token.verify_oauth2_token", fake_verify)
    return calls


async def test_google_creates_an_unlinked_account_like_register(client: Client, google) -> None:  # type: ignore[no-untyped-def]
    res = await client.post("/auth/google", json={"credential": "valid-token", "locale": "ru"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["email"] == "googler@test.uz" and body["display_name"] == "Googler Test"
    assert body["telegram_required"] is True  # same gate as email sign-up (SPEC §11)
    assert "qadr_access" in client.cookies and "qadr_refresh" in client.cookies
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.email == "googler@test.uz"))
        assert user and user.password_hash is None and user.preferred_locale == "ru"


async def test_google_logs_into_the_existing_account_by_email_not_a_duplicate(client: Client, google) -> None:  # type: ignore[no-untyped-def]
    existing = await make_user(email="googler@test.uz")
    res = await client.post("/auth/google", json={"credential": "valid-token"})
    assert res.status_code == 200
    assert res.json()["id"] == str(existing.id)
    async with SessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(User).where(User.email == "googler@test.uz")) == 1


async def test_google_rejects_unverified_email_claim(client: Client, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from app.core.config import settings

    monkeypatch.setattr(settings, "google_client_id", "test-client-id")

    def fake_verify(token, request, audience):  # type: ignore[no-untyped-def]
        return google_claims(email_verified=False)

    monkeypatch.setattr("app.modules.auth.service.google_id_token.verify_oauth2_token", fake_verify)
    res = await client.post("/auth/google", json={"credential": "x"})
    assert res.status_code == 401 and res.json()["error"]["code"] == "GOOGLE_EMAIL_UNVERIFIED"


async def test_google_rejects_a_bad_token(client: Client, google) -> None:  # type: ignore[no-untyped-def]
    res = await client.post("/auth/google", json={"credential": "bad-token"})
    assert res.status_code == 401 and res.json()["error"]["code"] == "GOOGLE_TOKEN_INVALID"


async def test_google_disabled_without_a_client_id(client: Client) -> None:
    res = await client.post("/auth/google", json={"credential": "x"})
    assert res.status_code == 503 and res.json()["error"]["code"] == "GOOGLE_NOT_CONFIGURED"


async def test_google_rejects_a_banned_users_existing_account(client: Client, google) -> None:  # type: ignore[no-untyped-def]
    banned = await make_user(email="googler@test.uz")
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.id == banned.id).values(banned_at=now_utc()))
        await db.commit()
    res = await client.post("/auth/google", json={"credential": "valid-token"})
    assert res.status_code == 403 and res.json()["error"]["code"] == "ACCOUNT_BANNED"


async def test_google_only_account_cannot_password_login(client: Client, google) -> None:  # type: ignore[no-untyped-def]
    await client.post("/auth/google", json={"credential": "valid-token"})
    async with new_client() as c:
        res = await c.post("/auth/login", json={"email": "googler@test.uz", "password": "whatever123!"})
        assert res.status_code == 401 and res.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_login_works_before_linking_and_reports_the_gate(client: Client) -> None:
    user = await make_user(verified=False)
    res = await client.post("/auth/login", json={"email": user.email, "password": PASSWORD})
    assert res.status_code == 200 and res.json()["telegram_required"] is True


async def test_login_errors_and_rate_limit(client: Client) -> None:
    user = await make_user()
    for _ in range(5):
        res = await client.post("/auth/login", json={"email": user.email, "password": "wrong-password"})
        assert res.status_code == 401 and res.json()["error"]["code"] == "INVALID_CREDENTIALS"
    res = await client.post("/auth/login", json={"email": user.email, "password": PASSWORD})
    assert res.status_code == 429 and res.json()["error"]["retry_after"] > 0


async def test_forgot_and_reset_password_by_telegram(client: Client, telegram) -> None:  # type: ignore[no-untyped-def]
    user = await make_user(telegram_id=555)
    await login(client, user)
    assert (await client.post("/auth/forgot-password", json={"email": user.email})).json() == {"ok": True}
    await run_outbox()
    assert len(telegram) == 1 and telegram[0][0] == 555
    res = await client.post(
        "/auth/reset-password", json={"email": user.email, "code": code_in(telegram[0][1]), "password": "BrandNew123!"}
    )
    assert res.status_code == 200
    assert (await client.post("/auth/refresh")).status_code == 401  # every old session is revoked
    async with new_client() as c:
        res = await c.post("/auth/login", json={"email": user.email, "password": "BrandNew123!"})
        assert res.status_code == 200


async def test_forgot_password_never_reveals_who_can_receive_codes(client: Client, telegram) -> None:  # type: ignore[no-untyped-def]
    unlinked = await make_user(verified=False)
    blocked = await make_user(telegram_id=556)
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.id == blocked.id).values(telegram_blocked_at=now_utc()))
        await db.commit()
    for email in ("ghost@test.uz", unlinked.email, blocked.email):
        res = await client.post("/auth/forgot-password", json={"email": email})
        assert res.status_code == 200 and res.json() == {"ok": True}
    await run_outbox()
    assert telegram == []
    async with SessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(EmailOtp)) == 0


async def test_wrong_reset_code_counts_attempts_then_locks(client: Client, telegram) -> None:  # type: ignore[no-untyped-def]
    user = await make_user(telegram_id=557)
    await client.post("/auth/forgot-password", json={"email": user.email})
    await run_outbox()
    code = code_in(telegram[0][1])
    wrong = "000000" if code != "000000" else "111111"
    body = {"email": user.email, "password": "BrandNew123!"}
    for left in (4, 3, 2, 1):
        res = await client.post("/auth/reset-password", json={**body, "code": wrong})
        assert res.status_code == 400
        assert res.json()["error"] == {"code": "OTP_INVALID", "message": "OTP_INVALID", "attempts_left": left}
    res = await client.post("/auth/reset-password", json={**body, "code": wrong})
    assert res.json()["error"]["code"] == "OTP_ATTEMPTS_EXCEEDED"
    await get_redis().flushdb()  # past the hourly reset rate limit
    res = await client.post("/auth/reset-password", json={**body, "code": code})
    assert res.json()["error"]["code"] == "OTP_ATTEMPTS_EXCEEDED"  # even the right code is now useless


async def test_expired_reset_code(client: Client, telegram) -> None:  # type: ignore[no-untyped-def]
    user = await make_user(telegram_id=558)
    await client.post("/auth/forgot-password", json={"email": user.email})
    await run_outbox()
    async with SessionLocal() as db:
        await db.execute(update(EmailOtp).values(expires_at=now_utc() - timedelta(seconds=1)))
        await db.commit()
    res = await client.post(
        "/auth/reset-password", json={"email": user.email, "code": code_in(telegram[0][1]), "password": "BrandNew123!"}
    )
    assert res.status_code == 400 and res.json()["error"]["code"] == "OTP_EXPIRED"


async def test_resend_is_rate_limited_and_looks_identical(client: Client, telegram) -> None:  # type: ignore[no-untyped-def]
    user = await make_user(telegram_id=559)
    assert (await client.post("/auth/resend-otp", json={"email": user.email})).json() == {"ok": True}
    res = await client.post("/auth/resend-otp", json={"email": user.email})
    assert res.status_code == 429
    body = res.json()["error"]
    assert body["code"] == "RATE_LIMITED" and 1 <= body["retry_after"] <= 60
    assert res.headers["retry-after"] == str(body["retry_after"])
    assert (await client.post("/auth/resend-otp", json={"email": "nobody@test.uz"})).json() == {"ok": True}
    await run_outbox()
    assert [chat for chat, _ in telegram] == [559]


async def test_refresh_rotates_and_reuse_revokes_family(client: Client) -> None:
    user = await make_user()
    await login(client, user)
    old = client.cookies.get("qadr_refresh")
    res = await client.post("/auth/refresh")
    assert res.status_code == 200
    new = client.cookies.get("qadr_refresh")
    assert new and new != old

    # an attacker replays the old (rotated) token → whole family revoked
    async with new_client() as thief:
        thief.cookies.set("qadr_refresh", old)
        thief.cookies.set("qadr_csrf", "x")
        res = await thief.post("/auth/refresh", headers={"x-csrf-token": "x"})
        assert res.status_code == 401 and res.json()["error"]["code"] == "REFRESH_REUSED"

    res = await client.post("/auth/refresh")  # the legitimate session is gone too
    assert res.status_code == 401
    async with SessionLocal() as db:
        active = (
            await db.scalars(
                select(RefreshToken).where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
            )
        ).all()
        assert active == []


async def test_logout_revokes(client: Client) -> None:
    await login(client, await make_user())
    refresh = client.cookies.get("qadr_refresh")
    assert (await client.post("/auth/logout")).status_code == 200
    async with new_client() as other:
        other.cookies.set("qadr_refresh", refresh)
        other.cookies.set("qadr_csrf", "x")
        res = await other.post("/auth/refresh", headers={"x-csrf-token": "x"})
        assert res.status_code == 401


async def test_unlinked_user_can_log_out(client: Client) -> None:
    await register(client)
    assert (await client.post("/auth/logout")).status_code == 200


async def test_csrf_required_for_cookie_requests(client: Client) -> None:
    await login(client, await make_user())
    res = await client.post("/auth/logout", headers={"x-csrf-token": "forged"})
    assert res.status_code == 403 and res.json()["error"]["code"] == "CSRF_FAILED"
    res = await client.post("/auth/logout", headers={"origin": "https://evil.example"})
    assert res.status_code == 403 and res.json()["error"]["code"] == "CSRF_ORIGIN"


async def test_access_token_claim_is_only_a_hint(client: Client) -> None:
    """A forged `tg: true` claim is useless: it would need the server's signing key."""
    user = await make_user(verified=False)
    await login(client, user)
    claims = decode_access_token(client.cookies["qadr_access"])
    forged = jwt.encode({**claims, "tg": True}, "attacker-guess-not-the-real-signing-key-0123", algorithm="HS256")
    async with new_client() as c:
        res = await c.get("/users/me", headers={"authorization": f"Bearer {forged}"})
        assert res.status_code == 401


async def test_banned_user_cannot_login(client: Client) -> None:
    user = await make_user()
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.id == user.id).values(banned_at=now_utc()))
        await db.commit()
    res = await client.post("/auth/login", json={"email": user.email, "password": PASSWORD})
    assert res.status_code == 403 and res.json()["error"]["code"] == "ACCOUNT_BANNED"

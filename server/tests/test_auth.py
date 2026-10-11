import re
from datetime import timedelta

from sqlalchemy import select, update

from app.core.db import SessionLocal
from app.core.time import now_utc
from app.email import provider
from app.modules.auth.models import EmailOtp, RefreshToken, User
from tests.conftest import PASSWORD, Client, login, make_user, new_client, run_outbox


def last_code() -> str:
    assert provider.OUTBOX, "no email sent"
    m = re.search(r"\b(\d{6})\b", provider.OUTBOX[-1].body)
    assert m
    return m.group(1)


async def register(client: Client, email: str = "new@test.uz") -> None:
    res = await client.post(
        "/auth/register", json={"email": email, "password": PASSWORD, "display_name": "Nodira A", "locale": "uz"}
    )
    assert res.status_code == 201, res.text
    await run_outbox()


async def test_register_verify_and_login(client: Client) -> None:
    await register(client, "New@Test.UZ")
    assert provider.OUTBOX[-1].to == "new@test.uz"  # normalized
    assert "tasdiqlash" in provider.OUTBOX[-1].subject.lower()  # localized (uz)
    res = await client.post("/auth/verify-email", json={"email": "new@test.uz", "code": last_code()})
    assert res.status_code == 200, res.text
    assert res.json()["email_verified"] is True
    assert "qadr_access" in client.cookies and "qadr_refresh" in client.cookies and "qadr_csrf" in client.cookies
    me = await client.get("/auth/me")
    assert me.json()["email"] == "new@test.uz"


async def test_wrong_code_counts_attempts_then_locks(client: Client) -> None:
    await register(client)
    code = last_code()
    wrong = "000000" if code != "000000" else "111111"
    for left in (4, 3, 2, 1):
        res = await client.post("/auth/verify-email", json={"email": "new@test.uz", "code": wrong})
        assert res.status_code == 400
        assert res.json()["error"] == {"code": "OTP_INVALID", "message": "OTP_INVALID", "attempts_left": left}
    res = await client.post("/auth/verify-email", json={"email": "new@test.uz", "code": wrong})
    assert res.json()["error"]["code"] == "OTP_ATTEMPTS_EXCEEDED"
    res = await client.post("/auth/verify-email", json={"email": "new@test.uz", "code": code})
    assert res.json()["error"]["code"] == "OTP_ATTEMPTS_EXCEEDED"  # even the right code is now useless


async def test_expired_code(client: Client) -> None:
    await register(client)
    async with SessionLocal() as db:
        await db.execute(update(EmailOtp).values(expires_at=now_utc() - timedelta(seconds=1)))
        await db.commit()
    res = await client.post("/auth/verify-email", json={"email": "new@test.uz", "code": last_code()})
    assert res.status_code == 400 and res.json()["error"]["code"] == "OTP_EXPIRED"


async def test_resend_cooldown_is_rate_limited(client: Client) -> None:
    await register(client)
    res = await client.post("/auth/resend-otp", json={"email": "new@test.uz"})
    assert res.status_code == 429
    body = res.json()["error"]
    assert body["code"] == "RATE_LIMITED" and 1 <= body["retry_after"] <= 60
    assert res.headers["retry-after"] == str(body["retry_after"])


async def test_resend_unknown_email_looks_identical(client: Client) -> None:
    res = await client.post("/auth/resend-otp", json={"email": "nobody@test.uz"})
    assert res.status_code == 200 and res.json() == {"channel": "email"}


async def test_unverified_cannot_login(client: Client) -> None:
    user = await make_user(verified=False)
    res = await client.post("/auth/login", json={"email": user.email, "password": PASSWORD})
    assert res.status_code == 403 and res.json()["error"]["code"] == "EMAIL_NOT_VERIFIED"


async def test_login_errors_and_rate_limit(client: Client) -> None:
    user = await make_user()
    for _ in range(5):
        res = await client.post("/auth/login", json={"email": user.email, "password": "wrong-password"})
        assert res.status_code == 401 and res.json()["error"]["code"] == "INVALID_CREDENTIALS"
    res = await client.post("/auth/login", json={"email": user.email, "password": PASSWORD})
    assert res.status_code == 429 and res.json()["error"]["retry_after"] > 0


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


async def test_csrf_required_for_cookie_requests(client: Client) -> None:
    await login(client, await make_user())
    res = await client.post("/auth/logout", headers={"x-csrf-token": "forged"})
    assert res.status_code == 403 and res.json()["error"]["code"] == "CSRF_FAILED"
    res = await client.post("/auth/logout", headers={"origin": "https://evil.example"})
    assert res.status_code == 403 and res.json()["error"]["code"] == "CSRF_ORIGIN"


async def test_forgot_and_reset_password_by_email(client: Client) -> None:
    user = await make_user()
    assert (await client.post("/auth/forgot-password", json={"email": user.email})).json() == {"ok": True}
    assert (await client.post("/auth/forgot-password", json={"email": "ghost@test.uz"})).json() == {"ok": True}
    await run_outbox()
    assert len(provider.OUTBOX) == 1 and provider.OUTBOX[0].to == user.email
    code = last_code()
    res = await client.post(
        "/auth/reset-password", json={"email": user.email, "code": code, "password": "BrandNew123!"}
    )
    assert res.status_code == 200
    res = await client.post("/auth/login", json={"email": user.email, "password": "BrandNew123!"})
    assert res.status_code == 200


async def test_reset_code_goes_to_telegram_when_linked(client: Client, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    sent: list[tuple[int, str]] = []

    async def fake_send(chat_id: int, text: str) -> None:
        sent.append((chat_id, text))

    monkeypatch.setattr("app.tasks.delivery.send_telegram", fake_send)
    user = await make_user(phone="+998901112233", telegram_id=555)
    await client.post("/auth/forgot-password", json={"email": user.email})
    await run_outbox()
    assert provider.OUTBOX == [] and len(sent) == 1 and sent[0][0] == 555
    assert re.search(r"<b>\d{6}</b>", sent[0][1])


async def test_registration_code_always_emailed_even_with_telegram(client: Client) -> None:
    from app.modules.auth.service import code_channel

    user = User(email="x@test.uz", password_hash="x", display_name="X", telegram_id=1)
    assert code_channel(user, "verify") == "email"
    assert code_channel(user, "reset") == "telegram"


async def test_banned_user_cannot_login(client: Client) -> None:
    user = await make_user()
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.id == user.id).values(banned_at=now_utc()))
        await db.commit()
    res = await client.post("/auth/login", json={"email": user.email, "password": PASSWORD})
    assert res.status_code == 403 and res.json()["error"]["code"] == "ACCOUNT_BANNED"

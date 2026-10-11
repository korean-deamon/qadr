"""Test setup: real PostgreSQL (qadr_test) + Redis db 15, migrated with Alembic."""

import os
import tempfile
from pathlib import Path


def _dotenv(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if path.exists():
        for line in path.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.split(" #")[0].strip()
    return out


_env = _dotenv(Path(__file__).resolve().parents[2] / ".env")
os.environ.update(
    {
        "APP_ENV": "test",
        "DATABASE_URL": os.environ.get("TEST_DATABASE_URL") or _env.get("TEST_DATABASE_URL", ""),
        "REDIS_URL": (os.environ.get("TEST_REDIS_URL") or _env.get("REDIS_URL", "redis://localhost:6380/0")).rsplit(
            "/", 1
        )[0]
        + "/15",
        "SECRET_KEY": "test-secret-key-0123456789abcdef",
        "EMAIL_PROVIDER": "memory",
        "RATE_LIMIT_MULTIPLIER": "1",
        "MEDIA_ROOT": tempfile.mkdtemp(prefix="qadr-media-"),
        "FRONTEND_URL": "http://localhost:3000",
        "CORS_ORIGINS": "http://localhost:3000",
        "TELEGRAM_BOT_TOKEN": "123:test",
        "TELEGRAM_BOT_USERNAME": "qadr_test_bot",
        "CLOUDINARY_CLOUD_NAME": "",
        "CLOUDINARY_API_KEY": "",
        "CLOUDINARY_API_SECRET": "",
    }
)

import uuid
from collections.abc import AsyncIterator
from datetime import timedelta

import pytest
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from alembic import command
from app.core.config import settings
from app.core.db import SessionLocal, engine
from app.core.redis import get_redis
from app.core.security import hash_password
from app.core.time import now_utc
from app.email import provider
from app.main import app
from app.modules.auth.models import User
from app.modules.categories.models import Category, CategoryTranslation
from app.modules.listings.models import Listing

PASSWORD = "Secret12345!"
ORIGIN = "http://localhost:3000"


@pytest.fixture(scope="session", autouse=True)
async def _schema() -> AsyncIterator[None]:
    assert "qadr_test" in settings.database_url, "tests must run against the qadr_test database"
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    os.environ["ALEMBIC_DATABASE_URL"] = settings.database_url
    import asyncio

    await asyncio.to_thread(command.upgrade, cfg, "head")
    yield
    await engine.dispose()


TABLES = (
    "admin_audit_log, user_warnings, report_notes, reports, notifications, ratings, messages, "
    "conversation_participants, conversations, loans, borrow_requests, saved_items, listing_images, listings, "
    "category_translations, categories, telegram_link_tokens, refresh_tokens, email_otps, task_outbox, users"
)


@pytest.fixture(autouse=True)
async def _clean() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE admin_audit_log DISABLE TRIGGER admin_audit_log_no_change"))
        await conn.execute(text(f"TRUNCATE {TABLES} CASCADE"))
        await conn.execute(text("ALTER TABLE admin_audit_log ENABLE TRIGGER admin_audit_log_no_change"))
    await get_redis().flushdb()
    provider.OUTBOX.clear()
    yield


class Client(AsyncClient):
    """Browser-like client: same-origin header + double-submit CSRF from the cookie."""

    async def request(self, method, url, **kwargs):  # type: ignore[no-untyped-def,override]
        headers = dict(kwargs.pop("headers", None) or {})
        headers.setdefault("origin", ORIGIN)
        csrf = self.cookies.get("qadr_csrf")
        if csrf and method.upper() not in ("GET", "HEAD", "OPTIONS"):
            headers.setdefault("x-csrf-token", csrf)
        return await super().request(method, url, headers=headers, **kwargs)


@pytest.fixture
async def client() -> AsyncIterator[Client]:
    async with Client(transport=ASGITransport(app=app), base_url="http://test/api/v1") as c:
        yield c


def new_client() -> Client:
    return Client(transport=ASGITransport(app=app), base_url="http://test/api/v1")


async def make_user(
    email: str | None = None,
    *,
    name: str = "Test User",
    verified: bool = True,
    phone: str | None = None,
    admin: bool = False,
    telegram_id: int | None = None,
    locale: str = "en",
) -> User:
    async with SessionLocal() as db:
        u = User(
            id=uuid.uuid4(),
            email=email or f"u{uuid.uuid4().hex[:8]}@test.uz",
            password_hash=hash_password(PASSWORD),
            display_name=name,
            email_verified_at=now_utc() if verified else None,
            phone=phone,
            phone_verified_at=now_utc() if phone else None,
            telegram_id=telegram_id,
            is_admin=admin,
            preferred_locale=locale,
        )
        db.add(u)
        await db.commit()
        return u


async def login(c: Client, user: User) -> Client:
    res = await c.post("/auth/login", json={"email": user.email, "password": PASSWORD})
    assert res.status_code == 200, res.text
    return c


async def make_category(slug: str = "tools") -> Category:
    async with SessionLocal() as db:
        cat = Category(id=uuid.uuid4(), slug=slug)
        cat.translations = [
            CategoryTranslation(locale="en", name=slug.title()),
            CategoryTranslation(locale="uz", name=slug),
        ]
        db.add(cat)
        await db.commit()
        return cat


async def make_listing(
    owner: User, *, title: str = "Bosch drill", category: str = "tools", max_days: int = 7, **kw
) -> Listing:  # type: ignore[no-untyped-def]
    async with SessionLocal() as db:
        from sqlalchemy import select

        cat_id = await db.scalar(select(Category.id).where(Category.slug == category))
        if not cat_id:
            cat_id = (await make_category(category)).id
        listing = Listing(
            id=uuid.uuid4(),
            owner_id=owner.id,
            category_id=cat_id,
            title=title,
            description=kw.pop("description", "A reliable cordless drill with two batteries."),
            condition="good",
            max_days=max_days,
            borrowing_terms=["Return it clean"],
            location_area=kw.pop("area", "Yunusobod"),
            latitude=kw.pop("lat", 41.364),
            longitude=kw.pop("lng", 69.288),
            status="active",
            **kw,
        )
        db.add(listing)
        await db.commit()
        return listing


def days(n: int) -> str:
    from app.core.time import today_tashkent

    return (today_tashkent() + timedelta(days=n)).isoformat()


async def run_outbox() -> int:
    from app.tasks.delivery import process_outbox

    async with SessionLocal() as db:
        return await process_outbox(db)

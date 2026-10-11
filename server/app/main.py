"""FastAPI application factory (modular monolith, SPEC §8)."""

import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.db import engine
from app.core.errors import AppError, app_error_handler, validation_error_handler
from app.core.logging import setup_logging
from app.core.redis import close_redis, get_redis
from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.borrowing.router import router as borrowing_router
from app.modules.categories.router import router as categories_router
from app.modules.listings.router import me_router as my_listings_router
from app.modules.listings.router import router as listings_router
from app.modules.loans.router import router as loans_router
from app.modules.messages.router import me_router as counters_router
from app.modules.messages.router import router as messages_router
from app.modules.moderation.router import router as reports_router
from app.modules.notifications.router import router as notifications_router
from app.modules.ratings.router import router as ratings_router
from app.modules.saved.router import router as saved_router
from app.modules.telegram.router import router as telegram_router
from app.modules.users.router import router as users_router
from app.realtime.router import router as ws_router

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    Path(settings.media_root).mkdir(parents=True, exist_ok=True)
    log.info("api.start", env=settings.app_env, storage="cloudinary" if settings.cloudinary_enabled else "local")
    yield
    await close_redis()
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Qadr API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/api/docs",
        openapi_url=None if settings.is_production else "/api/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["content-type", "x-csrf-token"],
    )
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        structlog.contextvars.bind_contextvars(request_id=rid)
        start = time.perf_counter()
        response: Response = await call_next(request)
        response.headers["x-request-id"] = rid
        if not request.url.path.endswith(("/health", "/ready")):
            log.info(
                "http",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                ms=round((time.perf_counter() - start) * 1000, 1),
            )
        structlog.contextvars.clear_contextvars()
        return response

    prefix = settings.api_v1_prefix
    for r in (
        auth_router,
        users_router,
        categories_router,
        listings_router,
        my_listings_router,
        saved_router,
        borrowing_router,
        loans_router,
        ratings_router,
        messages_router,
        counters_router,
        notifications_router,
        reports_router,
        telegram_router,
        admin_router,
        ws_router,
    ):
        app.include_router(r, prefix=prefix)

    @app.get(f"{prefix}/health", tags=["ops"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get(f"{prefix}/ready", tags=["ops"])
    async def ready() -> dict[str, str]:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await get_redis().ping()
        return {"status": "ready"}

    Path(settings.media_root).mkdir(parents=True, exist_ok=True)
    app.mount(settings.media_url, StaticFiles(directory=settings.media_root), name="media")
    return app


app = create_app()

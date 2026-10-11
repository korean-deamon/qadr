"""Async runtime for Celery tasks: each task runs in a fresh event loop with its own
NullPool engine, and waits for post-commit realtime publishes before exiting."""

import asyncio
from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core import redis as redis_mod
from app.core.config import settings
from app.realtime import hub


def run[T](fn: Callable[[AsyncSession], Awaitable[T]]) -> T:
    async def main() -> T:
        engine = create_async_engine(settings.database_url, poolclass=NullPool)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with maker() as session:
                result = await fn(session)
            if hub._TASKS:
                await asyncio.gather(*list(hub._TASKS), return_exceptions=True)
            return result
        finally:
            await redis_mod.close_redis()
            await engine.dispose()

    return asyncio.run(main())

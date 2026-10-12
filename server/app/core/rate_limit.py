"""Sliding-window rate limits in Redis (SPEC §11). Exceeding returns 429 + retry_after."""

import time
import uuid
from dataclasses import dataclass

from fastapi import Request

from app.core.config import settings
from app.core.errors import AppError
from app.core.redis import get_redis


@dataclass(frozen=True)
class Limit:
    name: str
    max_hits: int
    window_seconds: int


LOGIN_EMAIL = Limit("login:email", 5, 15 * 60)
LOGIN_IP = Limit("login:ip", 20, 15 * 60)
OTP_RESEND_COOLDOWN = Limit("otp:resend:cooldown", 1, 60)
OTP_RESEND_HOURLY = Limit("otp:resend:hour", 5, 3600)
FORGOT = Limit("forgot:email", 3, 3600)
RESET = Limit("reset:email", 5, 3600)
REGISTER_IP = Limit("register:ip", 10, 3600)
GOOGLE_LOGIN_IP = Limit("google:ip", 20, 15 * 60)
REPORTS = Limit("reports:user", 10, 24 * 3600)
MESSAGES = Limit("messages:user", 30, 60)
TELEGRAM_LINK = Limit("telegram:link", 5, 3600)
BOT_COMMANDS = Limit("bot:tg", 20, 60)


async def hit(limit: Limit, key: str) -> None:
    """Record a hit; raise RATE_LIMITED if the window is full."""
    redis = get_redis()
    rkey = f"rl:{limit.name}:{key}"
    now = time.time()
    member = f"{now}:{uuid.uuid4().hex[:8]}"
    async with redis.pipeline(transaction=True) as pipe:
        pipe.zremrangebyscore(rkey, 0, now - limit.window_seconds)
        pipe.zcard(rkey)
        pipe.zrange(rkey, 0, 0, withscores=True)
        results = await pipe.execute()
    count: int = results[1]
    budget = limit.max_hits * settings.rate_limit_multiplier
    if count >= budget:
        oldest = results[2][0][1] if results[2] else now
        retry_after = max(1, int(oldest + limit.window_seconds - now) + 1)
        raise AppError("RATE_LIMITED", 429, retry_after=retry_after)
    async with redis.pipeline(transaction=True) as pipe:
        pipe.zadd(rkey, {member: now})
        pipe.expire(rkey, limit.window_seconds)
        await pipe.execute()


async def reset(limit: Limit, key: str) -> None:
    await get_redis().delete(f"rl:{limit.name}:{key}")


def client_ip(request: Request) -> str:
    """The caller's IP. X-Forwarded-For is only trusted for the configured number of
    proxy hops in front of us (Caddy = 1), counted from the right, so clients can't
    spoof it to dodge rate limits."""
    hops = settings.trusted_proxy_hops
    fwd = request.headers.get("x-forwarded-for")
    if hops and fwd:
        parts = [p.strip() for p in fwd.split(",") if p.strip()]
        if len(parts) >= hops:
            return parts[-hops]
    return request.client.host if request.client else "unknown"

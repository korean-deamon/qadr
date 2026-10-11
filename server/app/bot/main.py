"""Qadr Telegram bot (SPEC §22). Run: `python -m app.bot.main`.

Polling in development, webhook in production (aiohttp, secret-token protected).
Always serves GET /tg/health so Docker can health-check it, even when no
TELEGRAM_BOT_TOKEN is configured yet (the bot then idles and says so in the log).
"""

import asyncio

import structlog
from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import KeyboardButton, Message, ReplyKeyboardMarkup, ReplyKeyboardRemove
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web
from sqlalchemy import select

from app.core import rate_limit as rl
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.errors import AppError
from app.core.i18n import t
from app.core.logging import setup_logging
from app.core.redis import get_redis
from app.modules.auth.models import User
from app.modules.telegram import service
from app.modules.telegram.service import LinkResult

log = structlog.get_logger()
router = Router()
PENDING_TTL = 600
WEBHOOK_PATH = "/tg/webhook"


def tg_locale(code: str | None) -> str:
    if code and code.startswith("ru"):
        return "ru"
    if code and code.startswith("en"):
        return "en"
    return "uz"


async def _locale_for(message: Message) -> str:
    async with SessionLocal() as db:
        user = (
            await db.scalar(select(User).where(User.telegram_id == message.from_user.id)) if message.from_user else None
        )
    return user.preferred_locale if user else tg_locale(message.from_user.language_code if message.from_user else None)


async def _limited(message: Message) -> bool:
    try:
        await rl.hit(rl.BOT_COMMANDS, str(message.from_user.id if message.from_user else 0))
        return False
    except AppError:
        return True


def _pending_key(tg_id: int) -> str:
    return f"bot:pending:{tg_id}"


@router.message(CommandStart(deep_link=True))
async def start_link(message: Message, command: CommandObject) -> None:
    if await _limited(message) or not message.from_user:
        return
    token = (command.args or "").strip()
    async with SessionLocal() as db:
        user = await service.pending_user(db, token)
    if not user:
        locale = tg_locale(message.from_user.language_code)
        await message.answer(t("bot.token_invalid", locale, url=f"{settings.frontend_url}/{locale}/settings"))
        return
    await get_redis().set(_pending_key(message.from_user.id), token, ex=PENDING_TTL)
    keyboard = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=t("bot.share_button", user.preferred_locale), request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
    await message.answer(t("bot.ask_contact", user.preferred_locale), reply_markup=keyboard)


@router.message(CommandStart())
async def start_plain(message: Message) -> None:
    if await _limited(message):
        return
    await message.answer(t("bot.welcome", await _locale_for(message)))


@router.message(F.contact)
async def on_contact(message: Message) -> None:
    if await _limited(message) or not message.from_user or not message.contact:
        return
    redis = get_redis()
    raw_token = await redis.get(_pending_key(message.from_user.id))
    token = raw_token.decode() if isinstance(raw_token, bytes) else raw_token
    locale = await _locale_for(message)
    if not token:
        await message.answer(t("bot.no_pending", locale), reply_markup=ReplyKeyboardRemove())
        return
    async with SessionLocal() as db:
        result, user = await service.link(
            db,
            token,
            from_id=message.from_user.id,
            contact_user_id=message.contact.user_id,  # must equal from.id: sender shares their own number
            phone=message.contact.phone_number,
            username=message.from_user.username,
        )
    if user:
        locale = user.preferred_locale
    if result == LinkResult.WRONG_CONTACT:
        await message.answer(t("bot.wrong_contact", locale))  # keep the keyboard so they can retry
        return
    await redis.delete(_pending_key(message.from_user.id))
    if result == LinkResult.LINKED and user:
        await message.answer(t("bot.linked", locale, phone=user.phone), reply_markup=ReplyKeyboardRemove())
    elif result == LinkResult.PHONE_TAKEN:
        await message.answer(t("bot.phone_taken", locale), reply_markup=ReplyKeyboardRemove())
    elif result == LinkResult.TELEGRAM_TAKEN:
        await message.answer(t("bot.telegram_taken", locale), reply_markup=ReplyKeyboardRemove())
    else:
        await message.answer(
            t("bot.token_invalid", locale, url=f"{settings.frontend_url}/{locale}/settings"),
            reply_markup=ReplyKeyboardRemove(),
        )
    log.info("bot.link", result=str(result), tg=message.from_user.id)


async def _set_notifications(message: Message, enabled: bool) -> None:
    if await _limited(message) or not message.from_user:
        return
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.telegram_id == message.from_user.id))
        if not user:
            await message.answer(t("bot.welcome", tg_locale(message.from_user.language_code)))
            return
        user.telegram_notifications = enabled
        user.telegram_blocked_at = None  # they are talking to us, so the bot is not blocked
        await db.commit()
        await message.answer(t("bot.notify_on" if enabled else "bot.stopped", user.preferred_locale))


@router.message(Command("stop"))
async def stop(message: Message) -> None:
    await _set_notifications(message, False)


@router.message(Command("notify"))
async def notify_on(message: Message) -> None:
    await _set_notifications(message, True)


@router.message()
async def fallback(message: Message) -> None:
    if await _limited(message):
        return
    await message.answer(t("bot.help", await _locale_for(message), url=settings.frontend_url))


# ---------------------------------------------------------------- runtime
async def health(_: web.Request) -> web.Response:
    return web.json_response({"status": "ok", "enabled": settings.telegram_enabled, "mode": settings.telegram_mode})


async def serve_health_only(app: web.Application) -> None:
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", 8081).start()  # noqa: S104 (container-internal)


async def main() -> None:
    setup_logging()
    app = web.Application()
    app.router.add_get("/tg/health", health)
    if not settings.telegram_enabled:
        log.warning(
            "bot.disabled", hint="set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME in .env, then restart the bot"
        )
        await serve_health_only(app)
        await asyncio.Event().wait()
        return

    bot = Bot(token=settings.telegram_bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(router)

    if settings.telegram_mode == "webhook":

        async def on_startup(bot: Bot) -> None:
            await bot.set_webhook(
                f"{settings.telegram_webhook_url.rstrip('/')}{WEBHOOK_PATH}",
                secret_token=settings.telegram_webhook_secret,
                drop_pending_updates=False,
            )
            log.info("bot.webhook_set")

        dp.startup.register(on_startup)
        SimpleRequestHandler(dispatcher=dp, bot=bot, secret_token=settings.telegram_webhook_secret).register(
            app, path=WEBHOOK_PATH
        )
        setup_application(app, dp, bot=bot)
        runner = web.AppRunner(app)
        await runner.setup()
        await web.TCPSite(runner, "0.0.0.0", 8081).start()  # noqa: S104
        log.info("bot.start", mode="webhook")
        await asyncio.Event().wait()
    else:
        await serve_health_only(app)
        await bot.delete_webhook(drop_pending_updates=False)
        log.info("bot.start", mode="polling")
        await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

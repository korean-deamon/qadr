"""Email delivery: SMTP (Mailpit in dev, real relay in prod), console, or in-memory (tests)."""

import asyncio
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

import structlog

from app.core.config import settings

log = structlog.get_logger()


@dataclass
class SentEmail:
    to: str
    subject: str
    body: str


OUTBOX: list[SentEmail] = []  # memory provider (tests)


def _send_smtp(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.email_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.email_api_key:
            smtp.starttls()
            smtp.login("apikey", settings.email_api_key)
        smtp.send_message(msg)


async def send_email(to: str, subject: str, body: str) -> None:
    provider = settings.email_provider
    if provider == "memory":
        OUTBOX.append(SentEmail(to, subject, body))
    elif provider == "console":
        log.info("email.console", to=to, subject=subject, body=body)
    else:
        await asyncio.to_thread(_send_smtp, to, subject, body)
    log.info("email.sent", to=to, subject=subject, provider=provider)

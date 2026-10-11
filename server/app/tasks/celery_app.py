"""Celery worker + single Beat scheduler (SPEC §14). Tasks are idempotent, retried
with bounded exponential backoff and have time limits."""

from celery import Celery

from app.core.config import settings
from app.core.logging import setup_logging

celery = Celery("qadr", broker=settings.celery_broker_url, include=["app.tasks.tasks"])
celery.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=120,
    task_soft_time_limit=90,
    task_ignore_result=True,
    task_always_eager=settings.celery_eager,
    broker_connection_retry_on_startup=True,
    timezone="Asia/Tashkent",
    beat_schedule={
        "dispatch-outbox": {"task": "qadr.dispatch_outbox", "schedule": 10.0},
        "expire-requests": {"task": "qadr.expire_requests", "schedule": 300.0},
        "return-reminders": {"task": "qadr.return_reminders", "schedule": 1800.0},
        "cleanup": {"task": "qadr.cleanup", "schedule": 6 * 3600.0},
    },
)
setup_logging()

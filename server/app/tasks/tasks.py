from app.tasks import delivery, jobs
from app.tasks.celery_app import celery
from app.tasks.runtime import run

RETRY = {
    "autoretry_for": (Exception,),
    "retry_backoff": True,
    "retry_backoff_max": 600,
    "max_retries": 5,
    "retry_jitter": True,
}


@celery.task(name="qadr.dispatch_outbox", **RETRY)
def dispatch_outbox() -> int:
    return run(delivery.process_outbox)


@celery.task(name="qadr.expire_requests", **RETRY)
def expire_requests() -> int:
    return run(jobs.expire_requests)


@celery.task(name="qadr.return_reminders", **RETRY)
def return_reminders() -> int:
    return run(jobs.return_reminders)


@celery.task(name="qadr.cleanup", **RETRY)
def cleanup() -> None:
    run(jobs.cleanup)

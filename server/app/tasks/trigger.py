"""Kick the outbox right after a commit for low latency (Beat also sweeps every 10 s)."""

import structlog

log = structlog.get_logger()


def kick_outbox() -> None:
    try:
        from app.tasks.tasks import dispatch_outbox

        dispatch_outbox.apply_async(retry=False, ignore_result=True)
    except Exception as exc:  # broker down: Beat will pick it up
        log.warning("outbox.kick_failed", error=str(exc)[:200])

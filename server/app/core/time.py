from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

TASHKENT = ZoneInfo("Asia/Tashkent")


def now_utc() -> datetime:
    return datetime.now(UTC)


def today_tashkent() -> date:
    """Calendar day in Uzbekistan: booking rules are evaluated in local time."""
    return datetime.now(TASHKENT).date()

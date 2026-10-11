from starlette.requests import Request

from app.core import rate_limit
from app.core.config import settings


def make(xff: str | None) -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff else []
    return Request({"type": "http", "headers": headers, "client": ("10.0.0.9", 1234)})


def test_forwarded_for_is_ignored_without_trusted_proxies(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(settings, "trusted_proxy_hops", 0)
    assert rate_limit.client_ip(make("1.2.3.4")) == "10.0.0.9"


def test_spoofed_left_entries_are_ignored_behind_one_proxy(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(settings, "trusted_proxy_hops", 1)
    # the client sent "1.1.1.1"; Caddy appended the real address
    assert rate_limit.client_ip(make("1.1.1.1, 203.0.113.7")) == "203.0.113.7"
    assert rate_limit.client_ip(make(None)) == "10.0.0.9"

"""Production must refuse to start with an insecure or half-configured setup."""

import pytest

from app.core.config import INSECURE_SECRET_KEY, Settings

# Explicit kwargs win over env vars and the dotenv file is disabled, so these
# constructions are deterministic regardless of the ambient test environment.
BASE = dict(_env_file=None, secret_key="a" * 40, cookie_secure=True)


def test_development_allows_the_insecure_default() -> None:
    s = Settings(_env_file=None, app_env="development", secret_key=INSECURE_SECRET_KEY, cookie_secure=False)
    assert s.secret_key == INSECURE_SECRET_KEY


def test_production_allows_a_real_secret() -> None:
    s = Settings(**BASE, app_env="production")  # type: ignore[arg-type]
    assert s.is_production


def test_production_rejects_the_insecure_default_secret() -> None:
    with pytest.raises(ValueError, match="SECRET_KEY is still the insecure default"):
        Settings(_env_file=None, app_env="production", secret_key=INSECURE_SECRET_KEY, cookie_secure=True)


def test_production_requires_cookie_secure() -> None:
    with pytest.raises(ValueError, match="COOKIE_SECURE must be true"):
        Settings(_env_file=None, app_env="production", secret_key="a" * 40, cookie_secure=False)


def test_production_webhook_mode_requires_secret_and_https_url() -> None:
    with pytest.raises(ValueError, match="TELEGRAM_WEBHOOK_SECRET is required"):
        Settings(**BASE, app_env="production", telegram_mode="webhook")  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="TELEGRAM_WEBHOOK_URL must be an https"):
        Settings(
            **BASE,  # type: ignore[arg-type]
            app_env="production",
            telegram_mode="webhook",
            telegram_webhook_secret="x" * 20,
            telegram_webhook_url="http://insecure.example",
        )
    s = Settings(
        **BASE,  # type: ignore[arg-type]
        app_env="production",
        telegram_mode="webhook",
        telegram_webhook_secret="x" * 20,
        telegram_webhook_url="https://qadr.example.com",
    )
    assert s.telegram_mode == "webhook"


def test_production_polling_mode_does_not_need_webhook_fields() -> None:
    s = Settings(**BASE, app_env="production", telegram_mode="polling")  # type: ignore[arg-type]
    assert s.telegram_mode == "polling"

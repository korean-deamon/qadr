"""Application settings, loaded from the environment (see .env.example)."""

from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_SECRET_KEY = "dev-insecure-secret-change-me"  # noqa: S105 (sentinel, not a real secret)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    app_name: str = "Qadr"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://qadr:qadr@localhost:5433/qadr"
    redis_url: str = "redis://localhost:6380/0"
    celery_broker_url: str = "redis://localhost:6380/1"

    secret_key: str = Field(default=INSECURE_SECRET_KEY, min_length=16)
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 30

    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    cookie_domain: str | None = None

    # Media (storage interface: Cloudinary when configured, local disk otherwise)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    media_root: str = "./media"
    media_url: str = "/api/v1/media"

    default_locale: str = "uz"
    supported_locales: str = "uz,ru,en"

    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_mode: Literal["polling", "webhook"] = "polling"
    telegram_webhook_url: str = ""
    telegram_webhook_secret: str = ""
    telegram_link_token_ttl_minutes: int = 10

    # Multiplies every rate-limit budget (1 in production; higher locally so repeated
    # e2e runs from one IP don't lock you out). Never set below 1.
    rate_limit_multiplier: int = Field(default=1, ge=1, le=100)
    # Reverse proxies in front of the API whose X-Forwarded-For we trust (0 = none)
    trusted_proxy_hops: int = Field(default=0, ge=0, le=5)

    # Run Celery tasks inline (tests / single-process dev)
    celery_eager: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def locales(self) -> list[str]:
        return [loc.strip() for loc in self.supported_locales.split(",") if loc.strip()]

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret)

    @property
    def telegram_enabled(self) -> bool:
        return bool(self.telegram_bot_token and self.telegram_bot_username)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @model_validator(mode="after")
    def _guard_production(self) -> Self:
        """Fail fast (every process: api, bot, worker, beat, migrate) rather than
        silently serve production traffic with a known-insecure or half-configured
        setup. A misconfigured deploy should crash-loop and show up in `docker compose
        ps`/logs immediately, not leak a forgeable session signing key."""
        if not self.is_production:
            return self
        problems = []
        if self.secret_key == INSECURE_SECRET_KEY:
            problems.append("SECRET_KEY is still the insecure default — set a real random value")
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE must be true in production (cookies would be sent over plain HTTP)")
        if self.telegram_mode == "webhook":
            if not self.telegram_webhook_secret:
                problems.append("TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_MODE=webhook")
            if not self.telegram_webhook_url.startswith("https://"):
                problems.append("TELEGRAM_WEBHOOK_URL must be an https:// URL when TELEGRAM_MODE=webhook")
        if problems:
            raise ValueError("Refusing to start with APP_ENV=production:\n- " + "\n- ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

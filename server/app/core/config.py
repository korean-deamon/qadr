"""Application settings, loaded from the environment (see .env.example)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    app_name: str = "Qadr"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://qadr:qadr@localhost:5433/qadr"
    redis_url: str = "redis://localhost:6380/0"
    celery_broker_url: str = "redis://localhost:6380/1"

    secret_key: str = Field(default="dev-insecure-secret-change-me", min_length=16)
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

    # Email: smtp (Mailpit in dev), console (prints), or memory (tests)
    email_provider: Literal["smtp", "console", "memory"] = "console"
    email_api_key: str = ""
    email_from: str = "Qadr <no-reply@qadr.uz>"
    smtp_host: str = "localhost"
    smtp_port: int = 1025

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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

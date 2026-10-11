import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, Timestamps, UUIDPk


class User(UUIDPk, Timestamps, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)  # normalized lower-case
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(80))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    area: Mapped[str | None] = mapped_column(String(80))
    phone: Mapped[str | None] = mapped_column(String(20))
    phone_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, unique=True)
    telegram_username: Mapped[str | None] = mapped_column(String(64))
    telegram_linked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    telegram_blocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    telegram_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    telegram_prompt_dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    preferred_locale: Mapped[str] = mapped_column(String(5), default="uz", server_default="uz")
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    restricted_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    restriction_reason: Mapped[str | None] = mapped_column(String(500))
    banned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ban_reason: Mapped[str | None] = mapped_column(String(500))

    __table_args__ = (
        # one verified phone per account
        Index("uq_users_verified_phone", "phone", unique=True, postgresql_where="phone_verified_at IS NOT NULL"),
        CheckConstraint("preferred_locale IN ('uz','ru','en')", name="locale"),
    )

    def is_restricted(self, now: datetime) -> bool:
        return self.restricted_until is not None and self.restricted_until > now


class EmailOtp(UUIDPk, Base):
    """One-time codes, regardless of delivery channel (email or Telegram)."""

    __tablename__ = "email_otps"
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    code_hash: Mapped[str] = mapped_column(String(128))
    purpose: Mapped[str] = mapped_column(String(16))
    channel: Mapped[str] = mapped_column(String(16), default="email", server_default="email")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("purpose IN ('verify','reset')", name="purpose"),
        CheckConstraint("channel IN ('email','telegram')", name="channel"),
    )


class RefreshToken(UUIDPk, Base):
    __tablename__ = "refresh_tokens"
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(128), unique=True)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    auth_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    replaced_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

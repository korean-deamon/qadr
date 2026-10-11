import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, Timestamps, UUIDPk

LISTING_STATUSES = ("active", "hidden_by_owner", "hidden_by_admin", "removed")
CONDITIONS = ("new", "good", "used")


class Listing(UUIDPk, Timestamps, Base):
    __tablename__ = "listings"
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    condition: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(20), default="active", server_default="active", index=True)
    borrowing_terms: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    max_days: Mapped[int] = mapped_column(Integer, default=7, server_default="7")
    location_area: Mapped[str] = mapped_column(String(80))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    moderation_reason: Mapped[str | None] = mapped_column(String(500))

    images: Mapped[list["ListingImage"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan", order_by="ListingImage.position", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint(f"status IN {LISTING_STATUSES}", name="status"),
        CheckConstraint(f"condition IN {CONDITIONS}", name="condition"),
        CheckConstraint("max_days BETWEEN 1 AND 30", name="max_days"),
        # full-text search GIN index is created in the migration (expression index)
    )


class ListingImage(UUIDPk, Base):
    __tablename__ = "listing_images"
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), index=True
    )
    cloudinary_public_id: Mapped[str] = mapped_column(String(300))  # storage key (Cloudinary id or local path)
    url: Mapped[str] = mapped_column(String(500))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    listing: Mapped[Listing] = relationship(back_populates="images")

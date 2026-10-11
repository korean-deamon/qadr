import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, Timestamps, UUIDPk

REQUEST_STATUSES = ("pending", "approved", "rejected", "cancelled", "expired")


class BorrowRequest(UUIDPk, Timestamps, Base):
    __tablename__ = "borrow_requests"
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), index=True
    )
    borrower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    message: Mapped[str | None] = mapped_column(Text)
    terms_accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(12), default="pending", server_default="pending", index=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(f"status IN {REQUEST_STATUSES}", name="status"),
        CheckConstraint("end_date >= start_date", name="dates"),
        Index("ix_borrow_requests_pending", "listing_id", postgresql_where="status = 'pending'"),
    )

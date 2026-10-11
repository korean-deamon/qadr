import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, Timestamps, UUIDPk

LOAN_STATUSES = ("approved", "active", "returned", "cancelled")


class Loan(UUIDPk, Timestamps, Base):
    __tablename__ = "loans"
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("borrow_requests.id", ondelete="CASCADE"), unique=True
    )
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), index=True
    )
    borrower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    borrower_returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(10), default="approved", server_default="approved", index=True)

    __table_args__ = (
        CheckConstraint(f"status IN {LOAN_STATUSES}", name="status"),
        CheckConstraint("end_date >= start_date", name="dates"),
        # The database is the final authority on conflicts (SPEC §10):
        # no two approved/active loans of one listing may overlap (inclusive dates).
        ExcludeConstraint(
            ("listing_id", "="),
            (text("daterange(start_date, end_date, '[]')"), "&&"),
            name="no_overlapping_loans",
            using="gist",
            where="status IN ('approved', 'active')",
        ),
    )

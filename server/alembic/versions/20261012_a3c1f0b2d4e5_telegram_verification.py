"""Telegram replaces email verification (SPEC §11 v3.3).

email_verified_at becomes verified_at (first Telegram link). The optional-linking
prompt is gone, so telegram_prompt_dismissed_at is dropped.

Revision ID: a3c1f0b2d4e5
Revises: 79d35a225d09
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a3c1f0b2d4e5"
down_revision: str | None = "79d35a225d09"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Existing email-verified accounts keep their "verified" status, so the
    # unverified cleanup never deletes them.
    op.alter_column("users", "email_verified_at", new_column_name="verified_at")
    op.drop_column("users", "telegram_prompt_dismissed_at")
    op.create_index(
        "ix_users_unverified_created",
        "users",
        ["created_at"],
        postgresql_where=sa.text("verified_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_users_unverified_created", table_name="users")
    op.add_column("users", sa.Column("telegram_prompt_dismissed_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("users", "verified_at", new_column_name="email_verified_at")

"""Google sign-in: password_hash becomes nullable (SPEC §11 v3.4).

Accounts created via Google's ID-token sign-in never set a password unless the
user later adds one (e.g. through password reset once Telegram is linked).

Revision ID: b7e2d9f1a6c3
Revises: a3c1f0b2d4e5
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b7e2d9f1a6c3"
down_revision: str | None = "a3c1f0b2d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    # Existing Google-only accounts (password_hash IS NULL) would violate NOT NULL;
    # give them an unusable placeholder hash so the downgrade doesn't fail outright.
    op.execute("UPDATE users SET password_hash = 'google-only-account-no-password' WHERE password_hash IS NULL")
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)

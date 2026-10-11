import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, UUIDPk


class Category(UUIDPk, Base):
    __tablename__ = "categories"
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    icon: Mapped[str | None] = mapped_column(String(40))
    image: Mapped[str | None] = mapped_column(String(300))
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    translations: Mapped[list["CategoryTranslation"]] = relationship(
        back_populates="category", cascade="all, delete-orphan", lazy="selectin"
    )


class CategoryTranslation(Base):
    __tablename__ = "category_translations"
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[str] = mapped_column(String(5), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[Category] = relationship(back_populates="translations")

    __table_args__ = (UniqueConstraint("category_id", "locale", name="uq_category_translations_locale"),)

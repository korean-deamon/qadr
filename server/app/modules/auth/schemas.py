import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=80)
    locale: Literal["uz", "ru", "en"] = "uz"

    @field_validator("display_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("too short")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class VerifyIn(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class ResendIn(BaseModel):
    email: EmailStr
    purpose: Literal["verify", "reset"] = "verify"


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")
    password: str = Field(min_length=8, max_length=128)


class MeOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    avatar_url: str | None
    area: str | None
    preferred_locale: str
    email_verified: bool
    phone: str | None
    phone_verified: bool
    telegram_linked: bool
    telegram_username: str | None
    telegram_notifications: bool
    show_telegram_prompt: bool
    is_admin: bool
    restricted_until: datetime | None
    created_at: datetime

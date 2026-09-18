from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator


class UserCreate(BaseModel):
    login: str = Field(min_length=3, max_length=64)
    password: SecretStr = Field(min_length=10, max_length=256)
    surname: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    gender: Literal["male", "female", "unspecified"] = "unspecified"
    jobtitle: str = Field(min_length=1, max_length=150)
    mobile_number: str | None = Field(default=None, max_length=32)
    email: EmailStr

    @field_validator("login")
    @classmethod
    def normalize_login(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("surname", "name", "jobtitle")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field must not be blank")
        return value

    @field_validator("middle_name", "mobile_number")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class LoginRequest(BaseModel):
    # May contain either LOGIN or EMAIL.
    identifier: str = Field(min_length=3, max_length=320)
    password: SecretStr = Field(min_length=1, max_length=256)

    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, value: str) -> str:
        return value.strip().lower()


class UserResponse(BaseModel):
    id: int
    login: str
    surname: str
    name: str
    middle_name: str | None = None
    gender: str
    jobtitle: str
    mobile_number: str | None = None
    email: str
    is_active: bool
    two_factor_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserResponse

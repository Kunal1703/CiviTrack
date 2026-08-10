"""Auth contracts (gateway ↔ frontend)."""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    full_name: str = Field(min_length=1, max_length=120)
    # Optional invite code. A correct code (matching ADMIN_SIGNUP_CODE) provisions
    # an admin; otherwise the account is always a citizen. Role is NEVER taken
    # directly from the client.
    admin_code: str | None = Field(default=None, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    created_at: dt.datetime

"""Password hashing (argon2) and JWT issue/verify.

Secrets never leave this module: we store only argon2 hashes, and tokens are
signed with the HS256 secret from settings. Nothing here logs a password or a
raw token.
"""

from __future__ import annotations

import datetime as dt
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error, VerifyMismatchError

from app.core.config import get_settings

_ph = PasswordHasher()

TokenKind = Literal["access", "refresh"]


# ── Passwords ──────────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time-ish verify; returns False on any mismatch/format error."""
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, Argon2Error, Exception):  # noqa: BLE001
        return False


def needs_rehash(hashed: str) -> bool:
    try:
        return _ph.check_needs_rehash(hashed)
    except Exception:  # noqa: BLE001
        return False


# ── JWT ────────────────────────────────────────────────────────────────────
def create_token(*, user_id: int, role: str, kind: TokenKind) -> str:
    settings = get_settings()
    now = dt.datetime.now(tz=dt.timezone.utc)
    if kind == "access":
        expires = now + dt.timedelta(minutes=settings.access_token_minutes)
    else:
        expires = now + dt.timedelta(days=settings.refresh_token_days)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "type": kind,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, expected_kind: TokenKind | None = None) -> dict[str, Any]:
    """Decode & validate a JWT. Raises jwt.InvalidTokenError on any problem."""
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if expected_kind is not None and payload.get("type") != expected_kind:
        raise jwt.InvalidTokenError(f"expected {expected_kind} token")
    return payload

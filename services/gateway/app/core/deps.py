"""Auth dependencies: resolve the current user from the access cookie and
enforce roles server-side.

These are the authority for authorization. The frontend also guards routes, but
that is only convenience — every protected endpoint depends on one of these, so a
citizen cannot reach an admin action by manipulating frontend state.
"""

from __future__ import annotations

from typing import Any, Callable

import jwt
import psycopg
from fastapi import Depends, HTTPException, Request, status

from app.core.db import get_db
from app.core.security import decode_token

ACCESS_COOKIE = "ct_access"
REFRESH_COOKIE = "ct_refresh"

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    request: Request, conn: psycopg.Connection = Depends(get_db)
) -> dict[str, Any]:
    """Return the authenticated user row, or raise 401."""
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise _CREDENTIALS_ERROR
    try:
        payload = decode_token(token, expected_kind="access")
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise _CREDENTIALS_ERROR

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, full_name, role, created_at FROM app.users WHERE id = %s",
            (user_id,),
        )
        row = cur.fetchone()
    if row is None:
        raise _CREDENTIALS_ERROR
    return {
        "id": row[0],
        "email": row[1],
        "full_name": row[2],
        "role": row[3],
        "created_at": row[4],
    }


def require_role(*roles: str) -> Callable[..., dict[str, Any]]:
    """Dependency factory: require the current user to hold one of `roles`."""

    def _dep(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="insufficient permissions",
            )
        return user

    return _dep


# Convenience aliases.
require_admin = require_role("admin")

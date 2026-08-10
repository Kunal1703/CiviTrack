"""Authentication endpoints — register, login, refresh, logout, me.

Tokens are delivered as httpOnly cookies (access + refresh) so JavaScript cannot
read them (XSS token-theft mitigation). Roles are assigned server-side and
persisted in Postgres; the client can never set its own role.
"""

from __future__ import annotations

import hmac
from typing import Any

import jwt
import psycopg
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.deps import ACCESS_COOKIE, REFRESH_COOKIE, get_current_user
from app.core.logging import get_logger
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
logger = get_logger("gateway.auth")


def _set_auth_cookies(response: Response, settings: Settings, user_id: int, role: str) -> None:
    access = create_token(user_id=user_id, role=role, kind="access")
    refresh = create_token(user_id=user_id, role=role, kind="refresh")
    common = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "domain": settings.cookie_domain,
        "path": "/",
    }
    response.set_cookie(
        ACCESS_COOKIE, access, max_age=settings.access_token_minutes * 60, **common
    )
    response.set_cookie(
        REFRESH_COOKIE, refresh, max_age=settings.refresh_token_days * 86400, **common
    )


def _clear_auth_cookies(response: Response, settings: Settings) -> None:
    for name in (ACCESS_COOKIE, REFRESH_COOKIE):
        response.delete_cookie(
            name, path="/", domain=settings.cookie_domain, samesite=settings.cookie_samesite
        )


def _user_out(row: tuple[Any, ...]) -> UserOut:
    return UserOut(id=row[0], email=row[1], full_name=row[2], role=row[3], created_at=row[4])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    conn: psycopg.Connection = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> UserOut:
    email = payload.email.strip().lower()

    # Determine role server-side. Admin only via a correct, configured invite code.
    role = "citizen"
    if payload.admin_code:
        if settings.admin_signup_code and hmac.compare_digest(
            payload.admin_code, settings.admin_signup_code
        ):
            role = "admin"
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invalid admin code")

    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM app.users WHERE lower(email) = %s", (email,))
        if cur.fetchone() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email already registered")
        cur.execute(
            """
            INSERT INTO app.users (email, password_hash, full_name, role)
            VALUES (%s, %s, %s, %s)
            RETURNING id, email, full_name, role, created_at
            """,
            (email, hash_password(payload.password), payload.full_name.strip(), role),
        )
        row = cur.fetchone()

    logger.info("registered user id=%s role=%s", row[0], row[3])
    _set_auth_cookies(response, settings, user_id=row[0], role=row[3])
    return _user_out(row)


@router.post("/login", response_model=UserOut)
def login(
    payload: LoginRequest,
    response: Response,
    conn: psycopg.Connection = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> UserOut:
    email = payload.email.strip().lower()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, full_name, role, created_at, password_hash "
            "FROM app.users WHERE lower(email) = %s",
            (email,),
        )
        row = cur.fetchone()

    # Same error whether the email is unknown or the password is wrong.
    if row is None or not verify_password(payload.password, row[5]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")

    _set_auth_cookies(response, settings, user_id=row[0], role=row[3])
    return _user_out(row[:5])


@router.post("/refresh", response_model=UserOut)
def refresh(
    request: Request,
    response: Response,
    conn: psycopg.Connection = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> UserOut:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not authenticated")
    try:
        payload = decode_token(token, expected_kind="refresh")
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid refresh token")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, full_name, role, created_at FROM app.users WHERE id = %s",
            (user_id,),
        )
        row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user no longer exists")

    # Re-issue with the CURRENT role from the DB (role changes take effect on refresh).
    _set_auth_cookies(response, settings, user_id=row[0], role=row[3])
    return _user_out(row)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, settings: Settings = Depends(get_settings)) -> Response:
    _clear_auth_cookies(response, settings)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
def me(user: dict[str, Any] = Depends(get_current_user)) -> UserOut:
    return UserOut(**user)

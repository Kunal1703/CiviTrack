"""PostgreSQL connection pool for the gateway.

Until now the gateway was stateless (it only proxied to ml_service). The
application layer (auth, complaints) needs real DB access, so we open a small
psycopg connection pool at startup and hand out connections as a FastAPI
dependency. Connections are returned to the pool automatically; the pool commits
on clean exit and rolls back on exception.
"""

from __future__ import annotations

from collections.abc import Iterator

import psycopg
from psycopg_pool import ConnectionPool

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("gateway.db")

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    """Return the process-wide connection pool, opening it on first use."""
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=1,
            max_size=10,
            max_idle=60,
            open=True,
            name="gateway-pool",
        )
        logger.info("Opened gateway DB pool → %s:%s/%s",
                    settings.postgres_host, settings.postgres_port, settings.postgres_db)
    return _pool


def close_pool() -> None:
    """Close the pool (called on app shutdown)."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def get_db() -> Iterator[psycopg.Connection]:
    """FastAPI dependency yielding a pooled connection.

    The `with pool.connection()` block commits on success and rolls back if the
    handler raises, then returns the connection to the pool.
    """
    pool = get_pool()
    with pool.connection() as conn:
        yield conn

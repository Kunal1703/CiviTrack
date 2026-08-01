"""System endpoints: liveness, database readiness, and non-secret config.

These are the only endpoints in M0. Business endpoints arrive in later
milestones (see docs/BLUEPRINT.md §15).
"""

from __future__ import annotations

import psycopg
from fastapi import APIRouter, Depends, Response, status

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.schemas.system import ConfigResponse, DBHealthResponse, HealthResponse

router = APIRouter(tags=["system"])
logger = get_logger("gateway.system")


@router.get("/health", response_model=HealthResponse)
def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Liveness probe. Does not touch external dependencies."""
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )


@router.get("/health/db", response_model=DBHealthResponse)
def health_db(
    response: Response, settings: Settings = Depends(get_settings)
) -> DBHealthResponse:
    """Readiness probe: connect to Postgres and report extension versions.

    Returns 503 when the database is unreachable so orchestrators can gate
    traffic correctly.
    """
    try:
        with psycopg.connect(settings.database_url, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT extname, extversion FROM pg_extension "
                    "WHERE extname IN ('postgis', 'vector')"
                )
                versions = {name: ver for name, ver in cur.fetchall()}
        return DBHealthResponse(
            status="ok",
            database=settings.postgres_db,
            postgis=versions.get("postgis"),
            pgvector=versions.get("vector"),
        )
    except Exception as exc:  # noqa: BLE001 — report any failure as not-ready
        logger.warning("Database readiness check failed: %s", exc)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return DBHealthResponse(
            status="error", database=settings.postgres_db, detail=str(exc)
        )


@router.get("/config", response_model=ConfigResponse)
def config(settings: Settings = Depends(get_settings)) -> ConfigResponse:
    """Return non-secret runtime configuration (no credentials)."""
    return ConfigResponse(
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        api_prefix=settings.api_prefix,
        log_level=settings.log_level,
        database_host=settings.postgres_host,
        database_port=settings.postgres_port,
        database_name=settings.postgres_db,
    )

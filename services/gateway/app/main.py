"""FastAPI application factory.

M0 scope: system endpoints only (health, readiness, config). No auth, no ML,
no business routes — those are added in later milestones.
"""

from __future__ import annotations

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.routers import system


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.is_production)
    logger = get_logger("gateway")

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="CiviTrack AI — API Gateway (M0 foundation: system endpoints only).",
    )

    app.include_router(system.router)

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
        }

    logger.info(
        "Gateway initialized (environment=%s, db=%s:%s/%s)",
        settings.environment,
        settings.postgres_host,
        settings.postgres_port,
        settings.postgres_db,
    )
    return app


app = create_app()

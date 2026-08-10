"""FastAPI application factory.

Routes: system (health/config), classify (M1 proxy), semantic (M3 proxy), and the
application layer (auth + complaints) added in the product/UX upgrade. The gateway
now also owns a Postgres connection pool for the application tables (app.*).
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.db import close_pool, get_pool
from app.core.logging import configure_logging, get_logger
from app.routers import admin, auth, classify, complaints, resolution, semantic, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Open the DB pool eagerly so the first request doesn't pay the cost, and so a
    # misconfigured DSN fails fast at startup.
    try:
        get_pool()
    except Exception as exc:  # noqa: BLE001 — log, but don't block boot in dev
        get_logger("gateway").warning("DB pool not ready at startup: %s", exc)
    yield
    close_pool()


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.is_production)
    logger = get_logger("gateway")

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="CiviTrack AI — API Gateway (system, classify, semantic, auth, complaints).",
        lifespan=lifespan,
    )

    app.include_router(system.router)
    app.include_router(classify.router)
    app.include_router(semantic.router)
    app.include_router(auth.router)
    app.include_router(complaints.router)
    app.include_router(admin.router)
    app.include_router(resolution.router)

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

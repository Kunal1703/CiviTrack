"""ML service application factory.

Loads the classifier (M1) and the semantic layer (M3: embedder + DB pool) at
startup. Any component that fails to load degrades gracefully — its endpoints
return 503 — so a missing model or database never crashes the process.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.routers import classify, semantic

logger = get_logger("ml_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Classifier (M1)
    try:
        from app.predictor import Classifier

        app.state.classifier = Classifier(settings.model_dir, settings.max_length)
    except Exception as exc:  # noqa: BLE001
        app.state.classifier = None
        logger.error("Classifier load failed (%s): %s", settings.model_dir, exc)

    # Semantic embedder (M3)
    try:
        from app.embedder import Embedder

        app.state.embedder = Embedder(settings.embedding_model)
        logger.info("Embedder loaded: %s (dim=%s)", settings.embedding_model, app.state.embedder.dim)
    except Exception as exc:  # noqa: BLE001
        app.state.embedder = None
        logger.error("Embedder load failed (%s): %s", settings.embedding_model, exc)

    # DB pool for vector search (M3)
    try:
        from psycopg_pool import ConnectionPool

        app.state.db_pool = ConnectionPool(settings.database_dsn, min_size=1, max_size=5, open=True)
    except Exception as exc:  # noqa: BLE001
        app.state.db_pool = None
        logger.error("DB pool init failed: %s", exc)

    yield

    if getattr(app.state, "db_pool", None) is not None:
        app.state.db_pool.close()


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.environment.lower() == "production")

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="CiviTrack AI — classification + semantic inference.",
        lifespan=lifespan,
    )
    app.include_router(classify.router)
    app.include_router(semantic.router)

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {"service": settings.app_name, "version": settings.app_version, "docs": "/docs"}

    return app


app = create_app()

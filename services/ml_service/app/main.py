"""ML service application factory.

The model is loaded once during startup (lifespan). If it fails to load, the
service still starts but reports `degraded`/`model_loaded=false` and `/classify`
returns 503 — so a missing model never crashes the process.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.routers import classify

logger = get_logger("ml_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    try:
        from app.predictor import Classifier

        app.state.classifier = Classifier(settings.model_dir, settings.max_length)
    except Exception as exc:  # noqa: BLE001
        app.state.classifier = None
        logger.error("Model load failed (%s): %s", settings.model_dir, exc)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.environment.lower() == "production")

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="CiviTrack AI — complaint classification inference.",
        lifespan=lifespan,
    )
    app.include_router(classify.router)

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {"service": settings.app_name, "version": settings.app_version, "docs": "/docs"}

    return app


app = create_app()

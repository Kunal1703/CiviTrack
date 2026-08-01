"""Response models for system endpoints (health, readiness, config)."""

from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Liveness — the process is up and serving."""

    status: str
    service: str
    version: str
    environment: str


class DBHealthResponse(BaseModel):
    """Readiness — the database is reachable and extensions are present."""

    status: str
    database: str
    postgis: str | None = None
    pgvector: str | None = None
    detail: str | None = None


class ConfigResponse(BaseModel):
    """Non-secret runtime configuration.

    Deliberately excludes credentials — no password/DSN is ever returned.
    """

    app_name: str
    version: str
    environment: str
    api_prefix: str
    log_level: str
    database_host: str
    database_port: int
    database_name: str

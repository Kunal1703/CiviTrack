"""Application configuration.

Settings are sourced from environment variables (and an optional ``.env`` file),
never hardcoded. Secrets (e.g. the database password) are held here but are
deliberately *not* exposed by the ``/config`` endpoint — see ``schemas.system``.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings, populated from the environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──
    app_name: str = "CiviTrack AI Gateway"
    app_version: str = "0.1.0"
    environment: str = "development"  # development | staging | production
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"

    # ── PostgreSQL ──
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "civitrack"
    postgres_password: str = "civitrack_dev_pw"
    postgres_db: str = "civitrack"

    # ── ML service (downstream) ──
    ml_service_url: str = "http://localhost:8001"
    ml_service_timeout: float = 10.0

    @property
    def database_url(self) -> str:
        """SQLAlchemy/psycopg-style DSN. Contains the password — never log this."""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Return a cached ``Settings`` instance (safe as a FastAPI dependency)."""
    return Settings()

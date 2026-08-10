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

    # ── Auth / sessions ──
    # HS256 secret for signing JWTs. MUST be overridden in any non-dev environment
    # (compose passes JWT_SECRET). The default exists only so local dev boots.
    jwt_secret: str = "dev-insecure-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    # Cookie flags: Secure requires HTTPS, so it stays off in local dev.
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: str | None = None
    # Optional invite code that lets a registration create an admin account.
    # Empty string disables self-service admin signup entirely.
    admin_signup_code: str = ""

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

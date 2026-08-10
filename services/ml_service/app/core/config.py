"""ML service configuration (environment-driven)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_name: str = "CiviTrack AI ML Service"
    app_version: str = "0.2.0"
    environment: str = "development"
    log_level: str = "INFO"

    # ── Classifier (M1) ──
    model_dir: str = "./model"
    model_version: str = "classifier-v1.0"
    max_length: int = 32
    top_k: int = 3

    # ── Resolution-time regressor (M4) ──
    resolution_model_dir: str = "./resolution_model"
    resolution_version: str = "resolution-v1"

    # ── Semantic (M3) ──
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_version: str = "v1"
    dup_threshold: float = 0.59       # natural-language operating point (precision 1.0)
    dup_radius_m: float = 150.0

    # PostgreSQL (vector search). Defaults target local host port; compose overrides.
    postgres_host: str = "localhost"
    postgres_port: int = 5433
    postgres_user: str = "civitrack"
    postgres_password: str = "civitrack_dev_pw"
    postgres_db: str = "civitrack"

    @property
    def database_dsn(self) -> str:
        return (
            f"host={self.postgres_host} port={self.postgres_port} dbname={self.postgres_db} "
            f"user={self.postgres_user} password={self.postgres_password}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

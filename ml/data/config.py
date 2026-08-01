"""Pipeline configuration.

Everything tunable lives here and is environment-overridable — no magic numbers
scattered through the code. The development dataset is deliberately *bounded*
(``fetch_limit``) so the pipeline runs in minutes on a laptop; the full NYC 311
history (30M+ rows) is out of scope for M0.
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repository root = ml/data/config.py → parents[2]
REPO_ROOT = Path(__file__).resolve().parents[2]


class PipelineConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # ── Socrata / NYC 311 ──
    # Dataset: "311 Service Requests from 2010 to Present" (id: erm2-nwe9)
    socrata_domain: str = "data.cityofnewyork.us"
    dataset_id: str = "erm2-nwe9"
    app_token: str | None = None  # optional; raises rate limits if provided

    # ── Bounded development dataset ──
    fetch_limit: int = 50_000  # total rows to pull
    page_size: int = 5_000  # rows per API request
    since_date: str = "2024-01-01T00:00:00"  # lower bound on created_date
    order: str = "created_date ASC"  # ASC → older (mostly-closed) rows first
    request_timeout: int = 60

    # ── PostgreSQL ──
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "civitrack"
    postgres_password: str = "civitrack_dev_pw"
    postgres_db: str = "civitrack"
    target_schema: str = "silver"
    target_table: str = "complaints_311"

    @property
    def resource_url(self) -> str:
        return f"https://{self.socrata_domain}/resource/{self.dataset_id}.json"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Paths (data/ is git-ignored, DVC territory) ──
    @property
    def data_dir(self) -> Path:
        return REPO_ROOT / "data"

    @property
    def bronze_dir(self) -> Path:
        return self.data_dir / "bronze"

    @property
    def silver_dir(self) -> Path:
        return self.data_dir / "silver"

    @property
    def reports_dir(self) -> Path:
        return REPO_ROOT / "ml" / "reports"

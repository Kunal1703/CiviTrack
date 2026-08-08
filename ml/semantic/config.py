"""Configuration for the semantic layer (env-overridable, no magic numbers)."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO = Path(__file__).resolve().parents[2]


class SemanticConfig(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # ── Data source (SWAP SEAM) ──
    silver_path: Path = REPO / "data" / "silver" / "nyc311_clean.parquet"
    source_column: str = "descriptor"

    # ── Embedding model ──
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384
    embedding_version: str = "v1"
    batch_size: int = 256
    normalize_embeddings: bool = True  # unit-norm → cosine == dot product

    # ── PostgreSQL (host-side; container mapped to 5433) ──
    postgres_host: str = "localhost"
    postgres_port: int = 5433
    postgres_user: str = "civitrack"
    postgres_password: str = "civitrack_dev_pw"
    postgres_db: str = "civitrack"
    pg_schema: str = "semantic"
    pg_table: str = "complaint_embeddings"

    # ── Duplicate spatial-temporal gate (defaults; threshold learned in eval) ──
    dup_radius_m: float = 150.0
    dup_time_hours: float = 72.0

    # ── MLflow ──
    experiment_name: str = "semantic-embeddings"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def mlflow_uri(self) -> str:
        d = REPO / "mlruns"
        d.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{(d / 'mlflow.db').resolve().as_posix()}"

    @property
    def eval_dir(self) -> Path:
        return REPO / "ml" / "semantic" / "evaluation" / "datasets"

    @property
    def reports_dir(self) -> Path:
        return REPO / "ml" / "semantic" / "reports"

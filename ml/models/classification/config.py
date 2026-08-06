"""Configuration for the M1 complaint classifier.

All tunables live here (no magic numbers in the pipeline). The fields marked
"SWAP SEAM" are what change if a richer free-text dataset later replaces the
descriptor-based training data.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

# ml/models/classification/config.py -> parents[3] == repo root
REPO = Path(__file__).resolve().parents[3]


@dataclass
class ClassifierConfig:
    # ── Data source (SWAP SEAM) ─────────────────────────────────
    silver_path: Path = REPO / "data" / "silver" / "nyc311_clean.parquet"
    text_column: str = "descriptor"          # ← swap to a free-text column later
    label_source_column: str = "complaint_type"
    taxonomy_path: Path = REPO / "ml" / "data" / "category_taxonomy.yaml"

    # ── Splits / labels ─────────────────────────────────────────
    gold_dir: Path = REPO / "data" / "gold"
    test_size: float = 0.15
    val_size: float = 0.15
    seed: int = 42
    min_category_support: int = 300           # rare categories -> Other

    # ── Stratified re-ingest (M1 training data) ─────────────────
    reingest_year: int = 2024
    reingest_rows_per_month: int = 17_000     # ~200k across 12 months

    # ── Baseline (TF-IDF + LogisticRegression) ──────────────────
    tfidf_max_features: int = 50_000
    tfidf_ngram_max: int = 2

    # ── Transformer (DistilBERT) ────────────────────────────────
    model_name: str = "distilbert-base-uncased"
    max_length: int = 32                      # descriptors are short
    # CPU-tractable defaults for local training. Scaling up (GPU / more data /
    # more epochs) is a pure config change — the code is unchanged.
    train_sample_cap: int | None = 6_000
    epochs: int = 2
    # DistilBERT CPU inference is slow; evaluate on a stratified test subset.
    eval_cap: int | None = 5_000
    batch_size: int = 32
    learning_rate: float = 5e-5

    # ── Artifacts / tracking ────────────────────────────────────
    mlflow_dir: Path = REPO / "mlruns"
    experiment_name: str = "complaint-classification"
    artifacts_dir: Path = REPO / "ml" / "models" / "classification" / "artifacts"
    reports_dir: Path = REPO / "ml" / "models" / "classification" / "reports"
    probe_path: Path = REPO / "ml" / "evaluation" / "probe_set.jsonl"

    @property
    def mlflow_uri(self) -> str:
        # MLflow 3.x removed the filesystem backend; use local SQLite (no server,
        # still file-based, and it enables the model registry for packaging).
        self.mlflow_dir.mkdir(parents=True, exist_ok=True)
        db = (self.mlflow_dir / "mlflow.db").resolve().as_posix()
        return f"sqlite:///{db}"

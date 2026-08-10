"""M4 configuration — paths, columns, split boundaries, hyperparameters."""

from __future__ import annotations

import os
from pathlib import Path

PKG = Path(__file__).resolve().parent
ARTIFACT_DIR = PKG / "artifacts"          # git-ignored trained models
REPORT_DIR = PKG / "reports"              # committed small metrics json

SEED = 42
TARGET = "resolution_hours"               # raw target (hours); we model log1p(TARGET)
MODEL_VERSION = "resolution-v1"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ── Time-based split on created_date (train ≤ Aug, val = Sep, test = Oct–Dec) ──
VAL_START = "2024-09-01"
TEST_START = "2024-10-01"

# ── Feature groups (leakage allow-list: everything here is known at report time) ──
CATEGORICAL = ["agency", "complaint_type", "descriptor", "borough", "incident_zip"]
GEO = ["latitude", "longitude"]
# Never features (post-hoc / target-derived). Asserted absent in features.transform.
LEAKAGE = {"closed_date", "resolution_hours", "status", "closed", "agency_name"}

# ── Quantiles: q50 is the point estimate; [q10, q90] is the 80% interval ──
QUANTILES = (0.1, 0.5, 0.9)

LGB_PARAMS = {
    "objective": "quantile",              # alpha set per-quantile at train time
    "learning_rate": 0.05,
    "num_leaves": 63,
    "min_child_samples": 80,
    "feature_fraction": 0.85,
    "bagging_fraction": 0.85,
    "bagging_freq": 1,
    "max_depth": -1,
    "verbose": -1,
    "seed": SEED,
}
N_ESTIMATORS = 1200
EARLY_STOPPING = 80


def db_dsn() -> dict:
    return dict(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5433")),
        dbname=os.getenv("POSTGRES_DB", "civitrack"),
        user=os.getenv("POSTGRES_USER", "civitrack"),
        password=os.getenv("POSTGRES_PASSWORD", "civitrack_dev_pw"),
    )

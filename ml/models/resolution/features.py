"""Feature engineering with a strict leakage allow-list.

All features are knowable at report time. Categoricals are ordinal-encoded with a
vocabulary fit on TRAIN only (unseen categories → -1), so the exact same encoding
can be reproduced at serving time. LightGBM is told which columns are categorical.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from . import config

NA = "__NA__"


def _temporal(df: pd.DataFrame) -> pd.DataFrame:
    dt = pd.to_datetime(df["created_date"])
    out = pd.DataFrame(index=df.index)
    out["hour"] = dt.dt.hour.astype("int16")
    out["dow"] = dt.dt.dayofweek.astype("int16")
    out["is_weekend"] = (dt.dt.dayofweek >= 5).astype("int8")
    out["month"] = dt.dt.month.astype("int16")
    out["day"] = dt.dt.day.astype("int16")
    out["hour_sin"] = np.sin(2 * np.pi * out["hour"] / 24)
    out["hour_cos"] = np.cos(2 * np.pi * out["hour"] / 24)
    out["dow_sin"] = np.sin(2 * np.pi * out["dow"] / 7)
    out["dow_cos"] = np.cos(2 * np.pi * out["dow"] / 7)
    out["month_sin"] = np.sin(2 * np.pi * out["month"] / 12)
    out["month_cos"] = np.cos(2 * np.pi * out["month"] / 12)
    return out


def fit_vocab(train_df: pd.DataFrame) -> dict[str, dict[str, int]]:
    """Ordinal vocab per categorical column, fit on TRAIN only."""
    vocab: dict[str, dict[str, int]] = {}
    for c in config.CATEGORICAL:
        vals = sorted(train_df[c].astype("string").fillna(NA).unique().tolist())
        vocab[c] = {v: i for i, v in enumerate(vals)}
    return vocab


def transform(df: pd.DataFrame, vocab: dict[str, dict[str, int]]) -> pd.DataFrame:
    """Build the numeric feature matrix. Categorical columns hold integer codes."""
    X = _temporal(df)
    for c in config.CATEGORICAL:
        s = df[c].astype("string").fillna(NA)
        X[c] = s.map(vocab[c]).fillna(-1).astype("int32")  # unseen → -1
    for g in config.GEO:
        X[g] = pd.to_numeric(df[g], errors="coerce")
    X["geo_valid"] = df["geo_valid"].fillna(False).astype("int8")

    # Hard leakage guard — no post-hoc/target columns may enter the matrix.
    leaked = set(X.columns) & config.LEAKAGE
    assert not leaked, f"LEAKAGE: forbidden columns in feature matrix: {leaked}"
    return X


def categorical_features() -> list[str]:
    return list(config.CATEGORICAL)


def target_log(df: pd.DataFrame) -> np.ndarray:
    return np.log1p(df[config.TARGET].to_numpy(dtype=float))

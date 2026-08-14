"""Baselines the LightGBM model must beat (reported alongside it)."""

from __future__ import annotations

import numpy as np
import pandas as pd

from . import config

KEY = ["agency", "complaint_type"]


def global_median(train_df: pd.DataFrame) -> float:
    return float(train_df[config.TARGET].median())


def global_mean(train_df: pd.DataFrame) -> float:
    return float(train_df[config.TARGET].mean())


def const_pred(value: float, n: int) -> np.ndarray:
    return np.full(n, value, dtype=float)


def agency_category_median(train_df: pd.DataFrame, test_df: pd.DataFrame) -> np.ndarray:
    """The strong baseline: median resolution per (agency, complaint_type), with
    fallback to agency median, then global median for unseen combinations."""
    t = config.TARGET
    ac = train_df.groupby(KEY)[t].median().rename("m_ac").reset_index()
    ag = train_df.groupby("agency")[t].median().rename("m_a").reset_index()
    glob = float(train_df[t].median())
    m = test_df.merge(ac, on=KEY, how="left").merge(ag, on="agency", how="left")
    return m["m_ac"].fillna(m["m_a"]).fillna(glob).to_numpy(dtype=float)

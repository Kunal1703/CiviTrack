"""SHAP explanations on the q50 (median) booster."""

from __future__ import annotations

import numpy as np
import pandas as pd
import shap


def global_importance(booster, X_sample: pd.DataFrame, top: int = 15) -> list[dict]:
    expl = shap.TreeExplainer(booster)
    sv = expl.shap_values(X_sample)
    imp = np.abs(sv).mean(axis=0)
    order = np.argsort(imp)[::-1][:top]
    cols = list(X_sample.columns)
    return [{"feature": cols[i], "mean_abs_shap": round(float(imp[i]), 4)} for i in order]


def explain_row(booster, x_row: pd.DataFrame, top: int = 5) -> list[dict]:
    """Top ± contributions for a single prediction (log-scale SHAP values)."""
    expl = shap.TreeExplainer(booster)
    sv = expl.shap_values(x_row)[0]
    cols = list(x_row.columns)
    pairs = sorted(zip(cols, sv), key=lambda t: abs(t[1]), reverse=True)[:top]
    return [{"feature": c, "shap": round(float(v), 4), "direction": "up" if v > 0 else "down"} for c, v in pairs]

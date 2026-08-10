"""Metrics — all reported in HOURS (back-transformed) alongside the baselines."""

from __future__ import annotations

import numpy as np
import pandas as pd


def mae(y: np.ndarray, p: np.ndarray) -> float:
    return float(np.mean(np.abs(y - p)))


def rmse(y: np.ndarray, p: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y - p) ** 2)))


def point_metrics(y_hours: np.ndarray, pred_hours: np.ndarray) -> dict:
    return {
        "mae_h": round(mae(y_hours, pred_hours), 2),
        "rmse_h": round(rmse(y_hours, pred_hours), 2),
        "medae_h": round(float(np.median(np.abs(y_hours - pred_hours))), 2),
    }


def log_metrics(y_log: np.ndarray, pred_log: np.ndarray) -> dict:
    return {"mae_log": round(mae(y_log, pred_log), 4), "rmse_log": round(rmse(y_log, pred_log), 4)}


def interval_coverage(y_hours: np.ndarray, lo_h: np.ndarray, hi_h: np.ndarray) -> dict:
    cov = float(np.mean((y_hours >= lo_h) & (y_hours <= hi_h)))
    return {"coverage_80": round(cov, 4), "median_width_h": round(float(np.median(hi_h - lo_h)), 2)}


def mae_by_slice(group_vals, y_hours: np.ndarray, pred_hours: np.ndarray, top: int = 10) -> list[dict]:
    d = pd.DataFrame({"g": np.asarray(group_vals), "ae": np.abs(y_hours - pred_hours)})
    g = d.groupby("g")["ae"].agg(["count", "mean"]).sort_values("count", ascending=False).head(top)
    return [{"key": str(k), "n": int(r["count"]), "mae_h": round(float(r["mean"]), 2)} for k, r in g.iterrows()]


def robust_mape(y_hours: np.ndarray, pred_hours: np.ndarray, floor_h: float = 1.0) -> float:
    """MAPE on rows with y ≥ floor (near-zero targets make raw MAPE meaningless)."""
    m = y_hours >= floor_h
    if m.sum() == 0:
        return float("nan")
    return round(float(np.mean(np.abs(y_hours[m] - pred_hours[m]) / y_hours[m]) * 100), 1)

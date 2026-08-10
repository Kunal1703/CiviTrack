"""LightGBM quantile training. q50 = point estimate; [q10, q90] = 80% interval.

We model log1p(resolution_hours). Quantiles of a monotone transform map back
correctly, so predicting quantiles on the log target and applying expm1 yields the
same quantiles in hours.
"""

from __future__ import annotations

import lightgbm as lgb
import numpy as np
import pandas as pd

from . import config


def train_quantiles(
    X_tr: pd.DataFrame, y_tr: np.ndarray, X_val: pd.DataFrame, y_val: np.ndarray,
    cat_features: list[str],
) -> dict[float, lgb.Booster]:
    models: dict[float, lgb.Booster] = {}
    dtr = lgb.Dataset(X_tr, label=y_tr, categorical_feature=cat_features, free_raw_data=False)
    dval = lgb.Dataset(X_val, label=y_val, reference=dtr, free_raw_data=False)
    for q in config.QUANTILES:
        params = dict(config.LGB_PARAMS, alpha=q)
        models[q] = lgb.train(
            params, dtr, num_boost_round=config.N_ESTIMATORS,
            valid_sets=[dval],
            callbacks=[lgb.early_stopping(config.EARLY_STOPPING, verbose=False),
                       lgb.log_evaluation(0)],
        )
    return models


def predict_quantiles(models: dict[float, lgb.Booster], X: pd.DataFrame) -> dict[float, np.ndarray]:
    """Predict each quantile (log scale) and repair any quantile crossing per row."""
    preds = {q: models[q].predict(X, num_iteration=models[q].best_iteration) for q in config.QUANTILES}
    stacked = np.sort(np.vstack([preds[q] for q in config.QUANTILES]), axis=0)  # enforce monotonic
    return {q: stacked[i] for i, q in enumerate(config.QUANTILES)}


def conformal_delta(models: dict[float, lgb.Booster], X_cal: pd.DataFrame, y_cal_log: np.ndarray,
                    alpha: float = 0.2) -> float:
    """CQR (Romano et al.) width adjustment on the log scale, fit on a calibration
    set, so the raw q10/q90 interval reaches ≈(1-alpha) marginal coverage. Applied as
    [q10 - delta, q90 + delta]."""
    q = predict_quantiles(models, X_cal)
    lo, hi = q[0.1], q[0.9]
    scores = np.maximum(lo - y_cal_log, y_cal_log - hi)
    n = len(scores)
    level = min(1.0, np.ceil((n + 1) * (1 - alpha)) / n)
    return float(np.quantile(scores, level, method="higher"))

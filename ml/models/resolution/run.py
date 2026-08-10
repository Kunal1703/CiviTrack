"""Train + evaluate M4 and persist serving artifacts.

Run (stack up, from repo root):
    POSTGRES_PORT=5433 .venv/Scripts/python.exe -m ml.models.resolution.run
"""

from __future__ import annotations

import json
import time

import numpy as np

from . import baselines, config, data, evaluate, explain, features, split, train


def _hours(log_pred: np.ndarray) -> np.ndarray:
    return np.expm1(log_pred)


def main() -> None:
    config.ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    config.REPORT_DIR.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    print("loading closed complaints …")
    df = data.load_closed()
    print(f"  {len(df):,} rows")

    # ── Time-based split (primary) ──
    tr, val, test = split.time_split(df)
    print(f"  time split: train {len(tr):,} / val {len(val):,} / test {len(test):,}")
    vocab = features.fit_vocab(tr)
    X_tr, X_val, X_test = (features.transform(tr, vocab), features.transform(val, vocab),
                           features.transform(test, vocab))
    y_tr, y_val = features.target_log(tr), features.target_log(val)
    y_test_h = test[config.TARGET].to_numpy(float)
    y_test_log = np.log1p(y_test_h)
    cat = features.categorical_features()

    # ── Baselines ──
    gm = baselines.global_median(tr)
    base_gm = evaluate.point_metrics(y_test_h, baselines.const_pred(gm, len(test)))
    base_ac = evaluate.point_metrics(y_test_h, baselines.agency_category_median(tr, test))

    # ── LightGBM quantiles ──
    print("training LightGBM quantiles (q10/q50/q90) …")
    models = train.train_quantiles(X_tr, y_tr, X_val, y_val, cat)
    delta = train.conformal_delta(models, X_val, y_val)   # CQR calibration on val
    q = train.predict_quantiles(models, X_test)
    p50_h = _hours(q[0.5])
    lo_raw_h, hi_raw_h = _hours(q[0.1]), _hours(q[0.9])
    lo_h, hi_h = _hours(q[0.1] - delta), _hours(q[0.9] + delta)   # calibrated interval
    lgb_pt = evaluate.point_metrics(y_test_h, p50_h)
    lgb_log = evaluate.log_metrics(y_test_log, q[0.5])
    cov_raw = evaluate.interval_coverage(y_test_h, lo_raw_h, hi_raw_h)
    cov = evaluate.interval_coverage(y_test_h, lo_h, hi_h)
    mape = evaluate.robust_mape(y_test_h, p50_h)
    slices = {
        "agency": evaluate.mae_by_slice(test["agency"], y_test_h, p50_h),
        "complaint_type": evaluate.mae_by_slice(test["complaint_type"], y_test_h, p50_h),
        "borough": evaluate.mae_by_slice(test["borough"], y_test_h, p50_h),
        "created_month": evaluate.mae_by_slice(
            test["created_date"].dt.to_period("M").astype(str), y_test_h, p50_h),
    }

    # ── SHAP global (sampled) ──
    print("computing SHAP global importance …")
    samp = X_test.sample(min(4000, len(X_test)), random_state=config.SEED)
    shap_global = explain.global_importance(models[0.5], samp)

    # ── Random split (secondary sanity) ──
    print("random-split sanity …")
    rtr, rval, rtest = split.random_split(df)
    rvocab = features.fit_vocab(rtr)
    rX_tr, rX_val, rX_test = (features.transform(rtr, rvocab), features.transform(rval, rvocab),
                              features.transform(rtest, rvocab))
    rmodels = train.train_quantiles(rX_tr, features.target_log(rtr), rX_val, features.target_log(rval), cat)
    r_delta = train.conformal_delta(rmodels, rX_val, features.target_log(rval))
    rp = train.predict_quantiles(rmodels, rX_test)
    ry_h = rtest[config.TARGET].to_numpy(float)
    r_pt = evaluate.point_metrics(ry_h, _hours(rp[0.5]))
    r_cov = evaluate.interval_coverage(ry_h, _hours(rp[0.1] - r_delta), _hours(rp[0.9] + r_delta))

    metrics = {
        "model_version": config.MODEL_VERSION,
        "n_closed": len(df),
        "target_p50_hours": round(float(df[config.TARGET].median()), 2),
        "split": {"train": len(tr), "val": len(val), "test": len(test),
                  "val_start": config.VAL_START, "test_start": config.TEST_START},
        "time_split": {
            "baseline_global_median": base_gm,
            "baseline_agency_category_median": base_ac,
            "lightgbm_q50": lgb_pt,
            "lightgbm_log_scale": lgb_log,
            "interval_80_raw_quantile": cov_raw,
            "interval_80_conformalized": cov,
            "conformal_delta_log": round(delta, 4),
            "mape_ge1h_pct": mape,
            "mae_by_slice": slices,
        },
        "random_split_sanity": {"lightgbm_q50": r_pt, "interval_80_conformalized": r_cov},
        "shap_global": shap_global,
        "wall_seconds": round(time.time() - t0, 1),
    }
    (config.REPORT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))

    # ── Persist serving artifacts (time-split models) ──
    for qv, m in models.items():
        m.save_model(str(config.ARTIFACT_DIR / f"lgb_q{int(qv * 100)}.txt"), num_iteration=m.best_iteration)
    (config.ARTIFACT_DIR / "vocab.json").write_text(json.dumps(vocab))
    (config.ARTIFACT_DIR / "meta.json").write_text(json.dumps({
        "model_version": config.MODEL_VERSION,
        "feature_order": list(X_tr.columns),
        "categorical": cat,
        "quantiles": list(config.QUANTILES),
        "conformal_delta_log": round(delta, 6),
        "target": "log1p(resolution_hours)",
    }, indent=2))
    (config.ARTIFACT_DIR / "feature_options.json").write_text(json.dumps({
        "agency": sorted(vocab["agency"].keys()),
        "borough": sorted(vocab["borough"].keys()),
        "complaint_type": tr["complaint_type"].value_counts().head(40).index.tolist(),
    }, indent=2))

    # ── Summary ──
    print("\n==== M4 RESULTS (time-based test set) ====")
    print(f"  target median: {metrics['target_p50_hours']} h")
    print(f"  baseline  global-median        MAE = {base_gm['mae_h']:>9} h")
    print(f"  baseline  agency×category-med  MAE = {base_ac['mae_h']:>9} h  <- the bar")
    print(f"  LightGBM  q50                  MAE = {lgb_pt['mae_h']:>9} h  (RMSE {lgb_pt['rmse_h']}, MedAE {lgb_pt['medae_h']})")
    print(f"  80% interval coverage: raw quantile {cov_raw['coverage_80']} -> conformalized {cov['coverage_80']}  (median width {cov['median_width_h']} h)")
    print(f"  random-split sanity: q50 MAE = {r_pt['mae_h']} h, 80% coverage = {r_cov['coverage_80']} (exchangeable -> calibrated)")
    print("  top SHAP: " + ", ".join(f"{s['feature']}({s['mean_abs_shap']})" for s in shap_global[:6]))
    print(f"  wall: {metrics['wall_seconds']}s")


if __name__ == "__main__":
    main()

"""Baseline classifier: TF-IDF + Logistic Regression.

The accuracy floor and honesty benchmark. LogisticRegression is chosen over
LinearSVM because it yields calibrated class probabilities natively (we need a
confidence score). Tracked in MLflow; the fitted pipeline is saved for the
model-packaging step.

Run from ml/:  python -m models.classification.train_baseline
"""

from __future__ import annotations

import json
import logging
import sys

import joblib
import mlflow
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

from .config import ClassifierConfig
from .evaluate import compute_metrics, evaluate_probe_set, save_reports


def _load_gold(cfg: ClassifierConfig):
    train = pd.read_parquet(cfg.gold_dir / "train.parquet")
    val = pd.read_parquet(cfg.gold_dir / "val.parquet")
    test = pd.read_parquet(cfg.gold_dir / "test.parquet")
    labels = json.loads((cfg.gold_dir / "labels.json").read_text(encoding="utf-8"))
    return train, val, test, labels


def run() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", stream=sys.stdout)
    log = logging.getLogger("train_baseline")
    cfg = ClassifierConfig()
    train, val, test, labels = _load_gold(cfg)

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, cfg.tfidf_ngram_max), max_features=cfg.tfidf_max_features, min_df=2)),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, n_jobs=-1)),
    ])

    mlflow.set_tracking_uri(cfg.mlflow_uri)
    mlflow.set_experiment(cfg.experiment_name)
    with mlflow.start_run(run_name="baseline-tfidf-logreg"):
        mlflow.log_params({
            "model_type": "tfidf_logreg",
            "tfidf_ngram_max": cfg.tfidf_ngram_max,
            "tfidf_max_features": cfg.tfidf_max_features,
            "class_weight": "balanced",
            "n_train": len(train),
            "n_categories": len(labels),
            "text_column": cfg.text_column,
        })

        log.info("Fitting TF-IDF + LogisticRegression on %s rows...", len(train))
        pipe.fit(train["text"], train["category"])

        for split_name, part in (("val", val), ("test", test)):
            pred = pipe.predict(part["text"])
            metrics = compute_metrics(part["category"].tolist(), pred.tolist(), labels)
            mlflow.log_metrics({f"{split_name}_{k}": v for k, v in metrics.items()})
            log.info("%s: macro_f1=%.4f weighted_f1=%.4f acc=%.4f", split_name, metrics["f1_macro"], metrics["f1_weighted"], metrics["accuracy"])
            if split_name == "test":
                save_reports(part["category"].tolist(), pred.tolist(), labels, cfg.reports_dir, "baseline_test")

        # Probe set (real-world citizen phrasing).
        probe = evaluate_probe_set(lambda texts: pipe.predict(texts).tolist(), cfg.probe_path, labels)
        if probe:
            mlflow.log_metrics({"probe_accuracy": probe["probe_accuracy"], "probe_f1_macro": probe["probe_f1_macro"]})

        # Save artifact.
        out = cfg.artifacts_dir / "baseline"
        out.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipe, out / "model.joblib")
        (out / "labels.json").write_text(json.dumps(labels, indent=2), encoding="utf-8")
        mlflow.log_artifacts(str(out), artifact_path="baseline_model")
        log.info("Baseline saved to %s", out)

    return 0


if __name__ == "__main__":
    raise SystemExit(run())

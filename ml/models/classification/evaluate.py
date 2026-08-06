"""Shared evaluation utilities for baseline and transformer.

Reports the full metric suite (accuracy, macro/weighted precision-recall-F1,
per-class report, confusion matrix) plus the citizen-phrasing probe-set score.
Macro-F1 is the primary model-selection metric (class imbalance).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Callable

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)

logger = logging.getLogger("classification.evaluate")


def compute_metrics(y_true: list[str], y_pred: list[str], labels: list[str]) -> dict:
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", labels=labels, zero_division=0
    )
    p_w, r_w, f1_w, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", labels=labels, zero_division=0
    )
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(p_macro),
        "recall_macro": float(r_macro),
        "f1_macro": float(f1_macro),
        "precision_weighted": float(p_w),
        "recall_weighted": float(r_w),
        "f1_weighted": float(f1_w),
    }


def save_reports(y_true: list[str], y_pred: list[str], labels: list[str], out_dir: Path, tag: str) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    report = classification_report(
        y_true, y_pred, labels=labels, zero_division=0, output_dict=True
    )
    (out_dir / f"{tag}_classification_report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    np.savetxt(out_dir / f"{tag}_confusion_matrix.csv", cm, fmt="%d", delimiter=",",
               header=",".join(labels), comments="")
    return report


def evaluate_probe_set(
    predict_fn: Callable[[list[str]], list[str]], probe_path: Path, labels: list[str]
) -> dict:
    """Score the hand-written citizen-phrasing probe set (real-world generalization)."""
    if not probe_path.exists():
        logger.warning("Probe set not found at %s — skipping", probe_path)
        return {}
    rows = [json.loads(line) for line in probe_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    texts = [r["text"] for r in rows]
    gold = [r["category"] for r in rows]
    pred = predict_fn(texts)
    acc = float(np.mean([p == g for p, g in zip(pred, gold)]))
    f1m = float(f1_score(gold, pred, average="macro", labels=labels, zero_division=0))
    misses = [
        {"text": t, "expected": g, "predicted": p}
        for t, g, p in zip(texts, gold, pred) if g != p
    ]
    logger.info("Probe set: n=%s accuracy=%.3f macro_f1=%.3f", len(rows), acc, f1m)
    return {"probe_n": len(rows), "probe_accuracy": acc, "probe_f1_macro": f1m, "probe_misses": misses}

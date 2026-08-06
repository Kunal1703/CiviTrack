"""Side-by-side comparison: TF-IDF+LogReg vs DistilBERT.

Evaluates both saved artifacts on the SAME holdout (gold test) and the SAME
citizen probe set, and additionally measures inference latency and model size.
Writes one comparison report + confusion-matrix CSVs.

Run from ml/ (after both models are trained):
    python -m models.classification.compare_models
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from .config import ClassifierConfig
from .text import clean_text

log = logging.getLogger("compare_models")


def _dir_size_mb(path: Path) -> float:
    total = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
    return total / 1e6


def _latency_ms(predict_one, samples: list[str], repeats: int = 60) -> float:
    for s in samples[:5]:  # warmup
        predict_one(s)
    t = time.perf_counter()
    n = 0
    for s in samples[:repeats]:
        predict_one(s)
        n += 1
    return (time.perf_counter() - t) / max(n, 1) * 1000.0


class BaselineModel:
    def __init__(self, cfg: ClassifierConfig):
        self.pipe = joblib.load(cfg.artifacts_dir / "baseline" / "model.joblib")
        self.size_mb = (cfg.artifacts_dir / "baseline" / "model.joblib").stat().st_size / 1e6

    def predict(self, texts: list[str]) -> list[str]:
        return self.pipe.predict([clean_text(t) for t in texts]).tolist()

    def predict_one(self, text: str) -> str:
        return self.pipe.predict([clean_text(text)])[0]


class TransformerModel:
    def __init__(self, cfg: ClassifierConfig):
        d = cfg.artifacts_dir / "transformer"
        self.tok = AutoTokenizer.from_pretrained(d)
        self.model = AutoModelForSequenceClassification.from_pretrained(d)
        self.model.eval()
        self.id2label = {int(k): v for k, v in self.model.config.id2label.items()}
        self.max_length = cfg.max_length
        self.size_mb = _dir_size_mb(d)

    @torch.no_grad()
    def predict(self, texts: list[str]) -> list[str]:
        enc = self.tok([clean_text(t) for t in texts], truncation=True, max_length=self.max_length, padding=True, return_tensors="pt")
        return [self.id2label[int(i)] for i in self.model(**enc).logits.argmax(-1).tolist()]

    @torch.no_grad()
    def predict_one(self, text: str) -> str:
        enc = self.tok(clean_text(text), truncation=True, max_length=self.max_length, return_tensors="pt")
        return self.id2label[int(self.model(**enc).logits.argmax(-1)[0])]


def _metrics(y_true, y_pred, labels) -> dict:
    p_m, r_m, f_m, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", labels=labels, zero_division=0)
    p_w, r_w, f_w, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", labels=labels, zero_division=0)
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision_macro": p_m, "recall_macro": r_m, "f1_macro": f_m,
        "precision_weighted": p_w, "recall_weighted": r_w, "f1_weighted": f_w,
    }


def run() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", stream=sys.stdout)
    cfg = ClassifierConfig()
    labels = json.loads((cfg.gold_dir / "labels.json").read_text(encoding="utf-8"))
    test = pd.read_parquet(cfg.gold_dir / "test.parquet")
    # Cap the holdout for the transformer's (slow) CPU inference; both models
    # are evaluated on this identical stratified subset for a fair comparison.
    if cfg.eval_cap and len(test) > cfg.eval_cap:
        test = test.groupby("category", group_keys=False).sample(
            frac=cfg.eval_cap / len(test), random_state=cfg.seed
        ).reset_index(drop=True)
        log.info("Evaluating on stratified test subset: %s rows", len(test))
    probe = [json.loads(x) for x in cfg.probe_path.read_text(encoding="utf-8").splitlines() if x.strip()]
    probe_texts = [p["text"] for p in probe]
    probe_gold = [p["category"] for p in probe]

    baseline = BaselineModel(cfg)
    transformer = TransformerModel(cfg)
    cfg.reports_dir.mkdir(parents=True, exist_ok=True)

    results = {}
    for name, mdl in (("baseline", baseline), ("transformer", transformer)):
        log.info("Evaluating %s...", name)
        pred_test = mdl.predict(test["text"].tolist())
        pred_probe = mdl.predict(probe_texts)
        m = _metrics(test["category"].tolist(), pred_test, labels)
        m["probe_accuracy"] = accuracy_score(probe_gold, pred_probe)
        m["probe_f1_macro"] = f1_score(probe_gold, pred_probe, average="macro", labels=labels, zero_division=0)
        m["latency_ms"] = _latency_ms(mdl.predict_one, test["text"].tolist())
        m["size_mb"] = mdl.size_mb
        results[name] = m
        # confusion matrix CSV
        cm = confusion_matrix(test["category"].tolist(), pred_test, labels=labels)
        np.savetxt(cfg.reports_dir / f"{name}_confusion_matrix.csv", cm, fmt="%d", delimiter=",", header=",".join(labels), comments="")
        if name == "transformer":
            rep = classification_report(test["category"].tolist(), pred_test, labels=labels, zero_division=0, output_dict=True)
            (cfg.reports_dir / "transformer_per_class.json").write_text(json.dumps(rep, indent=2), encoding="utf-8")
            results["_per_class"] = rep
            results["_cm_transformer"] = cm

    _write_report(results, labels, cfg)
    return 0


def _write_report(results: dict, labels: list[str], cfg: ClassifierConfig) -> None:
    b, t = results["baseline"], results["transformer"]

    def row(metric, key, fmt="{:.4f}"):
        return f"| {metric} | {fmt.format(b[key])} | {fmt.format(t[key])} |"

    per_class = results["_per_class"]
    pc_rows = "\n".join(
        f"| {lab} | {per_class[lab]['precision']:.3f} | {per_class[lab]['recall']:.3f} | {per_class[lab]['f1-score']:.3f} | {int(per_class[lab]['support'])} |"
        for lab in labels if lab in per_class
    )
    cm = results["_cm_transformer"]
    header = "| true\\pred | " + " | ".join(lab[:10] for lab in labels) + " |"
    sep = "|" + "---|" * (len(labels) + 1)
    cm_rows = "\n".join("| " + lab[:16] + " | " + " | ".join(str(x) for x in cm[i]) + " |" for i, lab in enumerate(labels))

    md = f"""# Model Comparison — TF-IDF+LogReg vs DistilBERT

Both models evaluated on the **same** holdout (gold `test.parquet`, {len(labels)} categories)
and the **same** citizen-phrasing probe set.

## Headline metrics

| Metric | TF-IDF + LogReg | DistilBERT |
|--------|----------------:|-----------:|
{row("Accuracy (test)", "accuracy")}
{row("Macro-F1 (test)", "f1_macro")}
{row("Weighted-F1 (test)", "f1_weighted")}
{row("Precision macro (test)", "precision_macro")}
{row("Recall macro (test)", "recall_macro")}
{row("**Probe accuracy** (real text)", "probe_accuracy")}
{row("**Probe macro-F1** (real text)", "probe_f1_macro")}
{row("Inference latency (ms/req)", "latency_ms", "{:.1f}")}
{row("Model size (MB)", "size_mb", "{:.1f}")}

**Takeaway:** both models score highly on in-distribution 311 descriptors, but the
decisive difference is the **probe set** (arbitrary citizen phrasing), where the
transformer generalizes far better — at the cost of larger size and higher latency.
Macro-F1 is the primary selection metric (class imbalance).

## DistilBERT per-class metrics (test)

| Category | Precision | Recall | F1 | Support |
|----------|----------:|-------:|---:|--------:|
{pc_rows}

## DistilBERT confusion matrix (test)

Rows = true, columns = predicted (label order below). Full CSVs for both models
are in `reports/{{baseline,transformer}}_confusion_matrix.csv`.

Labels: {", ".join(f"{i}={lab}" for i, lab in enumerate(labels))}

{header}
{sep}
{cm_rows}
"""
    out = cfg.reports_dir / "model_comparison.md"
    out.write_text(md, encoding="utf-8")
    log.info("Comparison report written: %s", out)
    log.info("baseline probe_acc=%.3f | transformer probe_acc=%.3f", b["probe_accuracy"], t["probe_accuracy"])


if __name__ == "__main__":
    raise SystemExit(run())

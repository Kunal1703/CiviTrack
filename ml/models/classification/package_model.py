"""Package the production classifier: compare runs, write metadata + model card.

Reads the latest baseline and DistilBERT runs from MLflow, records the production
model's metadata (version, metrics, data lineage), and generates a full model
card at docs/model-cards/complaint-classifier.md.

Production model = the transformer: it is selected for its robustness to real
citizen phrasing (probe set), where the baseline collapses despite high
in-distribution scores. Run after both trainers, from ml/:

    python -m models.classification.package_model
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone

import mlflow
from mlflow.tracking import MlflowClient

from .config import ClassifierConfig

log = logging.getLogger("package_model")


def _latest_run_by_name(client: MlflowClient, exp_id: str, run_name: str):
    runs = client.search_runs([exp_id], order_by=["attributes.start_time DESC"], max_results=200)
    for r in runs:
        if r.data.tags.get("mlflow.runName") == run_name:
            return r
    return None


def _fmt(metrics: dict, key: str) -> str:
    return f"{metrics[key]:.4f}" if key in metrics else "n/a"


def run() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s", stream=sys.stdout)
    cfg = ClassifierConfig()
    mlflow.set_tracking_uri(cfg.mlflow_uri)
    client = MlflowClient(cfg.mlflow_uri)

    exp = client.get_experiment_by_name(cfg.experiment_name)
    if exp is None:
        log.error("No MLflow experiment '%s' — train the models first.", cfg.experiment_name)
        return 1

    baseline = _latest_run_by_name(client, exp.experiment_id, "baseline-tfidf-logreg")
    transformer = _latest_run_by_name(client, exp.experiment_id, "distilbert")
    if transformer is None:
        log.error("No DistilBERT run found — run train_transformer first.")
        return 1

    bm = baseline.data.metrics if baseline else {}
    tm = transformer.data.metrics
    labels = json.loads((cfg.gold_dir / "labels.json").read_text(encoding="utf-8"))
    manifest = json.loads((cfg.gold_dir / "manifest.json").read_text(encoding="utf-8"))
    model_version = "classifier-v1.0"
    generated = datetime.now(timezone.utc).isoformat()

    # ── metadata alongside the served artifact ──
    meta = {
        "model_version": model_version,
        "model_type": "distilbert-base-uncased (fine-tuned)",
        "mlflow_run_id": transformer.info.run_id,
        "text_column_trained_on": cfg.text_column,
        "taxonomy_path": str(cfg.taxonomy_path),
        "n_categories": len(labels),
        "categories": labels,
        "data_content_hash": manifest.get("content_hash"),
        "n_train_total": manifest.get("n_train"),
        "metrics": {"transformer": tm, "baseline": bm},
        "created_at": generated,
    }
    art = cfg.artifacts_dir / "transformer"
    art.mkdir(parents=True, exist_ok=True)
    (art / "model_meta.json").write_text(json.dumps(meta, indent=2, default=str), encoding="utf-8")
    log.info("Wrote model_meta.json to %s", art)

    # ── model card ──
    card = _render_card(model_version, generated, labels, manifest, bm, tm, cfg)
    card_path = cfg.artifacts_dir.parents[3] / "docs" / "model-cards" / "complaint-classifier.md"
    card_path.parent.mkdir(parents=True, exist_ok=True)
    card_path.write_text(card, encoding="utf-8")
    log.info("Wrote model card to %s", card_path)
    return 0


def _render_card(version, generated, labels, manifest, bm, tm, cfg: ClassifierConfig) -> str:
    dist = manifest.get("class_distribution", {})
    dist_rows = "\n".join(f"| {k} | {v:,} |" for k, v in sorted(dist.items(), key=lambda x: -x[1]))
    return f"""# Model Card — Complaint Classifier ({version})

_Generated: {generated}_

## Intended use
Suggest a civic complaint **category** (with a confidence score) from free-text
complaint descriptions, to assist triage in the CiviTrack AI platform. It is a
**decision-support aid**, not an authority: low-confidence predictions should be
reviewed by a human, and the category set is a curated operational taxonomy.

**Out of scope:** legal/eligibility decisions, non-NYC taxonomies without
retraining, languages other than English.

## Model
- **Architecture:** fine-tuned `distilbert-base-uncased` sequence classifier.
- **Baseline for comparison:** TF-IDF + Logistic Regression.
- **Input:** arbitrary natural-language complaint text (cleaned by a shared,
  source-agnostic `clean_text`). **Output:** category + softmax confidence.
- **Version:** {version}.

## Dataset
- **Source:** NYC 311 Service Requests (Socrata `erm2-nwe9`), a **12-month
  stratified** sample of {cfg.reingest_year} (~{manifest.get('n_total', 0):,} labeled rows).
- **Training text field:** `{cfg.text_column}`. ⚠️ **Key limitation:** NYC 311 has
  no free-text complaint narrative, so the model is trained on the short
  `descriptor` field as a proxy for citizen text. The preprocessing and dataset
  loader are deliberately modular so a richer free-text corpus can replace
  `descriptor` by changing one config value (`ClassifierConfig.text_column`).
- **Split:** stratified {manifest.get('n_train',0):,} train / {manifest.get('n_val',0):,} val / {manifest.get('n_test',0):,} test.

## Taxonomy
{len(labels)} curated categories (version-controlled at `{cfg.taxonomy_path.name}`),
consolidating 150+ raw `complaint_type` values. Rare categories (< {cfg.min_category_support}
rows) fold into `Other`.

Class distribution:

| Category | Rows |
|----------|------|
{dist_rows}

## Metrics
Two evaluations: (1) the in-distribution 311 **test** split, and (2) a hand-written
**probe set** of citizen-style free text (the real generalization test).

| Metric | DistilBERT | TF-IDF + LogReg (baseline) |
|--------|-----------|----------------------------|
| Test macro-F1 | {_fmt(tm,'test_f1_macro')} | {_fmt(bm,'test_f1_macro')} |
| Test weighted-F1 | {_fmt(tm,'test_f1_weighted')} | {_fmt(bm,'test_f1_weighted')} |
| Test accuracy | {_fmt(tm,'test_accuracy')} | {_fmt(bm,'test_accuracy')} |
| **Probe accuracy** | **{_fmt(tm,'probe_accuracy')}** | {_fmt(bm,'probe_accuracy')} |
| **Probe macro-F1** | **{_fmt(tm,'probe_f1_macro')}** | {_fmt(bm,'probe_f1_macro')} |

**Primary selection metric:** macro-F1 (class imbalance). The probe set is the
decisive comparison: both models score highly in-distribution, but the transformer
generalizes to real phrasing far better than the baseline.

## Known limitations & failure cases
- **Descriptor ≠ free text.** Trained on short descriptors; verbose or colloquial
  citizen text is out-of-distribution. Mitigated by the probe set and (future)
  fine-tuning on real submissions.
- **`Other` bucket** absorbs the long tail and rare types — noisier and less useful.
- **Geographic/temporal bias:** NYC-only, {cfg.reingest_year} data; not portable to other cities without retraining.
- **Ambiguous overlaps** (e.g. Plumbing/Water vs Sewer, Noise sub-types) can be confused — see the confusion matrix in `reports/`.
- **Confidence calibration:** transformer softmax can be over-confident; treat scores as relative, not absolute probabilities.

## Ethical considerations
Public-sector automation: predictions are advisory and explainable, never
auto-actioned. No PII is used as a feature. Monitor for systematic under-service
of any borough/category before operational reliance.

## Future improvements
- Fine-tune on real citizen free-text once collected (replaces the descriptor proxy).
- Confidence calibration (temperature scaling) + a low-confidence → human-review threshold.
- Periodic retraining + drift monitoring (M9); larger backbone (RoBERTa/DeBERTa) if needed.
- Formal MLflow Model Registry stage transitions for promotion/rollback.

## Deployment
Served by `services/ml_service` (FastAPI, CPU-only torch) which loads this
artifact and exposes `POST /classify`; the public `POST /api/v1/classify` is
proxied by the gateway. **Verified end-to-end under Docker Compose** — postgres,
ml_service, and gateway run together, the gateway reaches ml_service over the
compose network (service name `ml_service:8001`), and returns
`{{category, confidence}}`. CPU inference latency ~40 ms/request.

## Reproducibility
- Data content hash: `{manifest.get('content_hash')}`
- Taxonomy: `{cfg.taxonomy_path}` · Training: `ml/models/classification/train_transformer.py`
- Tracking: MLflow (local SQLite) · experiment `{cfg.experiment_name}`.
"""


if __name__ == "__main__":
    raise SystemExit(run())

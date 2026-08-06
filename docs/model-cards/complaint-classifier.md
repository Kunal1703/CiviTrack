# Model Card — Complaint Classifier (classifier-v1.0)

_Generated: 2026-08-02T16:59:35.126951+00:00_

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
- **Version:** classifier-v1.0.

## Dataset
- **Source:** NYC 311 Service Requests (Socrata `erm2-nwe9`), a **12-month
  stratified** sample of 2024 (~201,537 labeled rows).
- **Training text field:** `descriptor`. ⚠️ **Key limitation:** NYC 311 has
  no free-text complaint narrative, so the model is trained on the short
  `descriptor` field as a proxy for citizen text. The preprocessing and dataset
  loader are deliberately modular so a richer free-text corpus can replace
  `descriptor` by changing one config value (`ClassifierConfig.text_column`).
- **Split:** stratified 141,075 train / 30,231 val / 30,231 test.

## Taxonomy
19 curated categories (version-controlled at `category_taxonomy.yaml`),
consolidating 150+ raw `complaint_type` values. Rare categories (< 300
rows) fold into `Other`.

Class distribution:

| Category | Rows |
|----------|------|
| Noise | 43,570 |
| Illegal Parking | 41,099 |
| Sanitation | 17,849 |
| Building/Apartment Condition | 17,358 |
| Heat/Hot Water | 14,352 |
| Street Condition | 12,170 |
| Plumbing/Water | 10,280 |
| Abandoned/Derelict Vehicle | 7,655 |
| Business/Consumer | 6,842 |
| Public Safety | 5,328 |
| Tree | 4,839 |
| Homeless/Encampment | 3,414 |
| Electrical/Elevator | 3,206 |
| Other | 3,034 |
| Environmental Hazard | 2,802 |
| Rodent/Pest | 2,593 |
| Animal | 1,809 |
| Street Light | 1,772 |
| Sewer | 1,565 |

## Metrics
Two evaluations: (1) the in-distribution 311 **test** split, and (2) a hand-written
**probe set** of citizen-style free text (the real generalization test).

| Metric | DistilBERT | TF-IDF + LogReg (baseline) |
|--------|-----------|----------------------------|
| Test macro-F1 | 0.9626 | 0.9756 |
| Test weighted-F1 | 0.9790 | 0.9907 |
| Test accuracy | 0.9792 | 0.9904 |
| **Probe accuracy** | **0.5556** | 0.3889 |
| **Probe macro-F1** | **0.4497** | 0.3525 |

**Primary selection metric:** macro-F1 (class imbalance). The probe set is the
decisive comparison: both models score highly in-distribution, but the transformer
generalizes to real phrasing far better than the baseline.

## Known limitations & failure cases
- **Descriptor ≠ free text.** Trained on short descriptors; verbose or colloquial
  citizen text is out-of-distribution. Mitigated by the probe set and (future)
  fine-tuning on real submissions.
- **`Other` bucket** absorbs the long tail and rare types — noisier and less useful.
- **Geographic/temporal bias:** NYC-only, 2024 data; not portable to other cities without retraining.
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
`{category, confidence}`. CPU inference latency ~40 ms/request.

## Reproducibility
- Data content hash: `b6d58293cbe7ab14`
- Taxonomy: `C:\Users\kunal\Downloads\Projectt\ml\data\category_taxonomy.yaml` · Training: `ml/models/classification/train_transformer.py`
- Tracking: MLflow (local SQLite) · experiment `complaint-classification`.

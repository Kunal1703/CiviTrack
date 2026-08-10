# Model Card — Resolution-Time Regressor (M4)

**Model:** `resolution-v1` · LightGBM gradient-boosted quantile regression.
**Task:** predict a complaint's resolution time (hours) from report-time features,
with an 80% uncertainty interval and SHAP explanations.
**Owner:** CiviTrack AI · **Date:** 2026-08-08 · **Design:** `docs/M4_DESIGN.md`.

## Intended use
- **Intended:** an analytical / decision-support estimate of *expected* resolution
  time for NYC-311-shaped complaints, with uncertainty and drivers. Surfaced as an
  **admin "resolution insights"** tool (global drivers + a try-it form).
- **Out of scope:** an SLA guarantee; per-complaint promises to citizens; direct use
  on non-NYC data (see Limitations). It is an *estimate*, not a commitment.

## Data
- **Source:** real **NYC 311** open data (`silver.complaints_311`), 204,000 rows
  stratified across 2024.
- **Training population:** the **200,180 closed** complaints with a valid
  `resolution_hours = closed_date − created_date ≥ 0`. The **3,776 open (1.9%)**
  complaints are **right-censored** and excluded — the model therefore describes
  *closed* complaints.
- **Target:** `log1p(resolution_hours)` (raw target is extremely heavy-tailed:
  p50 7.2 h, p90 555 h, max 22,560 h).

## Features (leakage allow-list — only report-time information)
Categorical: `agency`, `complaint_type`, `descriptor`, `borough`, `incident_zip`.
Temporal (from `created_date`): hour, day-of-week, is_weekend, month, day + cyclic
encodings. Geospatial: `latitude`, `longitude`, `geo_valid`.
**Excluded (leakage):** `closed_date`, `resolution_hours`, `status`.

## Evaluation (time-based split: train ≤ Aug, val = Sep, test = Oct–Dec; 49,939 test)
| Model | MAE (h) | RMSE (h) | MedAE (h) |
|---|---:|---:|---:|
| Global-median baseline | 275.9 | 1031 | 8.2 |
| **Agency×category-median baseline** | 238.2 | 918 | 9.3 |
| **LightGBM q50 (this model)** | **225.0** | 869 | **8.3** |

- LightGBM **beats the strong agency×category-median baseline** on MAE. MAE is
  dominated by the heavy tail; **MedAE ≈ 8 h** is the representative "typical" error.
- **80% interval (conformalized):** coverage **0.74** on the time-shifted test set,
  **0.80** on an exchangeable random split (conformal calibration holds when its
  exchangeability assumption holds; time-shift degrades it — reported honestly).
- **Random-split sanity:** MAE 186 h (lower than the harder time-split — consistent
  with survivorship in later months).
- **Error by slice:** excellent on fast/predictable work (NYPD 3.6 h, Illegal
  Parking 2.7 h, Noise 2–6 h), hard on slow heavy-tailed work (HPD 283 h,
  DPR/DOB ≈ 1,400 h).
- **Global SHAP:** `complaint_type` dominates, then `descriptor`, `agency`,
  `incident_zip`, seasonality.

## Limitations (honest)
- **Heavy tail** caps achievable MAE; the tail (multi-hundred-day cases) is
  intrinsically hard. Report MedAE alongside MAE.
- **Time-shift / survivorship:** later-month closed complaints under-represent slow
  cases; time-split intervals under-cover. Documented, not hidden.
- **NYC-only:** trained on NYC agencies/operations. It must **not** be presented as a
  forecast for other cities (e.g. the app's Delhi demo data). A real deployment
  retrains on the target city's data.
- **Descriptor ≈ categorical:** only 776 unique descriptors → text embeddings add
  little over the categorical (measured; embeddings not used in v1).
- **Open complaints excluded** (right-censoring); full survival modelling is future work.

## Ethical considerations
Estimates could bias operator attention; they are framed as estimates with
uncertainty and drivers, never as guarantees. No PII is used as a feature.

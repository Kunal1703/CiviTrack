# M4 — Resolution-Time Prediction · Results Report

> Measured results from the implemented system (no invented numbers). Design:
> `docs/M4_DESIGN.md`; model card: `docs/model-cards/resolution-regressor.md`.
> Reproduce: `POSTGRES_PORT=5433 python -m ml.models.resolution.run`.

## 1. What shipped
A LightGBM quantile regressor that predicts a complaint's **resolution time** from
report-time features, with a **calibrated 80% interval** and **SHAP** drivers —
trained on **200,180 closed NYC 311** complaints, served through
`ml_service → gateway`, and surfaced as an **admin "resolution insights"** tool.

```
report-time features ─► log1p target ─► LightGBM q10/q50/q90 (+CQR) ─► point + interval + SHAP
```

## 2. Target & data (derived from the live DB)
- Target `resolution_hours = closed − created` (0 inconsistent, 0 negative rows).
- **200,180 closed** used; **3,776 open (1.9%)** excluded as right-censored.
- Heavy-tailed (p50 **7.2 h**, p90 555 h, max 22,560 h) → model **`log1p(hours)`**.

## 3. Results (time-based test, Oct–Dec, 49,939 rows)
| Model | MAE (h) | MedAE (h) |
|---|---:|---:|
| Global-median baseline | 275.9 | 8.2 |
| Agency×category-median baseline (the bar) | 238.2 | 9.3 |
| **LightGBM q50** | **225.0** | **8.3** |

**LightGBM beats the strong agency×category baseline** on MAE. MAE is inflated by
the heavy tail (RMSE 869); **MedAE ≈ 8 h is the honest "typical" error** on a 7.2 h
median target.

## 4. Uncertainty (80% interval, conformalized quantile / CQR)
| Split | Coverage |
|---|---:|
| Time-shifted test | **0.74** |
| Exchangeable random split | **0.80** |

Conformal calibration reaches nominal 80% when its exchangeability assumption holds;
the time-shift (later months) degrades it to 0.74 — reported honestly, not hidden.

## 5. Error by slice (where it's easy vs hard)
- **Easy/accurate:** NYPD MAE **3.6 h**, Illegal Parking **2.7 h**, Noise 2–6 h.
- **Hard (heavy tail):** HPD 283 h, DOB 1,342 h, DPR 1,418 h; Unsanitary/Plumbing ~490 h.
- By borough MAE 170–280 h; by created-month 194–268 h (mild late-window drift).

## 6. Explainability (SHAP global, mean|SHAP| on log scale)
`complaint_type` (1.56) ≫ `descriptor` (0.27) > `agency` (0.17) > `incident_zip`
(0.12) > seasonality (month/day-of-week). Per-prediction factors are returned by the
API and rendered in the UI ("mainly because: complaint type …, agency …").

## 7. Serving & product integration
- `ml_service`: `POST /resolution-time` (features → point, 80% interval, SHAP
  factors) + `GET /resolution-time/meta` (UI options). Boosters + vocab mounted
  read-only; loaded once at startup.
- `gateway`: `POST /api/v1/resolution-time` + `/meta`, **admin-only** (server-side).
- **Admin "resolution insights"** on `/admin/analytics`: global drivers + a try-it
  form (agency/category/time → predicted range + why), **clearly labeled
  NYC-311-trained** — never presented as a per-Delhi-complaint forecast.

## 8. Honest limitations
Heavy tail caps MAE (MedAE is the representative metric); time-shift survivorship;
NYC-only training (do not apply to Delhi as a forecast); descriptor ≈ categorical
so embeddings add little (not used in v1); open complaints excluded (censoring);
this is an estimate with uncertainty, **not an SLA**.

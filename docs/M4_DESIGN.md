# M4 — Resolution-Time Prediction (Regression) · Technical Design

> **Status:** Design proposal — **implementation NOT started; awaiting approval.**
> **Mission:** Predict how long a complaint will take to resolve, with an honest
> uncertainty interval and a per-prediction explanation — the project's strongest
> data-science artifact.
> **Source of truth:** `docs/BLUEPRINT.md` (M4 = §17 #2, §29 metrics, milestone M4)
> and `docs/PROJECT_CONTEXT.md` §15. This document details M4 within them.
> **Scope guard:** M4 is tabular regression only. **No M5+ work, no LLM.**
>
> **Numbers below are measured from the live DB on 2026-08-08** (`silver.complaints_311`,
> 204,000 rows) — not assumed.

---

## 0. The four facts that shape M4 (read first)

### Fact 1 — The target is clean and well-defined.
`resolution_hours = (closed_date − created_date)` in hours. Verified: **0** rows where
the stored value disagrees with the timestamp delta by >1h, **0** negative durations.
**200,180 / 204,000 (98.1%)** complaints are closed and have a target. → We train on
closed complaints; the target needs no reconstruction.

### Fact 2 — 1.9% are open (right-censored) and must be handled honestly.
**3,776 (1.9%)** complaints have no `closed_date` — they are still open at the data
snapshot, so their *true* resolution time is unknown and **≥** their current age
(right-censored). We **train and evaluate only on closed complaints** and **document**
that the model describes *closed* complaints. We do **not** impute a fake duration for
open ones. (Full survival modelling is out of scope and overkill at 1.9% censoring.)

### Fact 3 — The target is brutally heavy-tailed → log transform.
| p25 | p50 | p75 | p90 | p95 | p99 | max | mean |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.9h | 7.2h | 83h | 555h | 1,631h | 7,319h | 22,560h (940d) | 327h |

A ~25,000× spread between median and max. We model **`y = log1p(resolution_hours)`** and
report error back-transformed to hours. (3,753 zero-duration closes → `log1p(0)=0`, safe.)

### Fact 4 — Agency (and category) dominate → the baseline is strong.
Median resolution by agency: **NYPD 1.0h** (n=91.8k) · HPD 95h · DSNY 30h · DOT 47h ·
DEP 24h · **DPR 677h** · DOB 376h · **TLC 1,634h**. Complaint-type medians span
**0.6h (noise) → 200h+ (unsanitary/plumbing)**. So a simple **agency×category median**
predictor is already a serious competitor. **The whole point of M4 is to beat it with a
model that captures interactions and geography/seasonality — and to prove it did.**

---

## 1. Problem statement

Given a complaint's **report-time** information (what/where/when/which agency), predict
its **resolution time in hours**, with:
1. a **point estimate** (expected time),
2. an **uncertainty interval** (not a false-precision single number), and
3. an **explanation** of the main drivers.

This is a supervised **regression** on tabular + text-derived features, trained on real
NYC 311 closed complaints.

---

## 2. Target definition (derived from the data, not assumed)

- **Raw target:** `resolution_hours` (= closed − created), closed complaints only.
- **Model target:** `y = log1p(resolution_hours)`. Rationale: heavy tail (Fact 3);
  optimizing squared/absolute error on raw hours would be dominated by the ~1% of
  multi-hundred-day cases and ignore the median experience. On log scale the error is
  relative/multiplicative, which matches how people reason about durations ("about a
  day" vs "about a week").
- **Reporting:** all headline metrics are back-transformed to **hours** (`expm1`) so
  they're interpretable; we also report metrics on the log scale for completeness.
- **Filtering:**
  - Keep the **200,180 closed** rows with `resolution_hours ≥ 0`.
  - **Exclude the 3,776 open** rows from train/eval (documented censoring, Fact 2).
  - **Keep** the 3,753 zero-duration closes (they're real "instant" NYPD/DHS closures);
    note them as a documented data property. Optionally floor at a few minutes — decided
    after a residual check, not up front.

---

## 3. Leakage analysis (explicit allow-list — the #1 correctness risk)

A resolution-time model is trivially "solvable" by leaking the outcome. We enforce an
**allow-list**: a feature is used only if it is **knowable at report time**.

**EXCLUDED (post-hoc / target-derived — hard ban):**
- `resolution_hours` (the target), `closed_date` (defines the target),
- `status` (encodes closed/open → leaks the outcome),
- any future/derived field. (No `updated_at` exists in this table.)

**ALLOWED (known when the complaint is filed):**
| Group | Features |
|---|---|
| **Categorical** | `agency` (15), `complaint_type` (171), `descriptor` (776), `borough` (5), `incident_zip` (247), `city` |
| **Temporal** (from `created_date`) | hour-of-day, day-of-week, is_weekend, month, day-of-month, (optional) is_holiday |
| **Geospatial** | `latitude`, `longitude`, `geo_valid` (and optionally zip-level aggregates) |
| **Text (optional, M3 reuse)** | the 384-d MiniLM `descriptor` embedding |

> **Note on `complaint_type`:** it was the *label* in M1 (so it couldn't be an input
> there). In M4 the target is *time*, and `complaint_type` is known at report time, so it
> is a **legitimate, strong input** here. `agency_name` is 1:1 with `agency` → drop the
> redundant one.

**Leakage tests (automated, must pass):** (a) assert the excluded columns are absent
from the feature matrix; (b) a "leakage canary" — training with `status` included should
produce a suspiciously-perfect score, and its *absence* is asserted in the real pipeline.

---

## 4. Features & encoding

- **LightGBM native categoricals** for `agency`, `complaint_type`, `borough` (low/med
  cardinality). `descriptor` (776) and `incident_zip` (247) — native categorical or
  target/frequency encoding (decided by CV, documented).
- **Temporal** cyclic features (sin/cos of hour, day-of-week, month) + raw ordinals.
- **Geo** raw lat/lng (trees split on them fine) + optional zip-level median-resolution
  as a smoothed prior (computed **on the training fold only** to avoid leakage).
- **Text embeddings (optional ablation):** because there are only **776 unique
  descriptors**, a descriptor's embedding is essentially a 384-d encoding of a categorical
  we already have — so embeddings are expected to add **little** over the `descriptor`
  feature. We will **measure this as an ablation** (with vs without embeddings) and keep
  them only if they earn their place. Honest expectation: marginal.

---

## 5. Models: baseline-first, then LightGBM

Per the project's iron rule (baseline before deep, measure every increment):

1. **Baselines (must exist, must be beaten):**
   - **Global median** and **global mean** (the naive floors).
   - **Agency × complaint_type median** — the *strong* baseline (Fact 4). Computed on
     train, applied to test. This is the bar that matters.
2. **Primary model — LightGBM** (gradient-boosted trees):
   - Native categorical handling, robust to heavy tails (on the log target), fast on CPU,
     first-class SHAP. Trained with quantile + L2 objectives (see §7).
   - **XGBoost as a secondary comparison** (blueprint suggests it) — only if time allows;
     LightGBM is the workhorse.
3. **Selection rule:** LightGBM ships **only if it beats the agency×category-median
   baseline on MAE (hours) on the time-based holdout.** If it doesn't, we ship the
   baseline and say so — that is itself an honest, defensible result.

---

## 6. Validation protocol (time-based split + honest censoring caveat)

Per BLUEPRINT §29: **split by time, never random**, for temporal/tabular data.

- **Split:** by `created_date` — **train = 2024-01…08**, **val = 2024-09**,
  **test = 2024-10…12** (roughly 67/8/25 of the stratified 17k/month sample).
- **⚠️ Censoring/survivorship caveat (stated up front):** because resolution can exceed
  the observation window, complaints created in the *later* test months that resolve
  slowly are more likely to still be *open* at the snapshot — so the closed-only test set
  is **biased toward faster resolutions** for late months. We **document this bias**, and
  mitigate/measure it two ways: (a) report error **sliced by created-month** to expose any
  drift; (b) also report a **random-split** score as a secondary sanity check (the mirror
  of what M1 did). The time-split remains the **primary, honest** number.
- **Frozen splits** saved as gold artifacts so baseline and LightGBM are compared on
  identical rows.

---

## 7. Prediction intervals (uncertainty, not false precision)

- **Primary: LightGBM quantile regression** — train models at **q = 0.1, 0.5, 0.9**;
  serve the **80% interval [q10, q90]** plus the q50 point estimate. Clean, monotonic
  (enforced/repaired if crossings occur), interpretable.
- **Calibration check:** empirical coverage of the 80% interval on the test set must be
  ≈80% (report the actual number; recalibrate if off).
- **Optional: split-conformal** wrapper on the point model for distribution-free coverage
  guarantees — added only if quantile coverage is poorly calibrated. Documented either way.

---

## 8. Evaluation (real numbers, reported against the baseline)

| Dimension | Metric |
|---|---|
| **Primary** | **MAE (hours)**, back-transformed — LightGBM **vs** agency×category-median **vs** global median |
| Secondary | RMSE (hours), MAE/RMSE on log scale, **MAPE by category & by agency** |
| Uncertainty | **80% interval coverage** (target ≈0.80), interval width distribution |
| Error analysis | residuals vs predicted; **error sliced by agency / category / borough / created-month**; worst over-/under-predictions inspected |
| Sanity | random-split MAE (secondary), leakage-canary check |

**Framing:** the story is "LightGBM MAE = X h vs agency×category-median = Y h vs global
median = Z h" — the deltas, not a lone number. We expect modest but real gains over a
*strong* baseline, and we report honestly if they're small.

---

## 9. Explainability (SHAP)

- **SHAP TreeExplainer** on the LightGBM point model → global importance (which features
  drive resolution time overall) + **per-prediction** top ± contributions.
- Served in the prediction response as a small, human-readable payload, e.g.
  *"Expected ~2 days · mainly because: agency = HPD (+), category = Heat/Hot Water (+),
  reported on a weekend (−)."* No raw SHAP values dumped on citizens.
- Global SHAP summary saved to the model card and MLflow.

---

## 10. Serving & product integration

Mirror the M1/M3 seam exactly (gateway owns no model code):

- **`ml_service`** loads the LightGBM artifacts at startup; new endpoints
  `POST /resolution-time` (features → {point, interval, model_version}) and
  `POST /resolution-time/explain` (→ + SHAP factors). Trained offline in a new
  `ml/models/resolution/` package; artifact mounted read-only (small — trees, not GBs).
- **`gateway`** proxies `POST /api/v1/resolution-time` (Pydantic-validated), 503-degrades
  if ml_service is down.
- **MLflow** experiment `resolution-time`; **model card** at
  `docs/model-cards/resolution-regressor.md`.

### ⚠️ Product-honesty decision (needs your call — §13)
The regressor is trained on **NYC 311 operational data** (NYC agencies, NYC SLAs). The
product experience is **Delhi demo data**, which has no NYC "agency". Applying an
NYC-trained resolution model to Delhi complaints would be **misleading** if presented as a
real forecast. Options for where "expected resolution + why" is surfaced are in §13 — I
will **not** silently show NYC-trained predictions on Delhi complaints.

---

## 11. Repository changes (what M4 introduces)

```
ml/models/resolution/            # NEW — training code
  ├── config.py, features.py, target.py, split.py
  ├── baselines.py               # global + agency×category median
  ├── train.py                   # LightGBM (point + quantiles) → MLflow
  ├── evaluate.py                # metrics, slices, coverage, residuals
  ├── explain.py                 # SHAP
  └── artifacts/                 # git-ignored trained models
ml/evaluation/                   # resolution eval report json
services/ml_service/app/         # + resolution predictor, router, schemas (vendored feature build)
services/gateway/app/            # + /api/v1/resolution-time router + schemas
docs/model-cards/resolution-regressor.md   # NEW
docs/M4_REPORT.md                # NEW — measured results
```
No new DB migrations (reads existing `silver.complaints_311`). Frontend touch depends on
the §13 decision.

---

## 12. Testing, risks, limitations

- **Tests:** leakage allow-list test; target-derivation test; determinism (seed → same
  metric); baseline-beat assertion in CI-lite; interval-coverage sanity; API validation +
  503 degrade; a behavioral test (e.g. same complaint reported to a slow agency ⇒ longer
  predicted time).
- **Risks/limitations (documented honestly):** heavy tail caps achievable MAE; time-split
  survivorship bias (§6); 1.9% censoring excluded; NYC-only training (§10/§13); descriptor
  embeddings likely marginal (§4); zero-duration closes are a data quirk; a *model* is not
  an SLA promise — framed as an estimate.

---

## 13. Decisions I need signed off before implementing

1. **Target transform:** `log1p(hours)`, evaluate MAE back in hours (**recommended**) — vs
   raw / winsorized.
2. **Split:** **time-based** primary (train ≤Aug, test Oct–Dec) + random-split sanity
   check, censoring caveat documented (**recommended**) — vs random stratified.
3. **Intervals:** LightGBM **quantile** q10/50/90 (**recommended**) — vs conformal (or both).
4. **Product integration (the important one):** where does "expected resolution + why"
   appear, given the model is NYC-trained?
   - (a) **Admin-only, clearly labeled** as an NYC-311-trained data-science demo (e.g. a
     panel on the admin issue view *for NYC-shaped inputs*, or on the `/architecture`
     showcase) — **recommended, most honest**;
   - (b) a dedicated **`/admin/analytics` "resolution insights"** section (SHAP global +
     a try-it form) — no per-Delhi-complaint claims;
   - (c) surface on **Delhi complaints** but **explicitly labeled "illustrative, model
     trained on NYC data"** — riskier honesty-wise;
   - (d) **backend + model card only** for now (no product UI) — smallest, safest.

*No implementation until these are confirmed.* On approval I'll also branch off `main`
(M4 is independent of the unmerged product-UX branch) unless you'd rather build on it.

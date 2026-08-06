# M1 — Complaint Classification System · Technical Design

> **Status:** Design approved-in-principle; **implementation not yet started** (awaiting explicit go-ahead).
> **Scope:** ONE production-quality text→category classifier, end to end (data → baseline → transformer → serving → evaluation), reachable at `POST /api/v1/classify`.
> **Source of truth:** `docs/BLUEPRINT.md`. This document details M1 within it.
>
> **🔒 Locked decisions (2026-07-30):**
> - **Training data:** re-ingest **~200k rows, stratified across 12 months of 2024** (reduces the M0 slice's winter/seasonal bias).
> - **Serving:** **separate `ml_service`** (FastAPI) holding the model; gateway proxies `/api/v1/classify` to it.
> - **Taxonomy:** consolidate 150 raw `complaint_type` values into **~15–18 canonical categories + `Other`** (data-derived, version-controlled YAML).
> - Input text = `descriptor` (leak-free); baseline = TF-IDF + LogReg; production = DistilBERT; primary metric = macro-F1; MLflow (local) + DVC introduced in M1.

---

## 0. The two facts that shape M1 (read first)

Everything below follows from two properties of the real data we loaded in M0:

### Fact 1 — NYC 311 has **no free-text complaint narrative.**
The app's eventual input is free text ("*Streetlight has not been working for two weeks*"). But the public 311 export has **no** such column. Its text-like fields are:
- `complaint_type` (150 values) — this is our **label source**, so it **cannot** be an input (leakage).
- `descriptor` (599 values) — a short sub-category phrase, e.g. *"Street Light Out"*, *"No Heat"*, *"Loud Music/Party"*.

**Decision:** train on **`descriptor` → category**. The descriptor is the best available proxy for citizen text — a short natural-language phrase — and using it (never `complaint_type`) as input avoids label leakage. This is the honest, correct use of the dataset, and it is stated plainly as a limitation: descriptors are short and cleaner than real citizen prose, so real-world generalization is validated separately (see §6, the "citizen-phrasing probe set").

### Fact 2 — 150 labels, brutally imbalanced, with a long tail.
Top-2 categories = 31% of data; top-15 = 67%; **75 of 150 types have <50 rows**; many are near-duplicates (`Noise`, `Noise - Residential`, `Noise - Commercial`, `Noise - Street/Sidewalk`, `Noise - Helicopter`).

**Decision:** do **not** classify into 150 raw types. Consolidate into a **curated taxonomy of ~15–18 canonical categories + `Other`** via an explicit mapping file. This is maintainable, well-supported per class, and matches the product ("Street Light", not "Street Light Condition").

> ⚠️ **Taxonomy reconciliation note.** The current frontend mock uses 6 India-centric categories (Garbage, Pothole, Water Leakage, Streetlight, Drainage, Other) that do **not** match NYC 311's reality (dominated by heat/hot-water, parking, noise). **The model's data-derived taxonomy is authoritative;** the frontend category list is reconciled to it in **M2**. M1 does not touch the UI.

---

## 1. Dataset

### Columns used
| Column | Role | Notes |
|--------|------|-------|
| `descriptor` | **Input text (X)** | short phrase; the only non-leaking text signal |
| `complaint_type` | **Label source** | mapped → canonical category (never an input) |
| `unique_key` | row id / dedup / split key | |
| `created_date` | temporal robustness split | secondary check only |
| `borough`, `agency` | **not used as features in M1** | pure text classifier; reserved for later feature work |

### Target labels
A curated **canonical taxonomy** (`ml/data/category_taxonomy.yaml`) mapping each of the 150 `complaint_type` values to one of ~15–18 categories. Illustrative (final list finalized during build from full-data frequencies):

`Heat/Hot Water` · `Illegal Parking` · `Noise` · `Sanitation` · `Plumbing/Water` · `Building/Apartment` · `Street Condition` · `Street Light` · `Abandoned/Derelict Vehicle` · `Illegal Dumping` · `Homeless/Encampment` · `Tree/Sidewalk` · `Water System` · `Air/Environmental` · `Construction` · `Other`

- Everything unmapped, or any category below a support threshold, collapses to **`Other`**.
- The mapping is **version-controlled and human-auditable** — no opaque clustering deciding categories.

### Features
- **M1 is text-only:** `X = clean(descriptor)`, `y = category`. No structured features. (Keeping the first AI feature single-signal and honest; structured/geo features belong to M4+.)

### Filtering strategy
- Drop rows with null/empty `descriptor` (~0.5%).
- Drop rows whose `complaint_type` is null (0 in our data).
- De-duplicate on `unique_key` (already done in silver).
- Optionally drop exact `(descriptor, category)` duplicates for the *test* set only, to avoid train/test memorization inflating metrics.

### Label cleaning
- Normalize `complaint_type` casing/whitespace before mapping (`HEAT/HOT WATER` vs `Heat/Hot Water`).
- Apply the taxonomy map → canonical category.
- Merge obvious near-duplicates via the map (all `Noise - *` → `Noise`).

### Rare-category handling
- Canonical categories with **< N_min (e.g. 300)** training rows → folded into `Other` (or a sensible parent).
- This turns the 75-type long tail into a controlled `Other` bucket rather than 75 unlearnable classes.
- `Other` is monitored separately (a large/at noisy `Other` is a known limitation, revisited when more data arrives).

### 📊 Data recommendation (important)
The M0 slice is **50k rows over 6 winter days** (Jan 1–6 2024) → **seasonal bias** (Heat/Hot Water inflated). For a production classifier I recommend **re-ingesting a larger, temporally-stratified sample** — e.g. **~200k rows sampled across all 12 months of 2024** (a small enhancement: loop the existing Socrata ingester month-by-month). This reduces seasonal skew and gives rare categories enough support. The pipeline is already bounded/configurable; this is a config + a light stratification helper.

---

## 2. Data preparation

### Text cleaning
- **Baseline (TF-IDF):** lowercase, strip, collapse whitespace, remove punctuation, drop English stopwords, word n-grams (1–2).
- **Transformer:** minimal cleaning only (lowercase/strip). The model's tokenizer handles the rest — aggressive cleaning throws away signal.

### Tokenization
- Baseline: TF-IDF vectorizer (word (1,2)-grams, `min_df=2`, `max_features≈50k`).
- Transformer: the model's own **WordPiece** tokenizer (`max_length=64` — descriptors are short, so 64 tokens is ample and fast).

### Train/Validation/Test split
- **Stratified 70 / 15 / 15** by canonical category (preserves class proportions; essential under imbalance).
- Split by `unique_key`, deterministic `random_state`.
- **Secondary temporal check:** also evaluate on a *time-held-out* slice (train on earlier dates, test on later) to confirm no temporal drift — reported alongside, not the primary metric (category semantics are time-stable, unlike M4/M6 targets).
- Frozen splits saved as **gold** artifacts (`data/gold/`) so baseline and transformer train/eval on identical data.

### Class imbalance
- **Class weighting**, not oversampling: LR `class_weight="balanced"`; transformer **weighted cross-entropy** (inverse-frequency). Avoids text-duplicate leakage that naive oversampling causes.
- **Macro-F1** as the primary selection metric (weights every class equally, so rare classes count).

### Data versioning
- **Initialize DVC** (deferred from M0). Track the training snapshot (`data/silver`, `data/gold` splits) and the taxonomy file. Every model run records the **DVC data hash** in MLflow → full reproducibility (commit + data version + config → model).

---

## 3. Baseline model — **TF-IDF + Logistic Regression** ✅

- **Why LR over Linear SVM:** we must emit a **confidence score**. LogisticRegression gives **calibrated multiclass probabilities natively** (`predict_proba`); LinearSVM needs extra Platt scaling. LR is fast, strong on short text, and interpretable (per-class token weights → free explainability).
- Config: `TfidfVectorizer(1–2 grams)` → `LogisticRegression(class_weight="balanced", max_iter=1000, C tuned)`.
- **Purpose:** the accuracy floor and the honesty benchmark. Because descriptors nearly determine the category, expect the baseline to score **high** on the 311 holdout — that is the point of measuring it. The transformer must justify itself against this bar (and especially on the probe set).

---

## 4. Production model — **DistilBERT** (`distilbert-base-uncased`) ✅

| Criterion | Why DistilBERT wins for M1 |
|-----------|----------------------------|
| **Accuracy** | ~97% of BERT-base on classification; more than enough for short-text categories. |
| **Speed** | ~60% faster than BERT; **CPU inference < ~100 ms** for a 64-token input — meets the <500 ms p95 NFR with no GPU. |
| **Inference cost** | Runs **locally on CPU**, free, open-source. No paid API (hard requirement). |
| **Deployment** | 66M params, small image footprint; loads once at service startup. |
| **Future scalability** | Same HF `Trainer`/`AutoModel` interface — swapping to **RoBERTa/DeBERTa-v3** later is a one-line model-name change if accuracy demands it. |

- **Rejected:** DeBERTa-v3 (more accurate but heavier/slower — overkill for near-deterministic short text); RoBERTa-base (bigger/slower than DistilBERT, marginal gain here); LLM-as-classifier (slower, costlier, less explainable, and a paid-API temptation — the blueprint explicitly reserves LLMs for reasoning, not classification).
- **Confidence:** softmax max-probability over class logits. Add an optional **low-confidence threshold τ** → below τ, surface as low-confidence / `Other`. Note calibration (temperature scaling) as an optional refinement; transformers are often over-confident.

**Framing for evaluation:** on in-distribution 311 descriptors, baseline and transformer will both score high and look similar. The transformer earns its place on **robustness to real citizen phrasing** — demonstrated on the probe set (§6). This is stated honestly rather than pretending the transformer dominates everywhere.

---

## 5. Training pipeline

```
data/gold (frozen splits, DVC-versioned)
   │
   ├─ preprocess ─────────────────────────────────────────┐
   │                                                       │
   ▼                                                       ▼
train_baseline.py                               train_transformer.py
 TF-IDF + LogReg                                 HF Trainer, DistilBERT
   │  params, metrics, model  ─┐          ┌─  params, metrics, model │
   ▼                           ▼          ▼                          ▼
                          ┌───────────────────────────┐
                          │   MLflow tracking (local)  │  ./mlruns (file store)
                          │  params · metrics · model  │  + model registry
                          │  · taxonomy ver · data hash│
                          └─────────────┬──────────────┘
                                        │ promotion gate:
                                        │ macro-F1 must beat incumbent
                                        ▼
                              artifacts → ml_service loads "Production"
```

- **Package:** `ml/models/classification/` — `preprocess.py`, `train_baseline.py`, `train_transformer.py`, `evaluate.py`, `taxonomy.py`, `config.py`.
- **Experiment tracking:** **MLflow in local file mode** (`mlruns/`, no server, not a paid service — introduced now per blueprint's M1). Logs params, all metrics, confusion matrix + report artifacts, the fitted model, taxonomy version, and DVC data hash. `mlflow ui` for browsing.
- **Model saving:** logged as MLflow artifacts + registered in the local **Model Registry** with stages (Staging → Production). `ml_service` loads the `Production` model.
- **Reproducibility:** deterministic seeds; a single `make train` / documented commands reproduce a run.

---

## 6. Evaluation

### Metrics (all reported)
| Metric | Why |
|--------|-----|
| **Macro-F1** ⭐ | **Primary.** Averages F1 across classes equally → rare categories matter. The model-selection metric. |
| Weighted-F1 | Reflects real-world (imbalanced) performance. |
| Precision / Recall (per class) | Where the model over/under-predicts each category. |
| Accuracy | Reported but **secondary** — misleading under imbalance. |
| **Confusion matrix** | Surfaces confusable pairs (e.g. `Noise` vs `Noise` sub-splits, `Plumbing/Water` vs `Water System`). |
| Confidence calibration (reliability curve) | Are the confidence scores honest? Matters because confidence is a product output. |

### Error analysis
- Top misclassified examples per class; confusion clusters; `Other`-bucket inspection.
- **Baseline vs transformer** side-by-side table (macro-F1, weighted-F1, latency).
- **Citizen-phrasing probe set** (~50–100 hand-written free-text complaints like the objective's example, labeled by hand) → the acid test where the transformer should beat TF-IDF, justifying its inclusion.

**Which matters most:** **Macro-F1** for model selection (imbalance); **confusion matrix + probe set** for trustworthiness. Accuracy alone is explicitly *not* trusted.

---

## 7. Model packaging & versioning

- **Storage (M1, local):** MLflow file store `mlruns/` + registry; raw artifacts under `ml/models/artifacts/` (**git-ignored**). Cloud object store (MinIO/S3) is the documented scale-up path, not built now.
- **Metadata:** MLflow logs — hyperparams, metrics, **label mapping + taxonomy version**, **DVC data hash**, training timestamp, git commit. Plus a human-readable **model card** at `docs/model-cards/complaint-classifier.md` (data, intended use, metrics, limitations incl. descriptor-vs-free-text gap).
- **Versioning:** semantic model version (`classifier-vMAJOR.MINOR`) ↔ MLflow run id ↔ DVC data version. `ml_service` pins a version via config/env. **Promotion gate:** a challenger reaches `Production` only if it beats the incumbent's macro-F1 on the frozen holdout (champion/challenger discipline).

---

## 8. FastAPI integration

**Two-tier, per blueprint (gateway owns no model code; heavy torch deps isolated):**

```
Frontend ──POST /api/v1/classify──▶  Gateway (existing service)
                                       │  validate, log, orchestrate
                                       │  httpx ──POST /classify──▶  ml_service (NEW)
                                       │                              loads DistilBERT once
                                       │                              softmax → category+conf
                                       ◀──────────── {category, confidence, model_version} ──┘
                                     returns to frontend
```

### `ml_service` (new) — internal
`POST /classify`
```json
// request
{ "text": "streetlight has not been working for two weeks" }
// response
{ "category": "Street Light", "confidence": 0.97, "model_version": "classifier-v1.0", "top_k": [{"category":"Street Light","score":0.97}, ...] }
```
- Loads model at startup; stateless; `GET /health` reports model + version.
- Input validation: non-empty, length cap; returns 422 on bad input.

### `gateway` — public `POST /api/v1/classify`
```json
// request
{ "description": "streetlight has not been working for two weeks" }
// response
{ "category": "Street Light", "confidence": 0.97 }
```
- Validates (Pydantic), calls `ml_service` via `httpx` (timeout + retry), maps errors → **503** if ml_service is down (never crashes the gateway), logs the prediction.
- p95 latency target **< 500 ms** (NFR).

**Why a separate `ml_service` (not model-in-gateway):** keeps torch/transformers (~GB) out of the lightweight gateway image, lets inference scale independently, and preserves the clean seam the whole architecture depends on. Trade-off: one more service — accepted, and it's the blueprint's intended pattern from M1 onward.

---

## 9. Frontend integration (described only — no UI work in M1)

- Today `components/issue-form.tsx` calls `mockCategorize()` from `lib/mock-data.ts`.
- In **M2**, that call is replaced by a debounced `POST /api/v1/classify` with `{ description }`, rendering the returned `category` + `confidence` as the AI suggestion (the existing UI slot already exists — no redesign).
- The pre-wired client `lib/api.ts` already declares a `categorizeText`-style function; it points at this endpoint.
- **Taxonomy reconciliation:** the frontend's category `<Select>` options must be updated to the model's canonical taxonomy (M2). M1 only ships the endpoint + contract; **no frontend files change in M1.**

---

## 10. Repository changes (new folders/files M1 introduces)

```
civitrack-ai/
├── ml/
│   ├── data/
│   │   └── category_taxonomy.yaml          # NEW — complaint_type → canonical category map
│   ├── models/
│   │   └── classification/                 # NEW — training code
│   │       ├── __init__.py
│   │       ├── config.py                   # paths, hyperparams, taxonomy version
│   │       ├── taxonomy.py                  # load/apply taxonomy, rare→Other
│   │       ├── preprocess.py                # cleaning, split, gold artifacts
│   │       ├── train_baseline.py            # TF-IDF + LogReg  → MLflow
│   │       ├── train_transformer.py         # DistilBERT       → MLflow
│   │       ├── evaluate.py                  # metrics, confusion, probe set
│   │       └── artifacts/                   # NEW (git-ignored) saved models
│   ├── evaluation/
│   │   └── probe_set.jsonl                  # NEW — hand-written citizen-phrasing test cases
│   └── requirements-ml.txt                  # NEW — torch, transformers, scikit-learn, mlflow, datasets
├── services/
│   └── ml_service/                          # NEW — FastAPI inference service
│       ├── app/{main,core/config,core/logging,routers/classify,schemas/classify,predictor}.py
│       ├── tests/
│       ├── Dockerfile
│       ├── pyproject.toml
│       └── .env.example
├── services/gateway/app/
│   ├── routers/classify.py                  # NEW — public /api/v1/classify (proxy)
│   ├── schemas/classify.py                  # NEW
│   └── core/config.py                       # EDIT — add ML_SERVICE_URL
├── infra/docker-compose.yml                 # EDIT — add ml_service; gateway depends_on it
├── docs/model-cards/complaint-classifier.md # NEW — model card
├── mlruns/                                   # NEW (git-ignored) MLflow local store
└── .dvc/ , data/gold/                        # NEW — DVC init + frozen train/val/test
```

No changes under `frontend/`.

---

## 11. Risks

### Technical
- **Image size / deps:** torch+transformers make `ml_service` heavy (GB-scale). Mitigation: CPU-only torch wheel, slim base, model isolated from gateway.
- **Cold-start:** model load adds seconds at startup. Mitigation: load once at startup + healthcheck `start_period`.
- **New failure point:** ml_service down. Mitigation: gateway degrades to 503, never crashes; readiness gating.
- **Optimistic metrics:** descriptor≈label makes in-distribution scores look great. Mitigation: probe set + honest reporting; macro-F1 not accuracy.
- **Over-confidence / miscalibration** of transformer softmax. Mitigation: reliability curve; optional temperature scaling; τ threshold.
- **MLflow local store** concurrency (single-writer). Fine for one dev; noted for scale-up.

### Data
- **Seasonal bias** in the 6-day slice → re-ingest 12-month stratified sample (§1).
- **Class imbalance** & a noisy `Other` bucket → class weights, support thresholds, monitoring.
- **Label noise / ambiguity** (overlapping Noise/Water types) → curated taxonomy merges them.
- **Distribution shift — the big one:** 311 descriptors ≠ verbose citizen free-text. Mitigation now: probe set; later (M2+): fine-tune on real submissions, data augmentation/paraphrasing.
- **Taxonomy subjectivity:** mapping is a judgment call → version-controlled + documented in the model card.

### Future scalability
- Single-instance ml_service → horizontal scaling + a real model registry/object store later.
- Retraining cadence & drift-triggered retrain (M9 territory) — not built now.
- GPU + request batching if a larger model / higher throughput is needed later.
- Model rollout (blue-green via registry stage) — pattern established, automated later.

---

## M1 roadmap · implementation order · commit plan

Each sub-step ends in a verifiable, committable state. **Order:**

| # | Sub-step | Output | Suggested commit |
|---|----------|--------|------------------|
| 1 | **Data & taxonomy** — DVC init, taxonomy YAML, (optional) 12-month re-ingest, gold splits | frozen train/val/test + label map | `feat(m1): dvc init, category taxonomy, stratified gold splits` |
| 2 | **Baseline** — TF-IDF + LogReg + MLflow + evaluate | baseline metrics logged | `feat(m1): tf-idf + logistic-regression baseline with mlflow` |
| 3 | **Transformer** — DistilBERT fine-tune + evaluate + probe set | challenger metrics; beats baseline on probe | `feat(m1): fine-tune distilbert classifier + probe-set eval` |
| 4 | **Model packaging** — registry promotion, model card | `Production` model + card | `feat(m1): register production classifier + model card` |
| 5 | **ml_service** — FastAPI serving `/classify`, Dockerfile, tests, compose | container serves predictions | `feat(m1): ml_service inference api (distilbert)` |
| 6 | **Gateway integration** — `/api/v1/classify` proxy + schemas + config | public endpoint live end-to-end | `feat(m1): gateway /api/v1/classify -> ml_service` |
| 7 | **Verification** — full-stack test, latency check, docs | M1 verified | `test(m1): end-to-end classify verification + docs` |

**Dependency order:** 1 → 2 → 3 → 4 → (5 needs 4) → 6 → 7. Steps 2 and 3 both depend on 1; 3 is compared against 2.

**Definition of done (M1):** `POST /api/v1/classify {"description": "..."}` returns `{category, confidence}` from a DistilBERT model that beats the TF-IDF baseline on macro-F1 and on the citizen-phrasing probe set, served by `ml_service`, tracked in MLflow, versioned via DVC, documented in a model card — all running locally, no paid APIs.

---

*No M2 work (frontend) and no other AI features are in scope. M1 = one classifier, done properly.*

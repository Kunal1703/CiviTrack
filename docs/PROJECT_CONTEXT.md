# CiviTrack AI — Project Continuity & Handoff (PROJECT_CONTEXT.md)

> **This document is the continuity reference for future Claude Code sessions.**
> It records the **actual, verified state** of the repository through **M3 (complete)**.
> Verified against the real repo/docs/DB on **2026-08-08**. Where something is not
> implemented, it is marked **NOT IMPLEMENTED / PLANNED / DEFERRED / NEEDS VERIFICATION**.
> **Do not assume this document is more authoritative than the code.** On any
> contradiction, investigate the code/data and update this file.

---

> **Product/UX upgrade (application layer, post-M3 — NOT M4).** On top of the
> completed ML milestones, CiviTrack AI was evolved into a **role-based two-sided
> platform**: real auth (argon2 + JWT httpOnly cookies, citizen/admin roles in a new
> `app` schema), a citizen experience (`/citizen/*`), an admin operations workspace
> (`/admin/*`), a scrollytelling public landing (`/`), a developer showcase
> (`/architecture`), and a **Delhi-based product experience** using clearly-labeled
> **seeded demo data** (never NYC relabeled as Delhi). This added no new ML — M1/M3
> are reused unchanged; M4 remains unstarted. **See [`PRODUCT_UX.md`](PRODUCT_UX.md)
> for the full role model, auth architecture, information architecture, `app`-schema
> DB changes, the NYC-vs-Delhi dataset boundary, map/hotspot logic, and the UI/UX +
> animation strategy.**

## 1. Project overview
**CiviTrack AI** is an end-to-end AI/ML-powered civic-complaint intelligence platform built on **real NYC 311 open data**. It turns raw complaints into: automatic **classification**, **semantic search**, **related-complaint discovery**, and **duplicate detection** (with more milestones planned: resolution-time regression, geospatial intelligence, forecasting, LLM/RAG).

- **Problem:** municipal complaint operations are reactive and manual; there is no system that turns the raw complaint stream into classified, related, deduplicated, explainable intelligence.
- **Why NYC 311:** a real, large, public dataset with categories, timestamps, geolocation, agency, and resolution timestamps — credible scale and labels (not synthetic).
- **Three simultaneous purposes:** (1) a genuine ML/Data-Science college project, (2) a strong GitHub portfolio piece, (3) something demonstrable in hackathons/internships/interviews.
- **Guiding principle:** real data → proper ML methodology → measurable evaluation → explainability → production integration → polished UI. Baselines before deep models; document limitations; never call a rule "AI".

**One-paragraph description:** *CiviTrack AI is an end-to-end ML-powered civic intelligence platform that uses real NYC 311 data to classify complaints (DistilBERT), discover semantically related incidents and detect potential duplicates via transformer embeddings + spatial-temporal reasoning (pgvector + PostGIS), and cluster complaint patterns — served through a Dockerized FastAPI gateway / ml_service / PostgreSQL stack and a premium Next.js frontend.*

---

## 2. Current architecture (actual)
```
Frontend (Next.js dev server, NOT containerized)
   │  /api/* proxied via next.config.mjs rewrite → GATEWAY_URL
   ▼
FastAPI Gateway  (Docker · container civitrack-gateway · host :8000)
   │  validation, routing, public API contracts, 503-degrade
   ▼  httpx
ML Service  (Docker · container civitrack-ml-service · host :8001 · image 0.2.0)
   │  DistilBERT classifier + MiniLM embedder + read DB pool
   ▼  psycopg
PostgreSQL 16  (Docker · container civitrack-postgres · host :5433 → internal 5432)
   ├── PostGIS 3.4.3   (geospatial: geom column, ST_DWithin)
   └── pgvector 0.8.5  (semantic.complaint_embeddings, HNSW cosine)
```
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui, Framer Motion 13, next-themes. **Runs as a dev server / would deploy Vercel-style — it is NOT a Docker Compose service.**
- **Gateway (`services/gateway`):** FastAPI; owns **no** model code; endpoints: `/health`, `/health/db`, `/config`, `/api/v1/classify`, `/api/v1/semantic/{search,related,duplicate-check}`. Talks to ml_service via `ML_SERVICE_URL` (compose: `http://ml_service:8001`).
- **ML Service (`services/ml_service`):** FastAPI; loads the **DistilBERT classifier** (mounted artifact) + **all-MiniLM-L6-v2 embedder** (loaded offline from a mounted HuggingFace cache) + a **psycopg connection pool** for pgvector queries. Endpoints: `/classify`, `/semantic/{search,related,duplicate-check}`, `/health`.
- **Database:** one Postgres image bundling **PostGIS + pgvector** (`infra/docker/postgres/Dockerfile`).
- **Orchestration:** Docker Compose (`infra/docker-compose.yml`) — services: `postgres`, `gateway`, `ml_service` (+ `pgdata` volume). **No Kubernetes/Kafka/Redis/MinIO/extra vector DB.**
- **Key env/config:** `POSTGRES_HOST_PORT` (host 5433), `GATEWAY_PORT` (8000), `ML_SERVICE_PORT` (8001), `HF_CACHE` (host HF cache mounted read-only into ml_service for the offline embedding model), `GATEWAY_URL` (frontend → gateway). Secrets in `infra/.env` (git-ignored); `.env.example` committed.

---

## 3. Repository structure (actual, important paths)
```
civitrack-ai/
├── frontend/               # Next.js app (UI). NOT containerized.
│   ├── app/                # pages: /, /report, /issues, /issues/[id], /dashboard, /admin
│   ├── components/         # ui-kit.tsx (design system), ai-analysis, semantic-*, similarity, etc.
│   ├── components/ui/      # shadcn primitives
│   ├── lib/                # api-client.ts, semantic-api.ts, categories.ts, motion.ts
│   └── hooks/              # use-classify.ts, use-duplicate-check.ts
├── services/
│   ├── gateway/app/        # FastAPI: core/, routers/{system,classify,semantic}, schemas/
│   └── ml_service/app/     # FastAPI: predictor.py, embedder.py, semantic_store.py,
│                           #          embed_normalize.py (vendored), routers/, schemas/
├── ml/
│   ├── data/               # M0 pipeline: ingest, clean, validate, load, ingest_stratified
│   ├── models/classification/  # M1: taxonomy, train_baseline, train_transformer, evaluate,
│   │                       #     compare_models, package_model, config, text.py; artifacts/ (git-ignored)
│   ├── semantic/           # M3: config, normalize, embedder, generate, vector_store,
│   │                       #     benchmark, cluster, evaluation/, reports/, tests/
│   ├── notebooks/          # M0 EDA
│   └── reports/            # M0 data-quality report
├── db/
│   ├── init/01-extensions.sql        # first-boot: CREATE EXTENSION postgis, vector
│   ├── migrations/                    # 0001–0003 numbered reversible SQL (up/down)
│   └── migrate.py                     # tiny psycopg migration runner (up/down/status)
├── infra/                  # docker-compose.yml, docker/postgres/Dockerfile, .env(.example)
├── docs/                   # BLUEPRINT, M1_DESIGN, M3_DESIGN, M3_REPORT, model-cards/, THIS FILE
├── archive/backend-flask-v1/          # preserved legacy Flask/MySQL prototype (inactive)
└── README.md
```
**Note:** there is **no M0_DESIGN.md and no M2_DESIGN.md** (those milestones were executed without standalone design docs; only **M1** and **M3** have design docs). No `M4_DESIGN.md` yet (correct — M4 not started).

---

## 4. M0 — Foundation / Data / Infrastructure ✅
- **Monorepo restructure:** original Next.js frontend + disconnected Flask/MySQL backend → moved frontend into `frontend/` via `git mv` (history preserved); legacy Flask/MySQL **archived** to `archive/backend-flask-v1/` (not deleted).
- **Infra pivot:** Flask/MySQL → **FastAPI + PostgreSQL 16 + PostGIS 3.4.3 + pgvector 0.8.5 + Docker Compose** (extensions verified; container healthy).
- **Data pipeline:** NYC 311 ingestion (Socrata API) → **Bronze → Silver** cleaning (`ml/data/`); EDA notebook + data-quality report (`ml/reports/`).
- **Gateway foundation:** FastAPI `/health`, `/health/db`, `/config`; env-driven config; structured logging.
- **Known correction (fixed in M3):** the original M0 Postgres load was ~**50k** rows; M1 produced the canonical ~**204k** parquet; Postgres was reconciled to 204k in M3.

---

## 5. M1 — Classification ✅
- **Dataset:** NYC 311 re-ingested **stratified across all 12 months of 2024** (~204k) → canonical labeled dataset **201,537 rows**; split ≈ **train 141,075 / val 30,231 / test 30,231** (`data/gold/`). Fixed the seasonal bias of the winter-heavy 50k slice.
- **Taxonomy:** ~150 raw complaint types (heavy imbalance; 75 types < 50 rows) → curated **19 categories (18 + Other)**, version-controlled (`ml/data/category_taxonomy.yaml`).
- **Data reality:** NYC 311 has **no free-text complaint body**; `complaint_type` is the **label** (can't be input — leakage); the text field used is **`descriptor`** (short/formulaic). Preprocessing is a **single source-agnostic function**; the dataset loader is **swappable** so a richer free-text source can replace `descriptor` later.
- **Models & measured results** (from `docs/model-cards/complaint-classifier.md`):

  | Metric | DistilBERT | TF-IDF + LogReg (baseline) |
  |---|---|---|
  | Test macro-F1 (in-distribution) | 0.9626 | **0.9756** |
  | Test accuracy | 0.9792 | 0.9904 |
  | **Probe accuracy** (citizen phrasing) | **0.5556** | 0.3889 |
  | **Probe macro-F1** | **0.4497** | 0.3525 |

  **Honest nuance:** DistilBERT scores *slightly below* the TF-IDF baseline **in-distribution** because it was trained on a **CPU-constrained ~6k-sample subset**; it wins **decisively on the citizen-phrasing probe** (generalization). The served model is proof-quality; scaling up (more data/epochs/GPU) is a config change, not an architecture change.
- **Serving:** separate **`ml_service`** holds the model (gateway owns no model code) → `POST /api/v1/classify`. **MLflow** tracks runs; **model card** written. Docker path verified end-to-end. **Local model, no paid API.**

---

## 6. M2 — Product Integration + Premium UI/UX ✅
- **Real AI integration:** removed the mock classification flow; `frontend/lib/api-client.ts` + `useClassify` hook → `/api/v1/classify` (Next.js `/api` **proxy** rewrite → gateway) → ml_service → DistilBERT. Debounced, **abortable**, non-blocking, error-handled, with confidence display + **AI suggestion / manual override**. The Report page performs **real ML inference**.
- **Design system (reusable asset — future milestones MUST extend, not replace):** `frontend/components/ui-kit.tsx` (`PageContainer`, `Reveal`, `Eyebrow`, `SectionHeader`, `PageHeader`, `StatCard`, `StatGrid`) + `lib/motion.ts` shared variants. Glassmorphism (`.glass`), gradients (`.text-gradient`), premium shadows, ambient aurora background, **Framer Motion**, **command palette (⌘K)**, page transitions, dark/light themes (next-themes), responsive layouts, **accessibility + reduced-motion** (`MotionConfig reducedMotion="user"`).
- **Screens redesigned:** Home, Report (flagship live AI), Issues, Dashboard, Admin — all composed from the shared kit for one coherent look.
- **Tooling available:** shadcn/ui, Framer Motion, the **21st.dev MCP server**, and the **UI/UX Pro** package (use for premium patterns; adapt, do not copy verbatim; keep one design system).
- **Caveat:** issue persistence has no backend endpoint yet — the Report form submit is simulated + toast (classification is the real part). Dashboard/Admin analytics use mock data for display.

---

## 7. M3 — Semantic Intelligence ✅ (detailed)
### Data reconciliation
Postgres `silver.complaints_311` was reloaded from the canonical M1 parquet → **204,000 rows in Postgres (200,782 geocoded)**; the labeled subset is **201,537**. Embeddings now correspond to the same dataset as the M1 classifier.

### Embedding benchmark (measured, `docs/M3_REPORT.md`)
| Model | dim | curated AUC | dup mean-sim |
|---|---:|---:|---|
| TF-IDF (baseline) | — | 0.951 | 0.21 |
| **all-MiniLM-L6-v2** ✅ | 384 | 0.986 | 0.76 |
| BGE-small-en-v1.5 | 384 | 1.000 | 0.85 |

**Selected all-MiniLM-L6-v2** — BGE-small's AUC edge is one pair on a 24-pair set; MiniLM is lighter/faster on CPU with **wider similarity spread** (cleaner thresholds). Both are 384-d → BGE-small is a drop-in future swap.

### Embeddings & vector store
- **201,537 vectors** (384-d) in `semantic.complaint_embeddings`; but only **~776 unique descriptors** (categorical data) → embed each unique text once and fan out per complaint (**encode 3.7 s**, insert 38.8 s).
- **~605 MB** storage (vectors + **HNSW cosine** index + btree). Provenance columns: `embedding_model`, `embedding_version`, `data_version` (models/versions coexist; a different-dim model gets a new table → old vectors never corrupt).

### Semantic retrieval
Cosine similarity (unit-normalized embeddings), HNSW ANN. **Precision@5 = 0.76, MRR = 0.80** (same-category relevance, 200-query sample).

### Duplicate detection (the headline)
A duplicate = **high semantic similarity AND nearby location (PostGIS `ST_DWithin`) AND nearby time** — threshold **data-derived (0.59, precision-favoring)**.
- **Natural language (curated):** TF-IDF F1 **0.17** vs MiniLM F1 **0.95** → embeddings crush classical NLP on reworded complaints.
- **Derived-real (categorical):** similarity-only precision **0.56** → **+ spatial gate → precision 1.00 (F1 1.00)**. Proves the gate is essential (two different potholes are *related*, not duplicates).

### Clustering (offline, analytical)
**HDBSCAN** (14 clusters, silhouette **0.20**, noise 82%) vs **K-Means** baseline (silhouette **0.04**). **PCA/UMAP for visualization only** (never as the clusterer). Honest: clusters largely track categories; interpretability limited.

### Production integration
- `ml_service`: `/semantic/{search,related,duplicate-check}` (embedder + `semantic_store` pgvector queries + PostGIS gate).
- `gateway`: `POST /api/v1/semantic/{search,related,duplicate-check}` (validated, proxied).
- **Frontend:** duplicate warning in the Report flow, related complaints on the issue detail page, semantic search on Issues, an **admin semantic explorer**, animated similarity bars, reveals, reduced-motion.

### Verification
Full **Docker** path verified: frontend → gateway (8000) → ml_service (8001) → pgvector/PostGIS; semantic search + duplicate-check work; validation returns 422; **tests pass** (embed_normalize parity + API validation). Migrations `0001–0003` applied.

### Query latency (measured)
**p50 ≈ 820 ms** per query — dominated by single-query **CPU** embedding; HNSW retrieval itself < 10 ms. Faster on GPU/batched (documented, not built).

---

## 8. M3 important data limitations (academic honesty — do not hide)
- **NYC 311 has no rich citizen free-text.** We embed **`descriptor`**, which is **short and formulaic**.
- **~201,537 complaints ↔ only ~776 unique descriptors** (verified) → many complaints share identical text → **all same-descriptor complaints get the same vector**. Descriptor-based semantic similarity can be **degenerate**.
- **Why spatial-temporal gating was necessary:** because identical-vector complaints can't be told apart by text, semantic similarity **alone** cannot distinguish a true duplicate incident from a same-descriptor complaint elsewhere (precision 0.56). Adding the **spatial + temporal gate** fixed precision to 1.0. This is a strong story: *data analysis → discovered model limitation → added spatial/temporal reasoning → better precision.*
- **Evaluation tracks are separated:** a **descriptor track** (can be artificially easy) and a **citizen-phrasing track** (curated). **Synthetic pairs are clearly labeled and never presented as real ground truth.**

---

## 9. Current ML capabilities
| Capability | Algorithm | Status | Milestone | Evaluation |
|---|---|---|---|---|
| Complaint classification | TF-IDF+LogReg baseline; DistilBERT | ✅ implemented | M1 | macro-F1 (test 0.96), probe (0.56/0.45) |
| Semantic embeddings | all-MiniLM-L6-v2 (384-d) | ✅ implemented | M3 | benchmark AUC 0.986 vs TF-IDF 0.951 |
| Similarity search | pgvector cosine + HNSW ANN | ✅ implemented | M3 | Precision@5 0.76, MRR 0.80 |
| Duplicate detection | embeddings + PostGIS spatial + temporal gate | ✅ implemented | M3 | F1 0.95 (natural); gate precision 0.56→1.0 |
| Clustering | HDBSCAN (+ K-Means baseline, PCA/UMAP viz) | ✅ implemented | M3 | silhouette 0.20 vs 0.04 |

**Future (NOT implemented):** resolution-time **regression** (M4), **geospatial** intelligence/hotspots (M5), **time-series forecasting** (M6), **LLM/RAG** (M7).

---

## 10. Current database state (actual)
- **PostgreSQL 16 + PostGIS 3.4.3 + pgvector 0.8.5** (one bundled image).
- **`silver.complaints_311`** — 204,000 rows. Columns incl. `unique_key` (311 id, text), `created_date`, `closed_date`, `resolution_hours`, `agency`, `complaint_type`, `descriptor`, `status`, `borough`, `incident_zip`, `latitude`, `longitude`, `geo_valid`, **`geom` (PostGIS Point)**. Created by the pandas pipeline (`to_sql` replace) — **no PK/FK constraints on it**. Indexes: GiST on `geom`, btree on `created_date`.
- **`semantic.complaint_embeddings`** — 201,537 rows; `embedding vector(384)`, `complaint_id`, `source_column`, `text_snippet`, `embedding_model`, `embedding_version`, `data_version`; unique `(complaint_id, embedding_model, embedding_version)`; indexes: **HNSW `vector_cosine_ops`**, btree on `complaint_id` and `(model,version)`. **No FK to silver** (silver is rebuilt by the pipeline; a FK would block reloads).
- **`semantic.descriptor_clusters`** — offline cluster assignments (HDBSCAN) + PCA `x,y` for viz.
- **Migrations:** **numbered reversible SQL** in `db/migrations/` (`0001_semantic_embeddings`, `0002_embeddings_hnsw_index`, `0003_descriptor_clusters`), applied by `db/migrate.py` (tracks `public.schema_migrations`). **Alembic is NOT used** (only a transitive MLflow dependency). First-boot extensions via `db/init/01-extensions.sql`.

---

## 11. ML / experiment infrastructure (actual)
- **MLflow:** local **SQLite** backend (`mlruns/mlflow.db`; git-ignored). Experiments: `complaint-classification` (M1), `semantic-embeddings` (M3: benchmark, generate, evaluation, clustering).
- **Preprocessing:** classifier uses `ml/models/classification/text.py::clean_text` (strips punctuation); embeddings use `ml/semantic/normalize.py::embed_normalize` (**lighter** — keeps punctuation/case) **vendored** into `services/ml_service/app/embed_normalize.py` (parity test enforces they match).
- **Model artifacts:** DistilBERT saved under `ml/models/classification/artifacts/transformer/` (**git-ignored**, ~268 MB `model.safetensors`); mounted read-only into ml_service. Embedding model (**MiniLM**) lives in the **HuggingFace cache** (git-ignored), mounted into ml_service (offline).
- **Vectors:** stored in Postgres (a Docker volume), not in git.
- **Reports:** `ml/semantic/reports/{benchmark,evaluation,clustering}.json`; `ml/models/classification/reports/` (M1 comparison/confusion).
- **DVC:** **PLANNED / NOT INITIALIZED.** Reproducibility currently relies on deterministic generation, content hashes, and MLflow. Do **not** claim DVC is active.

---

## 12. Large-file / Git rules
- **Known issue:** the DistilBERT `model.safetensors` (~**268 MB**) exceeds **GitHub's 100 MB** file limit and previously caused a push failure. **Do NOT commit large model binaries.**
- **Never commit:** `.env` / secrets / API keys, large datasets, model binaries (`*.safetensors`, `*.pkl`, `*.pt`), `*.parquet`, generated vector DBs, `mlruns/`, `node_modules/`, virtualenvs, `.next/`. (All covered in `.gitignore`.)
- **Artifact strategy (actual):** code/config/schemas/migrations/docs/**evaluation definitions**/small metadata live in git; large artifacts stay **local/cached** and are **reproducible** (trained/downloaded on demand; models mounted into containers). `.env.example` is committed; real `.env` is ignored.

---

## 13. UI/UX rules for future frontend milestones
Future frontend work **must reuse and extend the M2 design system** (`frontend/components/ui-kit.tsx` + `lib/motion.ts`), never redesign from scratch. Use: glassmorphism, gradients, Framer Motion, smooth reveals/transitions, responsive layouts, meaningful micro-interactions, dark/light themes, **accessibility + reduced-motion**, professional typography, polished loading/empty states, animated charts/counters. Leverage **21st.dev MCP**, **UI/UX Pro**, **shadcn/ui** for premium patterns (adapt, don't copy verbatim). **Rule:** professional visual design **>** excessive effects; animations must communicate state/hierarchy/interaction; keep one coherent system.

---

## 14. Future roadmap
| Milestone | Objective | ML concepts | Product capability | Dependencies | Key risks |
|---|---|---|---|---|---|
| **M4** (next) | Resolution-time prediction | supervised **regression**, feature engineering, baseline vs strong model, SHAP, prediction intervals | "expected resolution time" + explanation on complaints | silver timestamps; may reuse M3 embeddings as features | **target leakage** (must exclude closed_date/resolution/status); heavy-tailed target; right-censoring (open complaints) |
| **M5** | Geospatial intelligence | spatial clustering, **hotspot stats (Getis-Ord Gi\*)**, HDBSCAN/spatial | hotspot maps, ward/zone intelligence | PostGIS (M0), M3 spatial gate | spatial-stat validity; map perf |
| **M6** | Time-series forecasting | seasonality/trend, backtesting, forecast metrics | complaint-volume forecasts | historical aggregates | data window; backtest rigor |
| **M7** | LLM / RAG | grounded generation, retrieval, tool use | summaries, recommendations, NL query | M1/M3 (+M4/M5/M6) outputs | cost, hallucination, secrets mgmt; use LLM only where reasoning adds value |

---

## 15. M4 starting context (most important for the next session)
**M4 = Resolution-Time Prediction / Regression + Explainability. M4 HAS NOT STARTED.**

Expected ML concepts: target engineering, regression, feature engineering, **baseline → stronger model comparison**, regression metrics, error analysis, **SHAP explainability**, **uncertainty/prediction intervals** (if justified), model serving, frontend integration, Docker verification.

**Preliminary data facts already observed (verify again before use):**
- `silver.complaints_311` has `resolution_hours` for **200,180 / 204,000 (98.1%)** rows (`created→closed`); ~2,235 still open (**right-censored**); **3,753 zero-duration** closures.
- Target is **extremely heavy-tailed**: p25 0.9h, **p50 7.2h**, p90 555h, p99 7,319h, max ~22,560h → **log transform likely justified**.
- **Agency dominates** resolution time (NYPD median ~1h vs HPD ~95h vs DPR ~677h) → an **agency/category-median baseline will be strong** (LightGBM must beat it).
- Feature availability is high (agency 100%, geo ~98%); **199,417 closed complaints already have M3 embeddings** (reusable text features).

**The next Claude Code session MUST, in order:**
1. Inspect actual NYC 311 **timestamp fields** and derive the target carefully.
2. Inspect the **resolution-time distribution** (confirm the numbers above).
3. Identify **leakage risks** (exclude `closed_date`, `resolution_hours`, `status`, `updated_at` from features — explicit allow-list).
4. Determine a **defensible target** (train on closed; document censoring).
5. Inspect available **features** (temporal, categorical, geo, optional M3 embeddings).
6. Read `docs/BLUEPRINT.md` (M4 = §763–771: LightGBM + engineered features + quantile/conformal intervals + SHAP + leakage tests + slice error analysis; metrics MAE/RMSE + interval coverage).
7. Create **`docs/M4_DESIGN.md`** (problem, target, leakage analysis, features, baseline, candidate models, metrics, split strategy, error analysis, SHAP, intervals, API, frontend, Docker, testing, phases, commit plan).
8. **Wait for approval.**
9. Only then implement.

**Do NOT pre-decide the final regression model without examining the actual data.** (LightGBM is the blueprint's leaning, but confirm on the data and always ship a baseline first.)

---

## 16. Future milestone dependencies
- **M3 → M4:** M3 MiniLM embeddings are reusable as **text features** for the resolution regressor.
- **M0 PostGIS → M5:** the geospatial column/index and the M3 spatial gate are the foundation for hotspot analysis.
- **M1 classification →** downstream analytics (category is a feature/dimension everywhere).
- **M4 resolution prediction →** future prioritization/SLA views.
- **M6 forecasting** consumes historical complaint aggregates (temporal data already present).
- **M7 LLM/RAG** consumes outputs of M1/M3/M4/M5/M6 (grounded reasoning over the platform's own data).

---

## 17. Important architectural decisions (log)
| Decision | Rationale |
|---|---|
| **FastAPI** (not Flask) | async, Pydantic validation, native ML-serving ecosystem |
| **PostgreSQL** (not MySQL) | one engine for relational + geospatial + vector |
| **PostGIS** | real spatial queries (radius, distance) — duplicate gate, future hotspots |
| **pgvector** | vector search in the same DB (no separate vector store) |
| **Separate `ml_service`** | keep heavy model deps out of the gateway; clean seam; independent scaling |
| **Docker Compose** | reproducible local/prod-ish stack without k8s overhead |
| **MiniLM production embeddings** | best CPU/size/quality trade-off; 384-d (BGE-small drop-in) |
| **TF-IDF baselines everywhere** | prove ML value over classical NLP; honest comparison |
| **Spatial-temporal duplicate gate** | semantic similarity alone can't identify incidents (categorical data) |
| **HDBSCAN + K-Means comparison** | density/noise handling vs a baseline; measured, not asserted |
| **Numbered reversible SQL migrations** | project uses raw SQL/pandas (no ORM) → Alembic unnecessary |
| **No k8s/Kafka/extra vector DB** | avoid infrastructure for buzzwords; keep it simple/reproducible |
| **Monorepo (frontend/services/ml/db/infra)** | one repo, clear boundaries, shared docs |
| **M2 design system (ui-kit)** | one coherent premium UI; future milestones extend it |

---

## 18. Things we must NOT do
- Do **not** rebuild completed milestones (M0–M3) without evidence of a real problem.
- Do **not** start M5 before M4 is complete; do **not** silently jump milestones.
- Do **not** replace the working architecture unnecessarily; do **not** re-embed 201k or replace MiniLM without evidence.
- Do **not** add random AI features; do **not** use an LLM for deterministic ML without justification.
- Do **not** commit secrets or large model binaries; do **not** commit `.env`.
- Do **not** present synthetic evaluation as real-world ground truth; do **not** hide dataset limitations.
- Do **not** introduce infrastructure for buzzwords; do **not** sacrifice ML correctness for UI.

---

## 19. Verification status
| Milestone | Status | Verification |
|---|---|---|
| **M0** | ✅ COMPLETE | Docker/Postgres/PostGIS/pgvector up; ingestion + Bronze→Silver + EDA |
| **M1** | ✅ COMPLETE | classifier trained/evaluated; ml_service + gateway; Docker e2e; model card; MLflow |
| **M2** | ✅ COMPLETE | real `/api/v1/classify` from frontend; premium design system; builds clean |
| **M3** | ✅ COMPLETE | embeddings + pgvector + retrieval/duplicate/clustering evaluated; semantic APIs; frontend; **Docker e2e verified**; tests pass; docs |
| **M4** | ✅ COMPLETE | LightGBM resolution-time regressor (beats agency×category-median baseline on MAE; MedAE ~8h), CQR quantile intervals, SHAP; served via ml_service→gateway (admin-only); admin "resolution insights" UI; `docs/M4_DESIGN.md`, `M4_REPORT.md`, model card. Trained on NYC 311; not applied to Delhi. |
| **M5** | 🔒 PLANNED | — |
| **M6** | 🔒 PLANNED | — |
| **M7** | 🔒 PLANNED | — |

Git: working tree clean at handoff; history contains committed M0–M3 work. **Frontend is not containerized** (dev server). **DVC not initialized.**

---

## 20. Handoff instructions (for the next Claude Code session)
- **This document is the continuity reference for future Claude Code sessions.**
- **Before implementing M4, read:** `docs/PROJECT_CONTEXT.md` (this file), `docs/BLUEPRINT.md`, `docs/M3_DESIGN.md`, `docs/M3_REPORT.md`, `docs/model-cards/`, and the current repository implementation.
- **Then inspect the actual repository and data** (Postgres `silver.complaints_311` timestamps/resolution, features, leakage) — do not trust this document over the code.
- **Do not assume this document is more authoritative than the actual code.** If a contradiction exists, investigate it and **update this document**.
- **Do not begin M4 implementation until M4 has been designed (`docs/M4_DESIGN.md`) and approved.**
- Preserve: the M2 design system (extend, don't replace), the git/large-file rules, honest limitations, and the "baseline before strong model / measure everything" methodology.

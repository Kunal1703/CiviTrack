# CiviTrack AI — Intelligent Urban Complaint Management System
## Technical Blueprint & Architecture Roadmap

> **Status:** Design document (v1.0). No implementation yet.
> **Author role:** Lead Architect
> **Purpose:** Redesign the existing prototype into a flagship AI/ML/Data-Science portfolio project and a plausible smart-city decision-support platform.
>
> **🔒 Locked decisions (2026-07-24):**
> - **Data source: NYC 311 open data** — the schema, category taxonomy, and every model are anchored to it (see Decision A, §11, §13).
> - **Scope target: Core through Milestone M7** (data → NLP → resolution-time regression → geospatial → forecasting → LLM layer, deployed). **M8 (Computer Vision) is explicitly deferred to future work**, and M9 (MLOps/deploy) still applies as the finish line for the M0–M7 core.

---

## 0. How to read this document (and the two decisions that shape everything)

Before the 30 sections, two calls define the whole project. If you disagree with these, most of what follows changes — so read these first.

### Decision A — Ground the project in *real* open data, not synthetic complaints.
The single biggest weakness of "AI complaint system" portfolio projects is that they have **no data**, so every model is trained on a few hundred fabricated rows and none of the results are believable. A recruiter who is an ML engineer will spot this in 60 seconds.

**Recommendation:** Build the entire platform on top of real municipal **311 open data** — NYC 311, Chicago 311, or SeeClickFix exports. These give you **millions of real complaints** with category, free-text description, timestamps, geolocation, agency, *and actual resolution timestamps*. That single dataset is the backbone for:
- NLP classification (real categories + real text)
- Resolution-time regression (real created→closed deltas)
- Time-series forecasting (real daily/weekly volumes, real seasonality)
- Geospatial hotspot analysis (real coordinates)
- Duplicate detection & clustering (real near-duplicate reports)

Your own app's user-submitted complaints then become a *second, live* stream that flows through the same models. **This is the difference between a demo and a portfolio piece.**

> **The one thing 311 data does not give you: images.** That is why Computer Vision is treated as a separate, optional track with its own dataset (see §19 and Decision B).

### Decision B — Depth over breadth. Do not build all 14 features at once.
Your feature list is excellent as a *vision*, but a portfolio project that implements 14 ML features shallowly is weaker than one that implements 6 with genuine rigor (proper baselines, error analysis, evaluation, explainability, monitoring). Several of your listed features also **collapse into one another** and should share infrastructure rather than be built separately:

| You listed as separate features | Reality |
|---|---|
| Duplicate detection, Complaint clustering, Hotspot detection, Natural-language querying | All four are powered by **one embedding + vector-search layer**. Build the embedding layer once; these become four views on it. |
| Severity prediction, Priority detection | Same model, and both have a **weak ground-truth problem** (see §17). Treat carefully. |
| AI summaries, Action recommendations, NL querying | All three are **one LLM/RAG service** with different prompts. |

The milestone plan (§ final) sequences these so each builds on the last instead of sprawling.

---

## 1. Overall project vision

CiviTrack AI is an **AI-powered decision-support platform for municipal operations teams**. It is not a complaint form with a database behind it. It is a system that:

1. **Ingests** citizen complaints (text + optional image + location) from web, and historical 311 feeds.
2. **Understands** them automatically — category, severity, likely resolution time, duplicates, and the department that should own them.
3. **Aggregates** them into spatial and temporal intelligence — hotspots, emerging trends, and volume forecasts.
4. **Recommends** actions — where to send crews next week, which backlog items are aging past SLA, plain-language summaries for a city manager.
5. **Explains** every automated decision, because public-sector automation without explainability is legally and ethically a non-starter.

The mental model to aim for: **"Palantir/Salesforce-for-cities, but focused and demoable."** The user story that sells it: *a city operations manager opens a dashboard on Monday morning and is told, in plain English, "Drainage complaints in Ward 7 are up 40% and trending toward last year's monsoon spike; 3 aging tickets breach SLA Thursday; recommend pre-positioning a crew."*

---

## 2. Real-world problem statement

Municipalities receive tens of thousands of citizen complaints across fragmented channels (phone, web, app, walk-in). The operational reality:

- **Manual triage doesn't scale.** Staff hand-route and hand-prioritize; categorization is inconsistent and slow.
- **No forward view.** Cities react to today's queue with no forecast of next week's load, so crews and budgets are allocated reactively.
- **Duplicates inflate everything.** The same pothole reported 15 times looks like 15 problems and distorts every metric.
- **Data exists but isn't intelligence.** Cities sit on years of 311 history that is never mined for patterns, seasonality, or recurring hotspots.
- **Black-box automation is unacceptable** in government. Any AI decision affecting public services must be auditable and explainable.

**Problem statement:** *Municipal complaint operations are reactive, manual, and blind to their own historical patterns. There is no system that turns the raw complaint stream into prioritized, forecasted, explainable operational decisions.*

---

## 3. Project goals

**Product goals**
- Auto-classify and auto-prioritize incoming complaints with measured accuracy and confidence.
- Collapse duplicates and surface hotspots so operators see *problems*, not *reports*.
- Forecast complaint volume by category and geography to enable proactive resourcing.
- Provide plain-language summaries, natural-language search, and action recommendations to non-technical operators.
- Make every automated decision explainable and auditable.

**Portfolio / engineering goals** (equally important, be explicit about these)
- Demonstrate the **full ML lifecycle**: data → EDA → baseline → advanced model → evaluation → serving → monitoring → retraining.
- Demonstrate **MLOps**: experiment tracking, model registry, reproducible pipelines, drift monitoring.
- Demonstrate **production engineering**: containerized microservices, CI/CD, tests, auth, observability.
- Demonstrate **judgment**: baselines before deep learning, honest error analysis, cost-aware LLM use.

**Explicit non-goals** (scoping is a senior signal)
- Not a real-time streaming/Kafka system (batch + async is enough; call this out as a deliberate trade-off).
- Not a mobile app.
- Not multi-tenant SaaS with billing.
- Not attempting SOTA research; using well-chosen, well-evaluated standard models.

---

## 4. Target users

| Persona | Needs | Surfaces they use |
|---|---|---|
| **Citizen** | Report an issue in seconds; get a tracking status; trust it's handled | Public web app: report form, my-reports, status |
| **Municipal operator / dispatcher** | Triage queue fast; see duplicates merged; know what to do next | Ops console: triaged queue, duplicate clusters, action recommendations |
| **City analyst / planner** | Understand trends, hotspots, seasonality; forecast load | Analytics dashboard: forecasts, hotspot maps, category trends |
| **City manager / executive** | One-glance situational awareness in plain English | Executive summary: LLM briefing, KPIs, SLA risk |
| **(You) the ML/platform engineer** | Retrain, evaluate, monitor, debug models | MLflow UI, model registry, drift dashboards |

---

## 5. Functional requirements

**Complaint intake & lifecycle**
- FR1: Submit complaint (title, description, location, optional image).
- FR2: On submit, system returns predicted category, severity, expected resolution window, and duplicate warnings.
- FR3: Track complaint status lifecycle (new → triaged → in_progress → resolved / rejected) with full audit history.

**AI/ML services**
- FR4: NLP classification of complaint text into categories with confidence.
- FR5: Severity/priority prediction with confidence and explanation.
- FR6: Resolution-time prediction (regression) with a prediction interval, not just a point estimate.
- FR7: Duplicate detection at submit time (semantic + spatial-temporal).
- FR8: Complaint clustering into incident groups.
- FR9: Geospatial hotspot detection (statistically grounded, not naive radius).
- FR10: Volume forecasting per category/region with confidence bands.
- FR11: (Optional) image-based issue recognition / verification.

**Decision support**
- FR12: Resource-allocation recommendations derived from forecasts + hotspots + backlog.
- FR13: AI-generated executive summary of the current situation.
- FR14: AI-generated per-complaint or per-cluster action recommendations.
- FR15: Natural-language querying ("show unresolved drainage complaints in Ward 7 older than 5 days").

**Explainability & trust**
- FR16: Every prediction exposes *why* (feature attributions / matched evidence / cited source complaints).
- FR17: Model & data versioning; every prediction traceable to a model version.

**Platform**
- FR18: Role-based access (citizen / operator / analyst / admin).
- FR19: Analytics dashboard with the above intelligence.
- FR20: Admin ability to trigger retraining and view model performance.

---

## 6. Non-functional requirements

- **Performance:** synchronous inference (classify, severity, duplicate check) < 500 ms p95. Heavy jobs (forecast retrain, clustering, hotspot recompute) run async.
- **Scalability:** stateless API/ML services, horizontally scalable behind a load balancer; DB and vector store are the state.
- **Reliability:** ML service failure must degrade gracefully (fall back to rules/last-known model, never block complaint submission).
- **Reproducibility:** any model reproducible from a commit + data version + config. No "works on my laptop" models.
- **Explainability & auditability:** mandatory for a public-sector system; every automated decision logged with model version and rationale.
- **Security & privacy:** PII (citizen name/email) encrypted at rest, access-controlled, never sent to third-party LLMs. (See §24.)
- **Observability:** request tracing, model latency, prediction distribution, and data/concept drift monitoring.
- **Cost:** LLM calls are the main variable cost; cache aggressively, use local embeddings, reserve paid LLM for summarization/reasoning — not for things a cheap model does.
- **Maintainability:** clean service boundaries; models behind a stable interface so they can be swapped without touching the API.

---

## 7. Complete software architecture

**Architectural style:** modular service-oriented — *not* a monolith, *not* fine-grained microservices. Four deployable services plus stateful backends. This is the right granularity for a portfolio project: it demonstrates service design without drowning in orchestration.

```
                         ┌───────────────────────────────┐
                         │         Next.js Frontend        │
                         │  (citizen app + ops/analytics)  │
                         └───────────────┬─────────────────┘
                                         │ HTTPS / REST (+ SSE for LLM stream)
                                         ▼
                         ┌───────────────────────────────┐
                         │        API Gateway Service       │
                         │  FastAPI: auth, validation,      │
                         │  orchestration, business logic   │
                         └───┬───────────┬──────────┬───────┘
             sync inference  │           │ async     │  data
                             ▼           ▼           ▼
              ┌──────────────────┐  ┌──────────┐  ┌───────────────────────┐
              │   ML Service      │  │  Worker   │  │  Postgres + PostGIS    │
              │ FastAPI model     │  │ Celery/RQ │  │  + pgvector            │
              │ serving:          │  │ heavy jobs│  │  (relational + geo +   │
              │  classify,        │  │ forecast, │  │   vector store)        │
              │  severity, resol- │  │ cluster,  │  └───────────────────────┘
              │  time, embeddings │  │ hotspot,  │  ┌───────────────────────┐
              │  duplicate, SHAP  │  │ retrain,  │  │  Redis (cache + broker)│
              └──────────────────┘  │ CV infer  │  └───────────────────────┘
                             │      └────┬─────┘  ┌───────────────────────┐
                             │           │        │  Object store (S3/MinIO)│
                             ▼           ▼        │  images + model artifacts│
                    ┌──────────────────────┐     └───────────────────────┘
                    │      LLM Service       │     ┌───────────────────────┐
                    │ RAG, summaries, NL     │     │  MLflow (tracking +    │
                    │ query, recommendations │     │  model registry)       │
                    └──────────────────────┘     └───────────────────────┘
```

**Why this shape:**
- **API Gateway** owns auth, validation, and orchestration; it never contains model code. Clean seam.
- **ML Service** holds all *synchronous, low-latency* model inference behind one interface. Swappable.
- **Worker** runs *everything slow* (forecast training, clustering, hotspot recompute, batch CV, retraining) off the request path. This is the single most important architectural decision for perceived performance.
- **LLM Service** is isolated so its cost, latency, and failure modes never contaminate core flows, and so you can swap providers.
- **Postgres + PostGIS + pgvector** is *one* database doing relational, geospatial, AND vector search — see §8/§11 for why this beats bolting on a separate vector DB.

---

## 8. Recommended tech stack (with justification for every choice)

I'm changing three things from your current stack. Each is justified, with the trade-off stated.

### Backend framework — **FastAPI** (change from Flask) ✅
- **Why:** native async (critical when the gateway fans out to ML + LLM + DB concurrently), Pydantic validation for free, auto-generated OpenAPI docs (great for a portfolio), and it's the de-facto standard for Python ML serving.
- **Trade-off:** Flask is simpler and you already have Flask code. But the Flask code is disconnected and thin — there's little to throw away, and FastAPI's async + typing pays off immediately once ML/LLM calls enter the picture.
- **Alternative considered:** Django REST (too heavy, ORM-centric, overkill here). Litestar (excellent but less familiar to recruiters). **FastAPI wins on ecosystem + signaling.**

### Database — **PostgreSQL + PostGIS + pgvector** (change from MySQL) ✅
- **Why:** you need three capabilities — relational integrity, **real geospatial queries** (hotspots, radius, ST_ functions), and **vector similarity search** (embeddings for duplicates/clustering/RAG). Postgres does all three in one engine: PostGIS is the gold standard for geospatial; pgvector adds ANN vector search. MySQL's geospatial is weaker and it has no first-class vector search.
- **Trade-off:** one more thing to learn if you only know MySQL, but this is a *portfolio asset* — PostGIS + pgvector is exactly the kind of "chose the right tool" story that interviews reward.
- **Alternative considered:** MySQL + a dedicated vector DB (Pinecone/Qdrant/Weaviate) + a geo library. That's **three systems instead of one** — more ops, more failure modes, and premature at this scale. Recommendation: **start with pgvector; only graduate to Qdrant/Weaviate if you exceed ~1M vectors or need advanced filtering.** State this explicitly as a scaling decision.

### Frontend — **Keep Next.js** (React 19, App Router) ✅ but wire it to real APIs
- **Why:** it's already polished and production-like — your strongest existing asset. Keep it. Add **TanStack Query (React Query)** for server state (better than raw SWR for mutations, cache invalidation, optimistic updates), keep **Recharts** for standard charts, **Leaflet/react-leaflet** for maps (add a heatmap layer plugin for hotspots), and **shadcn/ui** as-is.
- **Change:** rip out `lib/mock-data.ts` usage; the unused `lib/api.ts` becomes the real client.

### ML / Data Science stack
| Concern | Choice | Why |
|---|---|---|
| Core DS | **pandas / numpy / scikit-learn** | Non-negotiable baseline toolkit; scikit-learn for classical models, pipelines, metrics. |
| Gradient boosting | **LightGBM** (primary), XGBoost (comparison) | Best-in-class for tabular resolution-time & severity; fast, handles categoricals; great SHAP support. |
| NLP transformers | **Hugging Face Transformers** + **PyTorch** | Fine-tune DistilBERT/RoBERTa for classification; industry standard. |
| Embeddings | **sentence-transformers** (`all-MiniLM-L6-v2` or `bge-small`) | **Local, free, fast** embeddings for duplicates/clustering/RAG. Do NOT pay an API for embeddings at this scale. |
| Clustering | **HDBSCAN** + scikit-learn DBSCAN | HDBSCAN handles variable-density, noise, and doesn't need `k` — right for complaint clusters. |
| Geospatial hotspots | **PySAL / esda (Getis-Ord Gi\*)** + PostGIS | Statistically defensible hotspots vs. naive radius counting. |
| Forecasting | **statsforecast** (baselines: SARIMA/ETS) + **LightGBM** (global model w/ lags) + optional **NeuralForecast (N-BEATS/TFT)** | Baseline-first, then ML, then deep as stretch. |
| Explainability | **SHAP** (tabular), **Captum**/attention or SHAP (text), RAG citations (LLM) | One consistent explainability story per model family. |
| Experiment tracking + registry | **MLflow** | Tracking, params/metrics, artifacts, model registry with stage transitions. |
| Data/model versioning | **DVC** | Version datasets & model artifacts alongside git; reproducibility story. |
| Drift monitoring | **Evidently** | Data + prediction drift reports; great dashboards. |
| Serving heavy inference | FastAPI (simple) → consider **BentoML** if you want a serving story | Start simple; BentoML is a nice stretch/MLOps flex. |

### LLM stack
- **Provider:** **Anthropic Claude** via API (current models: Claude Opus 4.8 `claude-opus-4-8` for reasoning-heavy summaries/recommendations; Claude Haiku 4.5 `claude-haiku-4-5` for cheap/fast NL-query parsing and routing). Use the right model per task, not one model for everything.
- **Orchestration:** thin, explicit prompt/RAG code **or** a light framework. **Recommendation: start framework-free** (direct SDK + your own retrieval) to *show you understand RAG*, then optionally introduce LangChain/LlamaIndex only if it earns its complexity. Over-reliance on LangChain is a common junior tell; hand-rolled-then-refactored is a stronger signal.
- **RAG store:** pgvector (reuse the embedding layer).
- **Guardrails:** structured outputs (tool/JSON schema), retrieval-grounded answers with citations, and a hard rule that **PII never leaves your infrastructure** — see §24.

### Infra / DevOps
- **Docker + Docker Compose** (dev & single-host prod), **GitHub Actions** (CI/CD), **Prometheus + Grafana** (metrics), **MinIO** (S3-compatible object store for dev), **nginx/Traefik** reverse proxy.

---

## 9. Backend architecture

**API Gateway Service (FastAPI)** — the only service the frontend talks to.
- Layers: `router → schema (Pydantic) → service (business logic) → repository (DB access) → clients (ML/LLM/worker)`.
- Owns: auth & RBAC, request validation, orchestration (fan-out to ML/LLM), lifecycle/state machine for complaints, audit logging.
- Contains **zero model code** — it calls the ML service. This boundary is deliberate and interview-worthy.
- Async endpoints; uses `httpx.AsyncClient` to call ML/LLM concurrently (e.g., classify + severity + duplicate-check in parallel on submit).

**ML Service (FastAPI)** — synchronous inference only.
- Loads models **once at startup** from the MLflow registry (by stage = Production) or from a mounted artifact volume.
- Endpoints: `/classify`, `/severity`, `/resolution-time`, `/embed`, `/duplicates`, `/explain`.
- Stateless; each model behind a `Predictor` interface so a model swap is a registry pointer change, not a code change.
- Returns predictions **with confidence and explanation payloads** (never a bare label).

**Worker Service (Celery or RQ + Redis)** — asynchronous heavy jobs.
- Jobs: nightly forecast retrain, periodic clustering & hotspot recompute, batch backfill classification of 311 history, CV inference, scheduled model retraining, drift report generation.
- Triggered by API (enqueue) or by a scheduler (Celery beat / cron).

**LLM Service (FastAPI)** — isolated LLM/RAG.
- Endpoints: `/summary` (situation briefing), `/recommend` (action rec for cluster/complaint), `/nl-query` (NL → structured query/RAG answer), streamed via SSE.
- Retrieval from pgvector; strict prompt templates; response caching in Redis keyed by input hash.

**Cross-cutting:** structured JSON logging with request IDs propagated across services; central config via env + Pydantic Settings; health/readiness endpoints on every service.

---

## 10. Frontend architecture

Keep Next.js App Router. Structure by feature, not by file type.

- **Server state:** TanStack Query (queries + mutations, optimistic UI on complaint submit, background refetch for dashboards).
- **Auth:** JWT in httpOnly cookie; middleware guards `/ops`, `/analytics`, `/admin` routes by role.
- **Real-time-ish:** SSE for streaming LLM summaries; polling or SWR-style revalidation for queue/dashboard.
- **Maps:** react-leaflet + heatmap layer for hotspots; marker clustering for raw complaints.
- **Charts:** Recharts for trends/forecasts (with confidence bands as area ranges).
- **Key surfaces:**
  - Public: `/`, `/report` (with live AI category/severity/duplicate feedback as the user types — debounced calls to the gateway), `/issues`, `/issues/[id]`.
  - Ops console: `/ops` triaged queue, duplicate-cluster view, per-item explanation drawer (SHAP/keyword evidence).
  - Analytics: `/analytics` forecasts, hotspot map, category/temporal trends.
  - Executive: `/analytics/briefing` streamed LLM summary + KPIs + SLA risk.
  - Admin: `/admin/models` model performance, trigger retrain, drift status.
- **Explainability in the UI is a first-class design requirement**, not an afterthought — every AI-produced value has an "why?" affordance.

---

## 11. Database schema (Postgres + PostGIS + pgvector)

Conceptual model (not DDL). Core tables:

**`users`** — id, name, email (unique, encrypted), role (`citizen|operator|analyst|admin`), password_hash, created_at.

**`categories`** — id, name, slug, description, department_id, icon, color. (Seeded from the 311 taxonomy you standardize on.)

**`departments`** — id, name, contact — for routing & resource recommendations.

**`complaints`** (core) —
- id, external_source_id (nullable; links to 311 record for imported data), source (`web|import_311|api`)
- title, description (text)
- reporter_id (fk users, nullable for imported)
- **geo** (PostGIS `geography(Point,4326)`) + address_text, ward/zone_id
- status, created_at, updated_at, closed_at (nullable — this is your resolution-time label)
- **ML columns (nullable, filled by pipeline):** predicted_category_id, category_confidence, predicted_severity, severity_confidence, predicted_resolution_hours, resolution_pi_low/high, cluster_id (fk), is_duplicate_of (fk complaints), model_version_id
- **`embedding vector(384)`** — pgvector column for the description embedding (indexed with IVFFlat/HNSW)

**`complaint_history`** — id, complaint_id, old_status, new_status, changed_by, note, created_at. (Audit trail.)

**`complaint_images`** — id, complaint_id, object_key (S3/MinIO), cv_label, cv_confidence, cv_model_version.

**`clusters`** — id, centroid (PostGIS point), category_id, member_count, created_at, method, params. (Output of clustering job.)

**`hotspots`** — id, region geometry (PostGIS polygon/point), gi_star_score, p_value, category_id, window_start/end, is_significant, detected_at. (Getis-Ord output, time-windowed.)

**`forecasts`** — id, category_id, region_id, target_date, horizon, yhat, yhat_lower, yhat_upper, model_version, generated_at.

**`model_versions`** — id, model_name, mlflow_run_id, stage, metrics (jsonb), trained_at. (Every prediction references this — auditability.)

**`predictions_log`** — id, complaint_id, model_version_id, output (jsonb), explanation (jsonb), created_at. (Full audit + future training data + drift baseline.)

**Design notes / trade-offs:**
- Predictions are stored **denormalized onto `complaints`** for fast reads *and* appended to `predictions_log` for audit — deliberate read/write duplication.
- One DB for relational + geo + vector keeps joins trivial (e.g., "nearest duplicates *within 200m* in the last 7 days" = one SQL query combining pgvector `<=>` and PostGIS `ST_DWithin`). This is the payoff of Decision A's DB choice.

---

## 12. AI/ML architecture

Think of it as **four model families + one embedding backbone + one LLM layer**, all versioned through MLflow.

```
                    ┌──────────────────────────────────────┐
                    │        Embedding backbone              │
                    │  sentence-transformers → pgvector      │
                    └───┬───────────┬───────────┬────────────┘
   duplicate detection  │  clustering │  semantic search/RAG  │
                        ▼           ▼           ▼
   ┌────────────────────────────────────────────────────────────┐
   │  Family 1: TEXT CLASSIFICATION   (category, severity)        │
   │  baseline TF-IDF+LinearSVM/LogReg → fine-tuned DistilBERT     │
   ├────────────────────────────────────────────────────────────┤
   │  Family 2: TABULAR REGRESSION    (resolution time)           │
   │  LightGBM w/ engineered + text-embedding features + SHAP     │
   ├────────────────────────────────────────────────────────────┤
   │  Family 3: TIME SERIES           (volume forecasting)        │
   │  SARIMA/ETS baseline → LightGBM global model → N-BEATS/TFT    │
   ├────────────────────────────────────────────────────────────┤
   │  Family 4: COMPUTER VISION (optional)  (image recognition)   │
   │  fine-tuned CNN / vision transformer on road-damage dataset  │
   └────────────────────────────────────────────────────────────┘
                        │
                        ▼
   ┌────────────────────────────────────────────────────────────┐
   │  LLM LAYER: RAG summaries, NL query, action recommendations  │
   │  Claude + pgvector retrieval + structured outputs            │
   └────────────────────────────────────────────────────────────┘
```

**Golden rule enforced across all families:** *ship a dumb baseline first, measure it, then justify every increment in complexity by the metric gain.* This sequencing IS the data-science story recruiters want.

---

## 13. Data pipeline

```
RAW (311 open data: CSV/API)  +  LIVE (app submissions)
        │
        ▼   Ingestion (Worker jobs / scripts, tracked by DVC)
   ┌─────────────────────┐
   │ Bronze: raw landing  │  immutable copy, schema-on-read
   └──────────┬──────────┘
        ▼   Cleaning / standardization
   ┌─────────────────────┐
   │ Silver: cleaned      │  dedup, normalized categories, parsed geo,
   │ canonical schema     │  computed resolution_hours, timezone fixes
   └──────────┬──────────┘
        ▼   Feature engineering
   ┌─────────────────────┐
   │ Gold: feature sets   │  text features, temporal features (lag/rolling),
   │ + embeddings         │  geo features (ward, density), embeddings
   └──────────┬──────────┘
        ▼
   Train/val/test splits (TIME-BASED, never random — see §29)
```

- **Orchestration:** start with Worker jobs + a Makefile/DVC pipeline (`dvc repro`). Only introduce **Airflow/Prefect** if you want an orchestration showpiece — flag it as optional; it's real ops overhead.
- **Feature store:** a `gold` feature table in Postgres is enough. **Do not** stand up Feast unless you specifically want a feature-store talking point — it's over-engineering at this scale (say so explicitly).
- **Data validation:** **Great Expectations** or **pandera** checks between layers (schema, null rates, geo bounds, category domain). This is a strong, cheap credibility signal.
- **Leakage guard:** resolution time / status must never leak into features for models that predict them; enforce with explicit feature allow-lists.

---

## 14. Model pipeline (lifecycle for every model)

```
data (DVC-versioned)
   → feature build
   → train  (params + metrics + artifacts logged to MLflow)
   → evaluate (held-out, time-based; slice metrics; error analysis)
   → register (MLflow Model Registry, stage=Staging)
   → validate (shadow / offline gate: must beat current Production on agreed metric)
   → promote (stage=Production)
   → serve (ML service loads Production by registry pointer)
   → monitor (Evidently drift + live metrics)
   → trigger retrain (scheduled or drift-triggered) → loop
```

- Every model is a **reproducible pipeline**, not a notebook artifact. Notebooks are for exploration only; training code lives in `ml/` modules invoked by the pipeline.
- **Promotion gate is a hard rule:** a new model reaches Production only if it beats the incumbent on the pre-registered primary metric on a time-based holdout. This "champion/challenger" discipline is a senior signal.
- Retraining cadence: classification/regression monthly or on drift; forecasting weekly (fast-moving); document the choice.

---

## 15. APIs required

**Gateway (public/authenticated) — REST**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- `POST /complaints` (submit; triggers sync inference fan-out), `GET /complaints`, `GET /complaints/{id}`, `PATCH /complaints/{id}/status`
- `POST /complaints/analyze` (pre-submit live prediction for the report form)
- `GET /complaints/{id}/duplicates`
- `GET /clusters`, `GET /hotspots?category=&window=`
- `GET /analytics/summary`, `GET /analytics/trends`, `GET /analytics/forecast?category=&region=&horizon=`
- `POST /assistant/query` (NL query, SSE stream), `GET /analytics/briefing` (LLM summary, SSE)
- `GET /recommendations/resource-allocation`
- `GET /complaints/{id}/explanation`
- Admin: `POST /admin/models/{name}/retrain`, `GET /admin/models`, `GET /admin/drift`

**ML Service (internal)**
- `POST /classify`, `POST /severity`, `POST /resolution-time`, `POST /embed`, `POST /duplicates`, `POST /explain`, `GET /health`

**LLM Service (internal)**
- `POST /summary`, `POST /recommend`, `POST /nl-query`, `GET /health`

**Conventions:** versioned (`/api/v1`), Pydantic-validated, OpenAPI-documented, consistent error envelope, pagination on list endpoints, idempotency key on `POST /complaints`.

---

## 16. Folder structure (monorepo)

```
civitrack-ai/
├── docs/
│   ├── BLUEPRINT.md                  # this file
│   ├── architecture/                 # diagrams, ADRs (architecture decision records)
│   └── model-cards/                  # one card per model (data, metrics, limitations)
├── frontend/                         # Next.js app (moved from repo root)
│   ├── app/  components/  lib/  hooks/
├── services/
│   ├── gateway/                      # FastAPI API gateway
│   │   ├── app/{routers,schemas,services,repositories,clients,core}/
│   │   └── tests/
│   ├── ml_service/                   # FastAPI model serving
│   │   ├── app/{predictors,schemas,core}/
│   │   └── tests/
│   ├── llm_service/                  # FastAPI RAG/LLM
│   │   ├── app/{rag,prompts,chains,core}/
│   │   └── tests/
│   └── worker/                       # Celery/RQ tasks
│       ├── tasks/{forecast,cluster,hotspot,retrain,cv,drift}.py
│       └── tests/
├── ml/                               # the data-science heart (library, not a service)
│   ├── data/{ingest,clean,validate,features}/
│   ├── models/{classification,severity,resolution,forecasting,cv,embeddings}/
│   ├── clustering/  geospatial/  explainability/
│   ├── evaluation/                   # metrics, error analysis, slicing
│   ├── pipelines/                    # dvc-driven train/eval pipelines
│   └── notebooks/                    # EXPLORATION ONLY, numbered, output-stripped
├── data/                             # DVC-tracked (bronze/silver/gold), not in git
├── infra/
│   ├── docker/                       # per-service Dockerfiles
│   ├── docker-compose.yml            # dev
│   ├── docker-compose.prod.yml
│   ├── nginx/  prometheus/  grafana/
├── db/
│   ├── migrations/                   # Alembic
│   └── seeds/
├── .github/workflows/                # CI/CD
├── mlruns/ or mlflow config          # experiment tracking
├── dvc.yaml  params.yaml             # reproducible pipelines
├── Makefile
└── README.md
```

**Note:** the current app moves into `frontend/` and the throwaway Flask backend is retired. This restructure is Milestone 0.

---

## 17. ML models to build (with reasons)

Ordered by **value-to-effort** for both product and portfolio. Build in this order.

1. **Complaint category classifier (NLP)** — *the anchor model.* Highest value, cleanest ground truth (311 categories), demonstrates the full baseline→transformer arc. **Build first.**
2. **Resolution-time regressor (tabular)** — *the strongest data-science story.* Real labels (created→closed), rich feature engineering, prediction intervals, SHAP. Recruiters love a well-done regression with error analysis. **Build second.**
3. **Duplicate detector (embeddings)** — high product value, unlocks clustering/search for free. Semantic + spatial-temporal.
4. **Volume forecaster (time series)** — enables the whole "proactive resourcing" narrative; strong DS breadth signal.
5. **Hotspot detector (geospatial stats)** — Getis-Ord Gi*; visually compelling on the map; statistically credible.
6. **Complaint clusterer (HDBSCAN)** — groups incidents; mostly reuses the embedding backbone.
7. **Severity/priority classifier** — ⚠️ **build last / with caveats.** *Honest challenge:* 311 data rarely has a clean, consistent severity label. If you invent severity from keywords, your "model" is just learning your own labeling rules — a circular, weak result. **Options, best first:** (a) derive a *proxy* label from objective signals (e.g., resolution time percentile, or SLA-breach) and predict *that* — defensible; (b) use a small hand-labeled gold set + weak supervision (Snorkel) — advanced but honest; (c) frame it explicitly as a rules+ML hybrid and *say so*. Do **not** present keyword-derived severity as a real classifier.
8. **Computer Vision model** — optional track, see §19.

---

## 18. NLP models

- **Baseline (must exist):** TF-IDF + Linear SVM / Logistic Regression. Fast, strong, interpretable; this is your accuracy floor and your honesty benchmark.
- **Primary:** fine-tuned **DistilBERT** (or RoBERTa-base) for multiclass category classification. DistilBERT for the speed/accuracy trade-off at serving time.
- **Embeddings backbone:** `all-MiniLM-L6-v2` or `bge-small-en` via sentence-transformers → powers duplicates, clustering, semantic search, RAG. One model, four features.
- **Optional NLP extras (only if time):** aspect/keyphrase extraction for tags, zero-shot classification for rare categories, multilingual model if your 311 source is multilingual.
- **Text explainability:** SHAP or attention-based token attributions surfaced in the UI ("classified as *Drainage* because: *sewage, blocked, overflow*").

**Challenge to your framing:** don't reach for an LLM to *classify* complaints. A fine-tuned DistilBERT is cheaper, faster, more accurate on your fixed taxonomy, and more explainable than prompting an LLM per complaint. Reserve the LLM for open-ended reasoning tasks (§23).

---

## 19. Computer Vision models

**Honest architect's take:** CV is the highest-effort, lowest-certainty track because **311 text data has no paired images.** Include it only if you're prepared to treat it as a semi-independent mini-project with its own dataset. Two viable paths:

- **Path A — Classification/verification (recommended, lower effort):** fine-tune a pretrained CNN/ViT (ResNet50 / EfficientNet / ViT-B via `timm`) on a **public labeled dataset** — e.g., road-damage datasets (RDD2022), pothole datasets (Kaggle/Roboflow), or garbage classification datasets. Use it to (a) auto-tag/verify the category of a citizen-uploaded photo and (b) cross-check against the text classifier ("photo says pothole, text says pothole — high confidence"). **Transfer learning, not from scratch** — you will not have the data to train from scratch, and pretending otherwise is a red flag.
- **Path B — Detection/severity (higher effort):** fine-tune **YOLOv8** for object detection (locate & size potholes/garbage in the image) → derive a visual severity proxy. More impressive, more work, more data-hungry.

- **CV explainability:** Grad-CAM heatmaps overlaid on the image ("model focused here").
- **Serving:** batch/async in the Worker, not on the submit path (CV inference is slow) — return the CV result a moment after submission.

**Recommendation:** ship **Path A** in the optional CV milestone; mention Path B/YOLO as a documented future extension. Do not let CV block the core ML value.

---

## 20. Forecasting models

Predict complaint **volume** per category and/or region over a 1–4 week horizon.

- **Baselines (must exist):** seasonal naive, ETS, **SARIMA** via statsforecast. These expose the seasonality/trend and set the bar.
- **Primary (recommended):** **LightGBM global model** with engineered features — calendar (day-of-week, month, holidays), lags (t-1, t-7, t-14), rolling means/std, weather (optional external join), category/region one-hots. Global models beat per-series ARIMA when you have many related series and are far more practical to operate.
- **Stretch (deep):** **N-BEATS / NHITS / Temporal Fusion Transformer** via NeuralForecast — TFT is attractive because it's *natively interpretable* (variable importance + attention) and handles multiple related series with covariates. Great portfolio flex *if* the LightGBM model is already solid.
- **Always output intervals**, not points (yhat_lower/upper) — operational decisions need uncertainty.
- **Evaluation:** rolling-origin backtesting (never a single random split) — see §29.

**Challenge to a common instinct:** Prophet is the reflexive choice and is fine as *a* baseline, but it often underperforms a well-featured LightGBM on multi-series civic data and can lull you into skipping proper backtesting. Use Prophet/SARIMA as baselines, make LightGBM the workhorse.

---

## 21. Clustering methods

Two distinct clustering jobs — don't conflate them:

1. **Semantic incident clustering** (group complaints that are *about the same thing*): **HDBSCAN** on description embeddings (optionally + scaled geo coords). HDBSCAN because it finds variable-density clusters, labels noise, and needs no `k`. UMAP for dimensionality reduction before clustering + for 2D visualization.
2. **Spatial hotspot detection** (find *where* problems concentrate): **DBSCAN on coordinates** for raw density clusters, and — better — **Getis-Ord Gi\*** (esda/PySAL) for statistically significant hot/cold spots with p-values, computed over spatial units (wards/grid) and time windows. Gi* is what an actual urban analyst would use and elevates this above naive Haversine radius-counting.

**Duplicate detection** is a *special case* of #1: two complaints are duplicates if embedding cosine-similarity > threshold **AND** within a spatial radius (PostGIS `ST_DWithin`) **AND** within a time window. Implement as a fast pgvector+PostGIS query at submit time — no separate model needed.

---

## 22. Explainability methods (one story per model family)

| Model family | Method | What the user sees |
|---|---|---|
| Text classification (category/severity) | SHAP / attention token attributions | Highlighted words that drove the label |
| Tabular regression (resolution time) | **SHAP** (TreeExplainer on LightGBM) | Top +/− factors: "old ward avg +18h, category=drainage +9h, weekday −3h" |
| Forecasting | Feature importance (LightGBM) / TFT variable importance & attention | Which lags/seasonality/covariates drive the forecast |
| Clustering/hotspots | Cluster exemplars + Gi* p-values | Representative complaints; statistical significance |
| Computer Vision | Grad-CAM | Heatmap over the image region |
| LLM outputs | **Retrieval citations** | Every claim links to the source complaint(s) it's grounded in |

**Principle:** explainability is a **product requirement** (public sector) and a **portfolio differentiator**, so it's designed in from day one — every prediction endpoint returns an explanation payload, and every AI value in the UI has a "why?" affordance. Add global model cards in `docs/model-cards/` (data, intended use, metrics, limitations, ethical considerations) — a strong responsible-AI signal.

---

## 23. LLM integration strategy

**Reserve the LLM for what only an LLM does well** — open-ended reasoning, summarization, and natural-language interfaces — and keep it *out* of the deterministic ML path (classification, regression). This discipline is itself a signal.

Three LLM capabilities, one service:

1. **Executive/situation summaries (RAG):** retrieve the current operational state (recent complaints, forecasts, hotspots, SLA-risk items) → structured prompt → Claude generates a plain-language briefing **with citations** to the underlying data. Model: **Claude Opus 4.8** (reasoning quality matters here).
2. **Action recommendations:** given a cluster/hotspot + forecast + backlog, generate ranked recommended actions with rationale. Structured (JSON) output constrained to a schema the frontend renders. Grounded in retrieved facts, never free-floating.
3. **Natural-language querying:** user asks in English → **hybrid approach.** For analytical questions, **guarded text-to-SQL** (LLM emits SQL against a *restricted read-only view*, validated/sanitized before execution — never raw SQL on the live DB) or a structured-filter DSL. For semantic questions ("complaints about noise near the school"), **RAG over pgvector**. Route between them with a cheap model (**Claude Haiku 4.5**).

**Guardrails (mandatory):**
- **PII never leaves your infra.** Strip/mask reporter name/email/exact address before any text goes to the LLM API. This is a hard §24 rule.
- **Grounding:** answers must cite retrieved records; unsupported claims are a bug.
- **Cost control:** local embeddings (not the LLM) for retrieval; cache summaries/recommendations in Redis keyed by input hash; use Haiku for routing/parsing and reserve Opus for synthesis.
- **Determinism where it matters:** low temperature + JSON schema for anything the app parses.
- **Failure isolation:** LLM outage degrades gracefully (show raw dashboard, hide the briefing) — it never blocks core flows.

**Challenge:** resist "agentic" over-engineering. A retrieval-grounded, schema-constrained single-call design is more reliable, cheaper, and more explainable than a multi-agent loop for this use case. If you want an agent story, add *one* well-scoped tool-use flow (NL-query with a SQL tool) rather than a swarm.

---

## 24. Authentication & security

- **AuthN:** JWT access + refresh tokens; access token in httpOnly, Secure, SameSite cookie (mitigates XSS token theft). Password hashing with **argon2/bcrypt**.
- **AuthZ:** role-based (citizen/operator/analyst/admin) enforced at the gateway via dependency guards; per-route and per-object checks (a citizen sees only their complaints).
- **PII protection:** encrypt reporter email at rest; mask PII in logs; **PII scrubbing before any LLM call** (dedicated sanitizer, tested).
- **Input security:** Pydantic validation everywhere; rate limiting (slowapi/nginx) on submit and auth; idempotency keys; strict CORS allow-list.
- **Injection defense:** parameterized queries only; **text-to-SQL runs against a read-only role on a restricted view**, output validated against an allow-list of tables/columns before execution.
- **Secrets:** never in git; `.env` + Docker secrets in dev, a secrets manager in prod; DVC/MLflow creds isolated.
- **File uploads (CV):** validate content-type & size, store in object storage (not the DB), scan/limit dimensions, serve via signed URLs.
- **Auditability:** `predictions_log` + `complaint_history` provide a full trail of who/what/which-model — required for public-sector trust.
- **Dependency hygiene:** `pip-audit`/Dependabot in CI.

---

## 25. Deployment architecture

**Environments:** local (Compose) → staging → prod, same images promoted across them.

**Recommended prod topology (pragmatic, portfolio-appropriate):**
- Single-VPS or small cloud host running **Docker Compose (prod file)** behind **nginx/Traefik** (TLS via Let's Encrypt) is entirely sufficient and cheap. Services: frontend, gateway, ml_service, llm_service, worker, postgres, redis, minio/S3, mlflow, prometheus, grafana.
- **Managed alternatives** (call these out as the "scale-up path"): frontend on **Vercel**; backend services on **Render/Railway/Fly.io**; Postgres on **Neon/Supabase/RDS** (with pgvector + PostGIS); object storage on **S3**. This is the realistic "what a startup would actually do" answer.
- **Cloud-native path (mention as future):** AWS ECS/Fargate or Kubernetes (EKS) + RDS + S3 + ECR. **Do not start here** — k8s for a portfolio project is usually résumé-driven over-engineering; deploy on Compose first, *document* the k8s migration path.

**Model artifacts** served from MLflow registry / object storage, loaded by ml_service at startup; blue-green model swap via registry stage change.

---

## 26. Docker architecture

- **Per-service multi-stage Dockerfiles** (builder + slim runtime; non-root user; pinned base images). Separate images: `frontend`, `gateway`, `ml_service`, `llm_service`, `worker`.
- **ML images are heavy** (torch, transformers) — keep them *separate* from the light gateway image so gateway builds/deploys stay fast. This separation is a concrete reason the ML service is its own container.
- **`docker-compose.yml` (dev):** all services + postgres(+postgis+pgvector image, e.g. `pgvector/pgvector` or a PostGIS image with pgvector) + redis + minio + mlflow, with hot-reload volumes.
- **`docker-compose.prod.yml`:** no source mounts, gunicorn/uvicorn workers, resource limits, restart policies, nginx/Traefik, prometheus + grafana.
- **`.dockerignore`, healthchecks, pinned deps (uv/pip-tools lockfiles)** for reproducibility.
- **GPU note:** training may want GPU (Colab/cloud); **serving DistilBERT/LightGBM is fine on CPU** — design serving for CPU so deployment stays cheap.

---

## 27. CI/CD recommendations

**GitHub Actions**, staged:
- **On PR:** lint/format (ruff + black, eslint/prettier), type-check (mypy, tsc), unit tests, build images. Fast feedback (< ~5 min).
- **On merge to main:** integration tests (compose up, hit endpoints), build & push images to registry (GHCR/ECR), deploy to staging.
- **Manual/tagged:** promote staging image to prod.
- **ML-specific CI (the differentiator):** a lightweight **model-validation job** — on changes to `ml/`, run training on a sampled dataset and **fail the build if key metrics regress** below a threshold, or at minimum run data-validation (Great Expectations) + a smoke train/eval. This "CI for models" story is rare in portfolios and stands out.
- **Security:** `pip-audit`, `npm audit`, Trivy image scan.
- **DVC/MLflow:** CI can pull DVC data and log to a tracking server; keep heavy training *out* of PR CI (nightly/scheduled instead).

---

## 28. Testing strategy

| Layer | Tests |
|---|---|
| **Unit** | business logic, feature transforms, PII scrubber, prompt builders, utility functions |
| **API/contract** | pytest + httpx against gateway; schema/contract tests so frontend & backend can't drift |
| **ML-specific** | **behavioral tests** (CheckList-style: invariance, directional expectation), not just accuracy: e.g., "adding *emergency* should not lower severity"; data-validation tests; leakage tests; reproducibility test (same seed → same metric) |
| **Integration** | Compose-based; submit complaint → assert predictions populated, duplicate flagged, history written |
| **Frontend** | component tests (Vitest/RTL), e2e (Playwright) for report→predict→submit flow |
| **Load** | Locust/k6 on inference endpoints to validate the p95 NFR |
| **LLM eval** | offline eval set for summaries/NL-query: groundedness/citation checks, regression on a fixed prompt suite (LLM outputs are non-deterministic — test *properties*, not exact strings) |

**Coverage philosophy:** high coverage on deterministic logic; **property/behavioral coverage** on ML/LLM. Testing ML by *behavior* rather than by frozen accuracy numbers is a senior signal.

---

## 29. Evaluation metrics (per model — with the *right* validation protocol)

**Validation protocol is as important as the metric. Two hard rules:**
- **Text/tabular models:** split **by time** (train on past, test on future) — random splits leak future info and inflate scores on temporal data.
- **Forecasting:** **rolling-origin backtesting**, never a single split.

| Model | Primary metric | Secondary / slices |
|---|---|---|
| **Category classifier** | **Macro-F1** (categories are imbalanced — accuracy lies) | per-class precision/recall, confusion matrix, top-k accuracy, calibration (are confidences honest?), F1 sliced by region/time |
| **Severity classifier** | Macro-F1 + **cost-sensitive** metric (under-predicting severe issues is costly) | recall on the "high" class, confusion matrix |
| **Resolution-time regressor** | **MAE** (+ report RMSE) | MAPE by category, **prediction-interval coverage** (do 90% intervals contain 90%?), residual analysis, error sliced by category/region |
| **Duplicate detector** | **Precision@k / Recall@k**, PR-AUC | threshold analysis, manual audit of false merges (false positives are worse — you'd hide real complaints) |
| **Clustering** | Silhouette, **DBCV** (density-based, right for HDBSCAN); qualitative exemplar review | noise ratio, cluster stability across runs |
| **Hotspot (Gi\*)** | statistical: significance/p-values, **spatial stability** over windows | precision against known recurring problem areas |
| **Forecasting** | **MASE** (scale-free, comparable across series) + sMAPE | interval coverage, backtest error by horizon, vs seasonal-naive baseline |
| **Computer Vision** | Macro-F1 (classification) / **mAP** (detection) | per-class, Grad-CAM sanity, confusion matrix |
| **LLM summaries/RAG** | **Groundedness / faithfulness**, citation precision | human rubric (usefulness/accuracy), hallucination rate on eval set, latency & cost per call |

**Always report the baseline alongside the model.** "DistilBERT macro-F1 0.86 vs TF-IDF baseline 0.79 vs majority-class 0.31" tells a story; a lone "86%" tells nothing.

---

## 30. Future improvements

- **Streaming ingestion** (Kafka) if real-time volume justifies it (currently a deliberate non-goal).
- **Active learning loop:** operators correct predictions → corrections become labeled data → scheduled retrain closes the loop (great continuous-learning story).
- **Multilingual + accessibility** for real civic equity.
- **Mobile app / PWA** for citizens; SMS/IVR intake.
- **Advanced geospatial:** spatio-temporal forecasting (predict *where* AND *when*), routing/optimization for crew dispatch (OR-Tools).
- **Fairness auditing:** check the system isn't systematically under-serving certain wards/demographics — an important responsible-AI extension for public systems.
- **Fine-tuned / distilled local LLM** to cut cost and keep all data on-prem.
- **Feature store (Feast), Airflow/Prefect orchestration, Kubernetes** — *if and only if* scale demands it; each is a documented scale-up path, not a day-one need.
- **Real municipal pilot** — the ultimate portfolio capstone.

---

# Development Milestones (the roadmap)

Sequenced so each milestone ships something demoable and every model builds on prior infrastructure. **Complexity** is relative effort (Low/Med/High/Very High). Move to the next milestone only when the **exit criteria** are met — resist starting M(n+1) with M(n) half-done; a finished narrow slice beats many half-slices.

---

### M0 — Foundation, restructure & data acquisition
- **Objective:** Turn the prototype into a real project skeleton and, critically, **acquire and understand the 311 dataset.** This milestone is unglamorous and non-negotiable.
- **Complexity:** Medium
- **Dependencies:** none
- **Expected output:** monorepo restructured (§16); frontend moved to `frontend/`, throwaway Flask retired; Docker Compose boots Postgres(+PostGIS+pgvector)/Redis/MinIO; **311 data ingested to bronze**; a thorough **EDA notebook** (distributions, category balance, temporal seasonality, geo coverage, resolution-time distribution, missingness); DVC initialized; data-validation (Great Expectations) skeleton.
- **GitHub commits that should exist:**
  - `chore: restructure into monorepo (frontend/, services/, ml/, infra/)`
  - `feat(infra): docker-compose with postgres+postgis+pgvector, redis, minio`
  - `feat(data): 311 ingestion script → bronze layer (DVC tracked)`
  - `feat(data): silver cleaning + canonical schema + resolution_hours`
  - `docs: EDA notebook and data dictionary`
  - `feat(data): great-expectations validation suite`
- **Move on when:** cleaned silver dataset is queryable in Postgres, EDA answers "what do we actually have," and `docker compose up` runs the stack. **Do not touch models before this is true.**

---

### M1 — Anchor model + serving skeleton (the vertical slice)
- **Objective:** One model end-to-end: category classifier baseline **served** through the ML service and reachable via the gateway. Proves the whole spine works.
- **Complexity:** Medium
- **Dependencies:** M0
- **Expected output:** TF-IDF + LinearSVM baseline (MLflow-tracked, time-based eval, macro-F1 vs majority baseline); FastAPI **ml_service** `/classify`; FastAPI **gateway** `POST /complaints/analyze` calling it; Alembic migrations for core schema; MLflow running.
- **GitHub commits:**
  - `feat(ml): tf-idf + linearsvm category baseline with mlflow tracking`
  - `feat(ml-service): fastapi /classify endpoint loading registered model`
  - `feat(gateway): /complaints/analyze orchestrating ml-service`
  - `feat(db): alembic migrations for users/categories/complaints`
  - `test: contract tests for classify + analyze`
- **Move on when:** an API call with complaint text returns a category + confidence, sourced from a registered model, with a metric you can defend.

---

### M2 — Frontend ↔ real backend + auth (kill the mock data)
- **Objective:** The polished UI runs on **real predictions and real persistence**, behind real auth.
- **Complexity:** Medium
- **Dependencies:** M1
- **Expected output:** `lib/mock-data` removed; TanStack Query client on `lib/api`; JWT auth + RBAC; report form shows **live AI category feedback** as the user types; complaints persist; my-reports + status lifecycle.
- **GitHub commits:**
  - `feat(auth): jwt auth + rbac (citizen/operator/analyst/admin)`
  - `feat(frontend): replace mock data with tanstack-query api client`
  - `feat(frontend): live AI category suggestion on report form`
  - `feat(gateway): complaints CRUD + status state machine + history`
  - `test(e2e): report → predict → submit flow (playwright)`
- **Move on when:** a user can register, submit a real complaint, see a real prediction, and track it — no mock data anywhere.

---

### M3 — Advanced NLP + embedding backbone (unlocks 4 features)
- **Objective:** Upgrade classification to a transformer and **build the embedding layer** that powers duplicates, clustering, and search.
- **Complexity:** High
- **Dependencies:** M1 (data + serving)
- **Expected output:** fine-tuned DistilBERT classifier (beats baseline on macro-F1, promoted via registry gate); sentence-transformers embeddings stored in pgvector; `/duplicates` (embedding + PostGIS `ST_DWithin` + time window); duplicate warnings surfaced at submit; text-attribution explainability in UI.
- **GitHub commits:**
  - `feat(ml): fine-tune distilbert category classifier (beats baseline)`
  - `feat(ml): sentence-transformer embeddings + pgvector index`
  - `feat(ml-service): /embed and /duplicates endpoints`
  - `feat(frontend): duplicate-warning UX + word-level explanation`
  - `docs(model-card): category classifier`
- **Move on when:** transformer beats baseline on the time-based holdout AND duplicate detection works at submit time with a tuned threshold.

---

### M4 — Tabular ML: resolution-time regression + SHAP (the DS showpiece)
- **Objective:** Your strongest data-science artifact: predict resolution time with intervals and explanations.
- **Complexity:** High
- **Dependencies:** M0 (data), M3 (embeddings as features)
- **Expected output:** LightGBM regressor with engineered temporal/geo/text-embedding features; prediction intervals (quantile regression or conformal); **SHAP** explanations served and rendered; leakage tests; error analysis by slice.
- **GitHub commits:**
  - `feat(ml): resolution-time lightgbm regressor + feature pipeline`
  - `feat(ml): prediction intervals (quantile/conformal)`
  - `feat(ml): shap explanations + /explain endpoint`
  - `feat(frontend): expected-resolution + why panel`
  - `test(ml): leakage + behavioral tests; docs(model-card)`
- **Move on when:** regressor beats a mean/median baseline on MAE with calibrated intervals, and SHAP explanations render in the UI.

---

### M5 — Geospatial intelligence: clustering + hotspots
- **Objective:** Turn points on a map into statistically grounded operational intelligence.
- **Complexity:** High
- **Dependencies:** M0, M3
- **Expected output:** HDBSCAN incident clustering (Worker job); **Getis-Ord Gi*** hotspot detection over spatial units + time windows; hotspot heatmap + cluster views in the analytics UI; async recompute via Worker.
- **GitHub commits:**
  - `feat(worker): hdbscan incident clustering job`
  - `feat(ml): getis-ord gi* hotspot detection (esda/postgis)`
  - `feat(frontend): hotspot heatmap + cluster explorer`
  - `feat(gateway): /clusters and /hotspots endpoints`
- **Move on when:** the map shows significant hotspots (with p-values) and coherent clusters, recomputed on a schedule.

---

### M6 — Time-series forecasting
- **Objective:** Forecast complaint volume with uncertainty → enables proactive resourcing.
- **Complexity:** High
- **Dependencies:** M0 (history)
- **Expected output:** SARIMA/seasonal-naive baselines; **LightGBM global forecaster** with lags/calendar/rolling features; rolling-origin backtesting (MASE/sMAPE, interval coverage); forecast charts with confidence bands; nightly retrain job.
- **GitHub commits:**
  - `feat(ml): forecasting baselines (seasonal-naive, sarima) + backtest`
  - `feat(ml): lightgbm global volume forecaster with intervals`
  - `feat(worker): scheduled forecast retraining`
  - `feat(frontend): forecast dashboard with confidence bands`
  - `docs(model-card): forecaster + backtest results`
- **Move on when:** forecaster beats seasonal-naive on MASE in backtesting and forecasts render with intervals.

---

### M7 — LLM layer: summaries, recommendations, NL query
- **Objective:** The decision-support "wow" layer — plain-language intelligence over everything built so far.
- **Complexity:** High
- **Dependencies:** M3–M6 (there must be real intelligence to summarize)
- **Expected output:** **llm_service** with RAG over pgvector; executive **briefing** (Claude Opus, cited); **action recommendations** (schema-constrained); **NL query** (Haiku router → guarded text-to-SQL / RAG); **PII scrubber** with tests; Redis caching; SSE streaming to UI; LLM offline eval set.
- **GitHub commits:**
  - `feat(llm-service): rag pipeline over pgvector + pii scrubber`
  - `feat(llm-service): executive briefing (grounded + cited)`
  - `feat(llm-service): action recommendations (structured output)`
  - `feat(llm-service): nl-query router + guarded text-to-sql`
  - `feat(frontend): streamed briefing + assistant UI`
  - `test(llm): groundedness/citation eval suite`
- **Move on when:** briefings are grounded+cited, NL query returns correct results on an eval set, and no PII reaches the LLM (test-proven).

---

### M8 — Computer Vision (OPTIONAL track)
- **Objective:** Image-based issue recognition/verification. Include only if core (M1–M7) is solid.
- **Complexity:** Very High (separate dataset)
- **Dependencies:** M2 (upload), M3 (to cross-check text)
- **Expected output:** transfer-learned CNN/ViT on a public road-damage/pothole/garbage dataset; async CV inference in Worker; auto-tag + text/image agreement check; **Grad-CAM** overlays; image storage in MinIO/S3.
- **GitHub commits:**
  - `feat(ml): transfer-learned image classifier (timm) + eval`
  - `feat(worker): async cv inference + grad-cam`
  - `feat(frontend): image upload + cv result + heatmap`
  - `docs(model-card): cv model + dataset provenance`
- **Move on when:** uploaded images are classified with a defensible macro-F1 and Grad-CAM renders — OR consciously defer and document as future work.

---

### M9 — MLOps hardening, monitoring & deployment
- **Objective:** Make it production-credible: monitored, tested, CI/CD'd, deployed, documented.
- **Complexity:** High
- **Dependencies:** all prior
- **Expected output:** Evidently drift dashboards + alerts; Prometheus/Grafana (latency, throughput, prediction distributions); full GitHub Actions CI/CD incl. **model-regression gate**; prod compose behind nginx/TLS; live deployment; retrain-on-drift wiring; polished README + architecture diagrams + model cards; demo video/screenshots.
- **GitHub commits:**
  - `feat(mlops): evidently drift monitoring + reports`
  - `feat(obs): prometheus + grafana dashboards`
  - `ci: full pipeline with model-regression gate + image scans`
  - `feat(infra): production compose + nginx + tls`
  - `docs: final README, architecture diagrams, model cards, demo`
- **Move on when:** it's deployed, monitored, CI-gated, and documented well enough that a stranger understands it in 5 minutes. **This is the state that gets interviews.**

---

## Milestone dependency graph

```
M0 ──▶ M1 ──▶ M2
 │      │
 │      └────▶ M3 ──▶ M4
 │              │
 ├────────────▶ M5
 ├────────────▶ M6
 │              │
 │      (M3,M4,M5,M6) ─▶ M7
 │                        │
 └─▶ (M2) ─────────▶ M8 (optional)
                          │
   (all) ────────────────▶ M9
```

**A realistic sequencing note:** M0→M1→M2 is the mandatory spine. After M3, milestones M4/M5/M6 are **largely independent** and can be reordered by interest — but each should be *finished* before the next starts. M7 needs the intelligence from M3–M6 to be worth building. M8 is genuinely optional. M9 is the finish line that converts "impressive repo" into "hireable portfolio."

---

## Final architect's notes / where I pushed back on the brief

1. **Real data over synthetic** is the highest-leverage decision in this document. Without it, every model is unconvincing.
2. **Depth beats breadth** — 6 rigorous features > 14 shallow ones. The milestones enforce this.
3. **Several "features" are one system** — embeddings power duplicates/clustering/search; one LLM service powers summaries/recommendations/NL-query. Build shared infrastructure, expose multiple views.
4. **Severity prediction is a labeling trap** — don't ship keyword-derived severity as a "model." Use a defensible proxy label or say what it is.
5. **Don't use an LLM for classification** — fine-tuned DistilBERT is cheaper, faster, more accurate, more explainable. Reserve the LLM for reasoning.
6. **CV is optional and data-constrained** — transfer learning on a separate public dataset, not from scratch, and never on the critical path.
7. **Postgres+PostGIS+pgvector over MySQL+separate-vector-DB, FastAPI over Flask** — one geo+vector+relational engine and an async ML-friendly framework are the right tools and the right story.
8. **Resist over-engineering** — no Kafka, no k8s, no Feast, no multi-agent swarm on day one. Each is a *documented scale-up path*, and knowing when *not* to use them is the senior signal that separates this from a résumé-keyword project.

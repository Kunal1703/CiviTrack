# CiviTrack AI — Project Continuity & Handoff (PROJECT_CONTEXT.md)

> **This is the continuity reference for the next Claude Code session.** It records
> the **actual, verified repository/branch/Docker/DB state**; the M5 execution and
> verification pass was completed and committed on **2026-08-14**.
> **Do not assume this doc is more authoritative than the code.** On any
> contradiction, inspect the code/data and update this file.
>
> **M5 (geospatial hotspots) is now ✅ DONE, verified and committed** on branch
> `feat/m5-geospatial-hotspots` (not merged, not pushed). **The next milestone is
> M6 (time-series forecasting), which is design-first and NOT started.** Jump to
> `## Next Claude Session — Start Here` at the very bottom.

---

## 0. Right now (session starting point)

- **Current git branch:** `feat/m5-geospatial-hotspots`. **M5 is complete** — migration
  `0008` applied, Gi\* batch run against real Postgres, gateway API + admin map built,
  verified end-to-end, and committed (per-step). **Not merged, not pushed.**
- **Docker:** gateway image was **rebuilt from the M5 branch** (so the running gateway
  now serves `/api/v1/hotspots` and **no longer serves M4's `/resolution-time`** — M4 is
  unmerged; expected). All 3 containers healthy; ports 5433/8000/8001 open.
- **Measured M5 result (2026-08-14):** overall Gi\* on 200,782 geocoded NYC 311 points →
  1,086 cells, **272 hot / 273 cold** significant (BH-FDR α=0.05); monthly hot-cell
  Jaccard stability **mean 0.68**; runtime 183 s. See `docs/M5_REPORT.md`.
- **Immediate next action:** **M6 (time-series forecasting) — design-first, NOT started.**
  Do not begin implementation before a committed M6 design.

---

## 1. Project overview

**CiviTrack AI** — an end-to-end AI/ML civic-complaint intelligence platform on **real
NYC 311 open data**. It classifies complaints (DistilBERT), finds semantically related
incidents + detects duplicates (MiniLM embeddings + pgvector + PostGIS spatial-temporal
gate), clusters patterns, predicts resolution time (LightGBM), and (in progress) detects
statistically-significant geospatial hotspots (Getis-Ord Gi\*). Served through a
Dockerized FastAPI gateway / ml_service / PostgreSQL(PostGIS+pgvector) stack and a
premium Next.js frontend. Purposes: (1) genuine ML/DS project, (2) portfolio piece,
(3) demoable in hackathons/interviews. Principle: real data → baselines before deep
models → measured evaluation → explainability → honest limitations.

---

## 2. Milestone status (VERIFIED against the repo, not the blueprint)

| Milestone | Status | Where it lives |
|---|---|---|
| **M0** Data & infrastructure | ✅ DONE | `main` |
| **M1** Classification (DistilBERT) | ✅ DONE | `main` |
| **M2** Product integration | ✅ DONE | `main` |
| **M3** Semantic intelligence | ✅ DONE | `main` |
| **Product/UX upgrade** (role-based platform, "Phases 1–5") | ✅ DONE | `main` (merged) |
| **M4** Resolution-time regression | ✅ DONE (committed, **NOT merged, NOT pushed**) | branch `feat/m4-resolution-regression` only |
| **M5** Geospatial hotspots (Gi\*) | ✅ DONE (executed, verified & committed, **NOT merged, NOT pushed**) | branch `feat/m5-geospatial-hotspots` (current) |
| **M6** Time-series forecasting | 🔒 PLANNED (not started) | — |
| **M7** LLM / RAG | 🔒 PLANNED (not started) | — |

> **Important branch reality:** M4 and M5 are **independent feature branches off
> `main`**; **neither is merged into `main`**. So the **M5 branch does NOT contain any
> M4 code or M4 docs** (they exist only on the M4 branch). Nothing from this session
> (product-UX, M4, M5) has been **pushed** to the remote.

---

## 3. Git state (VERIFIED via `git branch -a`, `git log`, `git status`)

- **Branches:** `main`, `feat/role-based-civic-platform`, `feat/m4-resolution-regression`,
  `feat/m5-geospatial-hotspots` (current), `remotes/origin/main`.
- **`origin/main` (remote) = `8e2f8c3`** — the **pre-product-UX** state. **NOTHING new
  has been pushed.** Local `main` is **5 commits ahead of `origin/main`, unpushed.**
- **`main` (local) = `5f6bf92`** — M0–M3 **+** the full Product/UX upgrade. The 5
  product-UX commits: `55e4bde` feat(platform) → `b233038` feat(citizen) → `47a0fc6`
  feat(admin) → `1ee1fe7` feat(web) → `5f6bf92` feat(polish).
- **`feat/role-based-civic-platform`** = `5f6bf92` (the product-UX branch, already
  fast-forward-merged into `main`).
- **`feat/m4-resolution-regression`** = `09d212d` — `main` + 5 M4 commits:
  `a9d6f6f` docs(m4 design) → `d2897fc` feat(ml LightGBM) → `f9ab446` feat(ml serving)
  → `cff948d` feat(admin resolution-insights UI + docs) → `09d212d` docs(m4 status).
  **NOT merged, NOT pushed.**
- **`feat/m5-geospatial-hotspots`** (current) = `7807ce0` — `main` + 1 commit
  `7807ce0 docs(m5): geospatial hotspots design`. **NOT merged, NOT pushed.**
- **Uncommitted on the M5 branch (`git status --short`):**
  - ` M ml/requirements-ml.txt` (added `esda>=2.5`, `libpysal>=4.9`)
  - `?? db/migrations/0008_geo_hotspots.up.sql`, `?? …0008_geo_hotspots.down.sql`
  - `?? ml/geo/` (new package: `__init__.py`, `config.py`, `grid.py`, `gi_star.py`, `run.py`)
  - These are the **M5 pipeline — written, unrun, uncommitted.**

---

## 4. Docker state (VERIFIED healthy 2026-08-08)

Compose file `infra/docker-compose.yml`, project name `civitrack-ai`.

| Container | Status | Host port → internal |
|---|---|---|
| `civitrack-postgres` | up, healthy | 5433 → 5432 |
| `civitrack-gateway` | up, healthy | 8000 → 8000 |
| `civitrack-ml-service` | up, healthy | 8001 → 8001 |

- **Frontend is NOT containerized** (Next.js dev server; `/api/*` proxied to gateway).
  Whether a dev server is currently running: **UNKNOWN — VERIFY** (start with
  `cd frontend && npm run dev`; port 3000).
- **⚠️ GOTCHA — running images vs checked-out branch:** the **gateway image was rebuilt
  from the M5 branch** (2026-08-14), so the running gateway now serves M5 `/api/v1/hotspots`
  and **no longer serves M4's `/resolution-time`** (404) — M4 is unmerged, on its own branch
  only; this is **expected**. M1 `/classify` and M3 `/semantic/*` are unaffected (verified
  200). The **ml_service image is still the M4-era 0.2.0 build** (serves classify/semantic;
  its `/resolution-time` is unused now that the gateway no longer proxies to it). The **M5
  Gi\* batch job runs on the HOST `.venv`** (reads Postgres directly) — no image rebuild.
  To restore M4's endpoint, rebuild the gateway from the M4 branch. M4 remains safe on its
  own branch.
- **Recurring infra flake:** Docker Desktop tends to **stop during machine pauses**;
  `restart: unless-stopped` does not always relaunch a cleanly-exited container. If the
  dev-proxy returns 500 with `ECONNREFUSED ::1:8000 / 127.0.0.1:8000`, or the gateway
  container is `Exited (0)`, run `docker compose up -d gateway` from `infra/`. Docker
  Desktop exe: `C:\Users\kunal\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe`.
- **Env vars of note (compose):** `POSTGRES_HOST_PORT=5433`, `GATEWAY_PORT=8000`,
  `ML_SERVICE_PORT=8001`, `JWT_SECRET`, `ADMIN_SIGNUP_CODE` (dev `civitrack-admin-2026`
  in git-ignored `infra/.env`), `HF_CACHE`, `MODEL_DIR=/model`. **On the M4 branch only:**
  ml_service also mounts `../ml/models/resolution/artifacts:/resolution_model:ro` and
  sets `RESOLUTION_MODEL_DIR=/resolution_model` — **these are NOT in the M5 branch's
  compose file.**

---

## 5. Database state (VERIFIED, read-only, 2026-08-08)

- **PostgreSQL 16.14**, **PostGIS 3.4.3**, **pgvector 0.8.5** (one bundled image;
  `db/init/01-extensions.sql` enables extensions first-boot). Data on named volume
  `civitrack_pgdata` (survives restarts).
- **Migrations** (numbered reversible SQL via `db/migrate.py`; **no Alembic**):
  `0001–0008` **APPLIED** (`0008_geo_hotspots` applied 2026-08-14; `geo.hotspots` populated
  with 16,990 rows). Check/apply: `POSTGRES_PORT=5433 .venv/Scripts/python.exe db/migrate.py status|up`.
- **Schemas present:** `silver`, `semantic`, `app`, `public`, **`geo`** (created by 0008;
  holds `geo.hotspots` + `geo.incident_clusters`).
- **Tables + row counts (verified):**
  - `silver.complaints_311` — **204,000** (NYC 311, 2024; ~200,782 geocoded / geo_valid;
    ~200,180 closed with `resolution_hours`).
  - `semantic.complaint_embeddings` — **201,585** = **201,537 NYC** (`embedding_version='v1'`,
    `data_version='b6d58293cbe7ab14'`) + **48 Delhi** (`embedding_version='delhi-v1'`,
    `data_version='delhi_demo'`). `semantic.descriptor_clusters` (M3).
  - `app.users` — **4** (citizen/admin). `app.complaints` — **48** (**46**
    `source='seed_delhi_demo'` + **2** `source='web'`). `app.complaint_updates`,
    `app.departments` (7 seeded).
- **Test accounts (in `app.users`):** citizen `aarav.citizen@example.com` / `citizenpass1`;
  admin `ops.admin@example.com` / `adminpass1` (admin invite code `civitrack-admin-2026`).
  Passwords argon2-hashed. **VERIFY still present before relying on them.**

---

## 6. Architecture (actual)

```
Citizen / Admin / Public browser
        │  (Next.js dev server :3000, NOT containerized; /api/* proxied → gateway)
        ▼
FastAPI Gateway  (Docker civitrack-gateway :8000)
   • auth (JWT httpOnly), server-side RBAC, complaints CRUD, admin analytics,
     M1 classify proxy, M3 semantic proxy   [+ M4 /resolution-time on M4 branch]
        │  httpx
        ▼
ml_service  (Docker civitrack-ml-service :8001)
   • M1 DistilBERT classifier (mounted artifact)  • M3 all-MiniLM-L6-v2 embedder
   • read DB pool for pgvector   [+ M4 resolution predictor on M4 branch]
        │  psycopg
        ▼
PostgreSQL 16 + PostGIS 3.4.3 + pgvector 0.8.5  (Docker civitrack-postgres :5433)
   • silver.complaints_311 (NYC)   • semantic.* (embeddings/clusters)
   • app.* (users/complaints/updates/departments)   [+ geo.* after M5 0008]
```
Gateway owns **no** model code. Offline ML batch jobs (M1 training, M3 embedding/
clustering, M4 training, **M5 Gi\***) run on the **host** and write artifacts/tables;
they are not services. **No Worker/Redis/MinIO/Kafka/k8s** (deliberately deferred).

---

## 7. M1 — Classification (DONE)

- **Data:** NYC 311 stratified across 12 months of 2024 (~204k) → canonical labeled
  **201,537** (`data/gold/`); **19 canonical categories (18 + Other)**
  (`ml/data/category_taxonomy.yaml`).
- **Honest data reality:** NYC 311 has **no free-text complaint body**; `complaint_type`
  is the **label** (can't be an input — leakage). Text used = **`descriptor`** (short,
  formulaic; only ~776 unique).
- **Models:** TF-IDF + **LogisticRegression** baseline; **DistilBERT** production
  (`distilbert-base-uncased`). Primary metric **macro-F1**. MLflow-tracked. Model card:
  `docs/model-cards/complaint-classifier.md`.
- **Honest metrics (from model card):** in-distribution 311 descriptors —
  DistilBERT macro-F1 **0.9626** vs TF-IDF **0.9756** (baseline slightly higher because
  DistilBERT was trained on a **CPU-limited ~6k subset**); **citizen-phrasing probe** —
  DistilBERT **wins** (probe acc **0.5556** / macro-F1 **0.4497** vs TF-IDF **0.3889** /
  **0.3525**). The distinction (**in-distribution ≈ baseline; DistilBERT wins on
  real citizen phrasing / generalization**) must be preserved, not exaggerated.
- **Serving:** `ml_service /classify` ← gateway `POST /api/v1/classify` (`{description}` →
  `{category, confidence}`). Local model, no paid API. **Do not break this endpoint.**

---

## 8. M3 — Semantic Intelligence (DONE)

- **Embeddings:** `all-MiniLM-L6-v2` (384-d) in `semantic.complaint_embeddings`;
  **HNSW cosine** index. 201,537 NYC vectors (~776 unique descriptors → fan-out).
  Benchmark chose MiniLM (AUC 0.986 vs TF-IDF 0.951; BGE-small a drop-in future swap).
- **Retrieval:** cosine ANN. **Precision@5 0.76, MRR 0.80**. p50 latency ~820 ms
  (CPU single-query embed dominates).
- **Duplicate detection:** similarity **+ PostGIS `ST_DWithin` spatial gate + temporal**
  gate; threshold data-derived (~0.59). Natural-language: TF-IDF F1 0.17 vs MiniLM 0.95;
  categorical: similarity-only precision 0.56 → **+ spatial gate → 1.00**.
- **Clustering:** HDBSCAN (14 clusters, silhouette 0.20) vs K-Means (0.04); offline.
- **APIs:** `ml_service /semantic/{search,related,duplicate-check,embed}` ← gateway
  `POST /api/v1/semantic/{search,related,duplicate-check}`. **ml_service owns semantic +
  read DB pool.** Docs: `docs/M3_DESIGN.md`, `docs/M3_REPORT.md`,
  `docs/model-cards/semantic-embedding.md`. **Do not break these.**
- **NYC vs Delhi dataset boundary (added by the Product/UX upgrade):** the M3 endpoints
  take a `dataset` param — `'nyc'` (default; `silver.complaints_311`, version `v1`) vs
  `'delhi'` (`app.complaints`, `embedding_version='delhi-v1'`, `data_version='delhi_demo'`).
  The two corpora are kept **strictly separate**; the citizen product uses `'delhi'`.

---

## 9. Product/UX upgrade (DONE — outside M0–M7 numbering, now part of the platform)

A 5-phase effort turning CiviTrack into a **role-based two-sided platform**. All on
`main`. Full detail: **`docs/PRODUCT_UX.md`**.

- **Auth & roles:** `app.users` (argon2 hashes, `role` citizen|admin), **JWT in httpOnly
  cookies**, admin provisioning via `ADMIN_SIGNUP_CODE`. Gateway `/api/v1/auth/
  {register,login,refresh,logout,me}`.
- **Server-side authorization** is the authority (`require_admin`, ownership scoping);
  `frontend/proxy.ts` (Next 16 renamed middleware) is convenience-only route guarding.
- **Citizen experience:** `/citizen` dashboard (scrollytelling + 2D `CivicCanvas` hero),
  `/citizen/report` (real submit + live **M1** suggestion + **M3 Delhi** duplicate check
  + Delhi map picker), `/citizen/reports` (+ `/[id]` detail with status timeline),
  `/citizen/nearby`. Complaints persist in `app.complaints` (identity from session).
- **Admin operations:** `/admin` overview (KPIs), `/admin/issues` (searchable/filterable/
  sortable/paginated queue), `/admin/issues/[id]` workspace (override category, assign
  dept/person, change status, internal notes hidden from citizens, timeline, M3 related),
  `/admin/map`, `/admin/analytics` (Recharts). Gateway `/api/v1/admin/stats|assignees`,
  complaints CRUD, `/complaints/map` (non-PII), `/departments`.
- **Delhi map & heat:** center Delhi `[28.6139, 77.209]`; category-aware markers;
  data-driven heat thresholds **1–2 yellow / 3–4 orange / 5+ red** (client-aggregated).
- **Public:** scrollytelling landing `/` (6-section narrative, animated pipeline demo,
  role-aware CTAs, **no engineering language**); `/architecture` developer showcase
  (holds all engineering/ML language + honest NYC-vs-Delhi data note + roadmap).
- **Cleanup:** old mock pages retired as redirects (`/report→/citizen/report`,
  `/issues→/`, `/dashboard→/`); `lib/mock-data.ts` + 13 orphaned mock components deleted;
  role-aware command palette.
- **Polish:** skip-link + `<main>` landmark, focus-visible rings, keyboard-navigable
  queue rows, reduced-motion honored; Recharts dynamic-imported on analytics; one
  magnetic hero CTA. Verified end-to-end; production build passes.

---

## 10. M4 — Resolution-Time Regression (DONE — on `feat/m4-resolution-regression` ONLY)

> ⚠️ **On the current M5 branch, none of the following files exist** (M4 is unmerged).
> They are on the M4 branch. **M4 is committed there, NOT merged into `main`, NOT pushed.**

- **Model:** LightGBM **quantile** regressor on **200,180 closed** NYC 311 complaints.
  Target **`log1p(resolution_hours)`** (heavy-tailed: p50 7.2 h, max 22,560 h). **1.9%
  open excluded** (right-censored). Package `ml/models/resolution/`.
- **Leakage allow-list:** EXCLUDE `closed_date`, `resolution_hours`, `status`;
  `complaint_type` is a legit **input** here (it was the M1 label, not here).
- **Baselines:** global-median; **agency×category-median** (the strong bar).
- **Intervals:** quantiles q10/q50/q90 + **CQR conformal** calibration on val.
- **Measured (time-split test, 49,939 rows):** LightGBM q50 **MAE 225 h** beats
  agency×category-median **238 h** and global-median **276 h**; **MedAE 8.3 h** (typical
  case; MAE inflated by heavy tail). 80% interval coverage **0.74** (time-shift) /
  **0.80** (exchangeable random split). SHAP: `complaint_type` dominant.
- **Serving:** `ml_service /resolution-time(+/meta)` ← gateway `POST /api/v1/resolution-time`
  (**admin-only**). Boosters mounted read-only (git-ignored artifacts).
- **UI:** admin **"Resolution insights"** on `/admin/analytics` (global SHAP drivers +
  try-it form → expected range + why), **clearly labeled NYC-trained** — never applied
  to Delhi complaints.
- **Docs (on M4 branch):** `docs/M4_DESIGN.md`, `docs/M4_REPORT.md`,
  `docs/model-cards/resolution-regressor.md`. Verified end-to-end (admin predict,
  citizen 403, anon 401, M1/M3 intact, build passes).

---

## 11. M5 — Geospatial Hotspots (IN PROGRESS — the current task)

**Goal:** statistically-grounded **Getis-Ord Gi\*** complaint hotspots (z-scores +
p-values, FDR-corrected significance bands) over a ~1 km grid of the NYC 311 corpus —
via **esda/libpysal + PostGIS** — plus (optional/deferred) DBSCAN spatial incident
clustering. Offline batch → `geo.*` → gateway (admin) → admin "Hotspot intelligence" map.
Design: **`docs/M5_DESIGN.md`**. **Measured results & method card: `docs/M5_REPORT.md`,
`docs/model-cards/hotspots.md`** (executed & verified 2026-08-14 — see below).

### 11.0 Measured outcome (2026-08-14, verified)
- **Overall Gi\*** on 200,782 geocoded NYC 311 points over a ~1 km grid → **1,086 cells**,
  **272 hot / 273 cold** significant (BH-FDR α=0.05); z-range −0.66…+3.48; hot-band cells
  average 614/371/281 complaints vs cold 41/20/15 (clean monotonic gradient). Top hot cells
  in Manhattan core + South Bronx (face validity ✅).
- **Per-category** (top-6 types) + **12 monthly** windows computed; monthly hot-cell
  **Jaccard stability mean 0.68**. Honest note: per-category runs show `hot_99=0` (999-perm
  p-floor × BH across ~600–975 cells) — a real method property, documented.
- **Serving verified:** gateway `GET /api/v1/hotspots(+/meta)` admin-only (anon 401 /
  citizen 403 / admin 200); admin `/admin/hotspots` map labeled "NYC 311 spatial analysis";
  Delhi product map unchanged; M1/M3 intact; production frontend build passes.
- **DBSCAN incident clustering was deferred** (optional per design §4/§11); `geo.incident_clusters`
  exists but is unpopulated.

### 11.1 What was WRITTEN (now committed & verified)
- **Migration `db/migrations/0008_geo_hotspots.{up,down}.sql`** — creates schema **`geo`**
  with `geo.hotspots` (method, spatial_unit, cell_key, category, window_label, count,
  gi_z, p_value, significance, centroid `geometry(Point,4326)`, cell `geometry(Polygon,
  4326)`; UNIQUE(spatial_unit,cell_key,category,window_label); GiST + btree indexes) and
  `geo.incident_clusters` (for optional DBSCAN). **NOT applied** (0008 unchecked).
- **`ml/geo/` package (host batch job):**
  - `config.py` — DB dsn, `CELL_SIZE_DEG=0.009` (~1 km), NYC `BBOX`, `PERMUTATIONS=999`,
    `FDR_ALPHA=0.05`, `TOP_CATEGORIES=6`, 12 monthly windows, DBSCAN params.
  - `grid.py` — `load_counts()` (fast integer-bucketed per-cell counts; supports
    category/month filters), `build_cells()` (study area = non-empty cells + 8-neighbours
    for zero-context), `top_categories()`.
  - `gi_star.py` — `queen_weights()` (libpysal `W` from grid i/j, row-standardized),
    `compute()` (`esda.G_Local(star=True, permutations=999)` → z + BH-FDR p → hot/cold
    99/95/90 bands).
  - `run.py` — batch: DELETE + recompute Gi\* for **overall + top-6 categories + 12
    monthly windows**, writes count>0 cells to `geo.hotspots`, computes month-to-month
    **Jaccard stability**, writes `ml/geo/reports/metrics.json`, prints a summary.
    Run: `POSTGRES_PORT=5433 .venv/Scripts/python.exe -m ml.geo.run` (deps `esda 2.10`,
    `libpysal 4.15` already installed in `.venv`).
- **NOT written yet:** gateway `/api/v1/hotspots` router + schemas; admin "Hotspot
  intelligence" map UI; `docs/M5_REPORT.md`; method/model card; DBSCAN clustering step
  (optional).

### 11.2 M5 data honesty
- M5 Gi\* operates on the **real NYC 311** corpus (`silver.complaints_311`) — the only
  data dense enough for valid spatial statistics. Coordinates are **real NYC**.
- The product's **Delhi map uses ~46 seeded demo complaints** (`source='seed_delhi_demo'`,
  clearly labeled "Demo Delhi data") — **far too sparse for meaningful Gi\***, so the
  Delhi product map keeps its **simple count-based heat** and is **left unchanged**.
- **Never** present the NYC Gi\* results as Delhi hotspots; **never** relabel NYC as
  Delhi; **never** present seeded Delhi data as real government complaints. The admin
  Hotspot view must be **clearly labeled "NYC 311 spatial analysis."**

---

## 12. M6 & M7 — future roadmap (PLANNED — DO NOT implement now)

- **M6 — Time-series forecasting:** temporal aggregation of complaint volume, seasonality/
  trend, SARIMA/seasonal-naive baselines → LightGBM global model, **rolling-origin
  backtesting** (MASE/sMAPE), forecast intervals. Design-first.
- **M7 — LLM/RAG:** grounded executive summaries, action recommendations, NL query
  (retrieval over pgvector + guarded text-to-SQL), citations, hallucination controls,
  PII scrubbing. Uses Anthropic Claude. Design-first.

---

## 13. College / portfolio ML concepts demonstrated (so far)

Supervised **classification** (NLP; TF-IDF + LogReg baseline; **DistilBERT** fine-tuning;
macro-F1; citizen-phrasing probe) · sentence **embeddings** + **vector similarity**
(pgvector HNSW cosine) · **duplicate detection** (semantic + spatial-temporal gate) ·
**clustering** (HDBSCAN vs K-Means) · supervised **regression** (**LightGBM** quantile,
log target, leakage controls, **conformal** intervals, **SHAP**) · **spatial statistics**
(**Getis-Ord Gi\*** — Queen weights, 999-permutation p-values, BH-FDR significance bands,
temporal stability) · **PostgreSQL/PostGIS/pgvector** · model **serving**
(FastAPI gateway→ml_service) · rigorous **evaluation** (baselines, honest metrics) ·
**Docker Compose** · role-based product engineering (auth/RBAC). M6 (forecasting) and M7
(LLM/RAG) will extend this. **M6/M7 are NOT complete — do not claim them.**

---

## 14. Known limitations (honest)

- ML backbone is **NYC 311**; the product experience is Delhi via **seeded demo data**
  (no real Delhi government complaint feed yet).
- M1 DistilBERT ≈ TF-IDF in-distribution (trained on a CPU-limited subset); wins only on
  citizen-phrasing generalization.
- M3 descriptors are short/formulaic (~776 unique) → duplicate/retrieval partly
  degenerate; the spatial-temporal gate is what makes duplicates precise.
- M4 heavy-tailed target caps MAE (MedAE is the representative metric); trained on NYC,
  not applied to Delhi.
- **M4 branch not merged into `main`, not pushed.**
- **M5 done but not merged, not pushed.** MAUP/permutation-floor/count-skew caveats apply
  (see `docs/M5_REPORT.md` §8); DBSCAN incident clustering was deferred (optional).
- Gateway image is now an **M5-branch build** (serves `/hotspots`, not `/resolution-time`);
  ml_service is still the **M4-era 0.2.0** build (see §4 gotcha).
- **DVC NOT initialized** (reproducibility via deterministic pipelines + content hashes +
  MLflow). Frontend **not containerized**. Docker Desktop stops on machine pauses.
- Nothing from this session (product-UX, M4, M5) is **pushed** to `origin`.

---

## 15. DO NOT BREAK

M1 `POST /api/v1/classify` · M3 `POST /api/v1/semantic/*` + pgvector + PostGIS ·
M5 `GET /api/v1/hotspots(+/meta)` (admin-only) + `geo.hotspots` + admin `/admin/hotspots`
map (**NYC-labeled**) · authentication (JWT httpOnly) + citizen/admin **server-side**
authorization · complaint persistence (`app.*`) · Delhi map + heat (unchanged by M5) ·
admin operations (queue/workspace/analytics) ·
the **M4 branch** work (leave `feat/m4-resolution-regression` intact; do not force-push/
delete) · existing Docker architecture + `db/migrate.py` migration mechanism · the
**NYC-vs-Delhi dataset boundary** and honesty rules.

---

## 16. Key file paths (quick reference)

- Migrations: `db/migrations/000X_*.{up,down}.sql`; runner `db/migrate.py`.
- M5 code: `ml/geo/{config,grid,gi_star,run}.py`; design `docs/M5_DESIGN.md`.
- Gateway: `services/gateway/app/{main.py, routers/*, schemas/*, core/*}`.
- ml_service: `services/ml_service/app/{main.py, routers/*, schemas/*, predictor.py, embedder.py, semantic_store.py}`.
- Frontend: `frontend/app/{citizen,admin,architecture,login,register}/`,
  `frontend/components/{citizen,admin}/*`, `frontend/lib/*`, `frontend/proxy.ts`.
- Compose: `infra/docker-compose.yml`; env `infra/.env` (git-ignored) / `.env.example`.
- Host venv with ML deps: `.venv/` (psycopg, lightgbm, shap, esda, libpysal, pandas,
  sklearn). Legacy `venv/` is the old Flask/MySQL env — ignore.
- **Docker CLI & Postgres are only reachable via PowerShell here (not the Bash tool).**
  Run host Python jobs from Bash with `POSTGRES_PORT=5433 .venv/Scripts/python.exe …`
  (add `PYTHONIOENCODING=utf-8` — the Windows console can't print unicode like `→`).

---

## Next Claude Session — Start Here

**M5 (geospatial hotspots) is ✅ DONE — executed, verified, and committed** on branch
`feat/m5-geospatial-hotspots` (not merged, not pushed). Do **not** redo M5. The measured
results are in `docs/M5_REPORT.md` and `docs/model-cards/hotspots.md`. If you need to
re-run the batch: `PYTHONIOENCODING=utf-8 POSTGRES_PORT=5433 .venv/Scripts/python.exe -m ml.geo.run`.

**The next milestone is M6 — Time-series forecasting (§12). It is DESIGN-FIRST and NOT
started.** Before any implementation:

1. **Verify state first** (do not trust this doc over the code): `git status`, `git branch`,
   PowerShell `docker ps` (all 3 containers healthy, ports 5433/8000/8001), and
   `POSTGRES_PORT=5433 .venv/Scripts/python.exe db/migrate.py status` (expect `0001–0008` applied).
2. **Write `docs/M6_DESIGN.md` first** and get it approved before coding — mirror the
   M4/M5 pattern: temporal aggregation of complaint volume, seasonality/trend, SARIMA /
   seasonal-naive **baselines** → a LightGBM global model, **rolling-origin backtesting**
   (MASE/sMAPE), forecast intervals. Real NYC 311 for the analytics; honest baselines-first.
3. **Do NOT redesign M1–M5** and **do NOT touch the M4 branch** (`feat/m4-resolution-regression`
   remains unmerged/unpushed; leave it intact).
4. **Branch reality unchanged:** nothing this session (product-UX, M4, M5) is pushed to
   `origin`; M4 and M5 are independent branches off `main`, neither merged. The running
   gateway now serves M5 `/hotspots` and **not** M4 `/resolution-time` (M4 is unmerged).

Honesty rules (non-negotiable, carry into M6): ML runs on **real NYC 311** data; the
**Delhi demo data is seeded, clearly labeled, and sparse** — never relabel NYC as Delhi
or present seeded data as real government complaints. Do not break anything in §15.

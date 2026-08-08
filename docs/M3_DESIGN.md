# M3 — Semantic Intelligence · Technical Design

> **Status:** Design finalized; **implementation not started** (awaiting explicit go-ahead).
> **Mission:** Move CiviTrack AI from *classifying* complaints to *understanding relationships between* them — semantic similarity, duplicate/near-duplicate detection, related-complaint retrieval, and semantic clustering — on the existing Postgres + pgvector infrastructure.
> **Source of truth:** `docs/BLUEPRINT.md`.
>
> **🔒 Locked decisions (approved):**
> 1. **Reconcile data:** reload the 204k M1 stratified silver into Postgres before embedding.
> 2. **Embedding model:** ship `all-MiniLM-L6-v2` (384-dim); benchmark `BGE-small-en-v1.5` (drop-in, same dim) in Phase 2; TF-IDF cosine = classical baseline throughout.
> 3. **Migrations:** lightweight numbered reversible SQL migrations (`db/migrations/*.up.sql`/`.down.sql` + psycopg runner + `schema_migrations`); not Alembic.
> 4. **Duplicate definition:** semantic similarity **+ spatial-temporal gate** (PostGIS `ST_DWithin` + time window), threshold learned from labeled data.

---

## 0. Current-state inspection (what M3 builds on)

Findings from inspecting the live repo/DB (not memory):

| Area | Reality today | Implication for M3 |
|---|---|---|
| **Vector infra** | pgvector **0.8.5** + PostGIS 3.4.3 enabled; `silver.complaints_311` table | Reuse — no new vector DB (per constraint). |
| **Data divergence** ⚠️ | Postgres silver = **50,000 rows** (M0 Jan slice); `data/silver/nyc311_clean.parquet` = **204k** (M1 stratified). M1's `prepare_data` wrote parquet but **never reloaded Postgres**. | **Must reconcile** — reload the canonical 204k into Postgres so embeddings cover the same complaints the classifier trained on. |
| **Text field** | `descriptor` (short phrases), `unique_key` (311 id), `complaint_type`, `geom` (PostGIS point) | Embed `descriptor` (honest proxy); `geom` enables spatial blocking for duplicates. |
| **Preprocessing** | `ml/models/classification/text.py::clean_text` (strips punctuation) + vendored copy in ml_service | See §5 — embeddings need a *lighter* normalizer; reuse the *parity principle*, not the exact function. |
| **ml_service** | Clean FastAPI: `core/{config,logging}`, `predictor.py`, `routers/classify.py`, `schemas/classify.py`, vendored `text.py` | Extend, don't rebuild. Add a semantic router + a vector-search predictor + a DB connection. |
| **Migrations** | **No Alembic** (only a transitive MLflow dep). Real strategy = `db/init/01-extensions.sql` (first-boot only) + programmatic DDL in `ml/data/load.py`. | Introduce a lightweight, reversible migration mechanism (see §8). |
| **DVC** | **Not initialized.** | Eval dataset is small metadata → commit to git; DVC stays optional (see §14). |
| **MLflow** | Local SQLite backend (`mlruns/mlflow.db`, 872 KB) | Continue; add a `semantic-embeddings` experiment. |

**Reusable as-is:** pgvector/PostGIS, ml_service skeleton, gateway proxy pattern, M2 design-system (`ui-kit.tsx`, `CategoryBadge`, `Reveal`, `ConfidenceBar`), MLflow, the shared-preprocessing *principle*, the `sentence-transformers` dependency (already in `ml/requirements.txt`).

---

## 1. Core principle — three different problems

Per the mission's explicit warning, M3 treats these as **distinct**, each with its own technique and evaluation. Conflating them is the main design risk.

| Problem | Question | Technique | Ground truth |
|---|---|---|---|
| **A. Semantic retrieval** | "What is *related* to this?" | Embedding ANN search (pgvector), ranked by cosine | Relevance judgments (Precision@K / MRR) |
| **B. Duplicate detection** | "Is this the *same incident*?" | Embedding similarity **+ spatial + temporal blocking**, thresholded | Labeled duplicate pairs (P/R/F1) |
| **C. Clustering** | "What *themes* exist across all complaints?" | HDBSCAN over embeddings (offline, analytical) | Intrinsic metrics + qualitative |

**Key distinction we will not blur:** two complaints about the *same topic* (e.g. two different potholes) are **related**, not **duplicates**. Duplicate detection therefore requires more than semantic similarity — it needs spatial-temporal agreement.

---

## 2. Data reality (honesty first)

- NYC 311 has **no rich citizen-written complaint bodies.** We embed `descriptor` — a short, often formulaic phrase ("Street Light Out", "No Heat"). This is the same honest limitation as M1.
- **Consequence for duplicates:** many 311 records share near-identical descriptors within a category, so descriptor-based duplicate detection is partly *degenerate* (easy). We will therefore evaluate on **two** tracks and report both:
  1. **311 descriptor track** (large-scale, reproducible) — measures the *mechanism*.
  2. **Citizen-phrasing track** (curated + synthetic paraphrases, clearly labeled) — measures *real-world semantic value*, reusing the M1 probe-set philosophy.
- **The production semantic API accepts arbitrary natural-language text.** Query preprocessing = index preprocessing (parity).
- **Swap seam:** the embedding pipeline reads its text from a configurable source column (`descriptor` today). A future free-text corpus replaces one config value; the schema, index, and API are unchanged. We will **never** claim training on millions of authentic citizen descriptions.

---

## 3. The three problems → chosen techniques (with justification)

### A. Semantic retrieval — pgvector ANN + cosine
- **Metric: cosine similarity.** sentence-transformers embeddings are trained with a cosine objective and are (L2-)normalized; cosine is the semantically correct and standard choice. In pgvector we use the cosine distance operator `<=>` and report `similarity = 1 − distance`.
- **Search: approximate NN via HNSW index** (see §8). Exact scan is fine at 50k–204k but HNSW future-proofs latency.

### B. Duplicate detection — similarity **gated by** space + time
- **Definition (CiviTrack):** two complaints are duplicates if they describe **the same real-world incident**. Operationalized as: high semantic similarity **AND** within a spatial radius (PostGIS `ST_DWithin` on `geom`) **AND** within a time window (`created_date` delta). This is the blueprint's design and is what prevents merging two separate potholes.
- **Threshold is *learned from validation data*, not assumed** (§10). Baseline TF-IDF cosine vs transformer embeddings compared head-to-head.

### C. Clustering — HDBSCAN (offline, analytical)
- **HDBSCAN** as primary: handles variable-density clusters, labels noise/outliers, needs no `k` — right for messy civic text. **K-Means as a documented baseline** for comparison only. Run **offline** (batch job → `cluster_id` stored per complaint); *not* a per-query live endpoint (live clustering per request is not meaningful). **UMAP/PCA for 2-D visualization only**, never as the clustering algorithm; **no t-SNE for clustering.**

---

## 4. Embedding model selection

**Do not default to the largest.** Candidates, with the trade-offs that matter for CPU + pgvector + Docker:

| Model | Dim | Size | CPU latency | pgvector cost (204k) | Quality (MTEB retrieval) |
|---|---|---|---|---|---|
| **all-MiniLM-L6-v2** ⭐ | 384 | ~90 MB | ~fast | ~300 MB (384×4B) | strong for size |
| BGE-small-en-v1.5 | 384 | ~130 MB | ~fast | ~300 MB | slightly higher |
| BGE-base-en-v1.5 | 768 | ~440 MB | ~2× slower | ~600 MB, 2× index RAM | higher, overkill here |

- **Production recommendation: `all-MiniLM-L6-v2` (384-dim).** Best balance of semantic quality, CPU latency, image size, and pgvector storage; 384-dim keeps HNSW memory modest. It is the blueprint's named choice and it is CPU-friendly (important — M1 showed this machine is CPU-only and slow).
- **Benchmarked challenger: `BGE-small-en-v1.5`** (same 384-dim → *drop-in*, same storage/index). Phase 2 measures both on our retrieval eval set; if BGE-small wins materially, we adopt it — no schema change since the dim matches.
- **Classical baseline (mandatory): TF-IDF cosine** — to prove embeddings add value over classical NLP (§10, §14).
- **Provenance stored with every vector** (`embedding_model`, `embedding_version`) so a same-dim model swap is a version bump, and a *different-dim* model gets a new table — old vectors never corrupted (§8).

---

## 5. Embedding preprocessing (parity, but lighter than the classifier)

- The classifier's `clean_text` **strips punctuation** — appropriate for TF-IDF / `distilbert-*-uncased`, but **lossy for sentence embeddings**, which are trained on natural text. So M3 uses a **dedicated, minimal normalizer** `embed_normalize` (lowercase optional per model card, strip/collapse whitespace, strip URLs, keep punctuation/casing as the model expects).
- **The parity principle is preserved:** `embed_normalize` is applied **identically** at index time and query time, and is **vendored into ml_service verbatim** (like `text.py`), with a test asserting byte-for-byte parity.
- Rationale documented in the model card: heavy cleaning hurts embedding quality; the classifier and the embedder legitimately use *different* preprocessors, each matched to its model.

---

## 6. Embedding pipeline (reproducible, batchable, resumable, versioned)

New package `ml/semantic/`:
```
ml/semantic/
├── config.py        # model name, version, dim, source column, batch size, DB DSN
├── normalize.py     # embed_normalize (parity contract; vendored to ml_service)
├── embedder.py      # sentence-transformers wrapper (deterministic: eval mode, no dropout)
├── generate.py      # batch: silver → normalize → embed → upsert to pgvector (RESUMABLE)
├── vector_store.py  # pgvector query helpers (ANN, filtered, spatial-temporal)
└── (evaluation lives in ml/semantic/evaluation/, see §14)
```
- **Deterministic:** model in `eval()` mode, fixed seed, no sampling → identical vectors for identical input+model+version.
- **Batchable:** encode in batches (configurable `batch_size`).
- **Resumable:** `generate.py` skips `complaint_id`s already present for the current `(embedding_model, embedding_version)` → safe to re-run after interruption.
- **Versioned:** every row carries `embedding_model`, `embedding_version`, `data_version` (the gold manifest `content_hash`).
- **Independent of the API:** batch generation is a CLI job (`python -m semantic.generate`), not triggered by requests. The API only does *query-time* single-embed + search.
- **MLflow-logged:** model, dim, preprocessing version, dataset version, batch throughput, total vectors, wall-clock.

---

## 7. Vector database schema (Postgres + pgvector)

New migration adds a dedicated table (not columns on `complaints_311`, so multiple model versions can coexist and re-embeds don't lock the base table):

```sql
CREATE TABLE semantic.complaint_embeddings (
    id                BIGSERIAL PRIMARY KEY,
    complaint_id      TEXT NOT NULL REFERENCES silver.complaints_311(unique_key) ON DELETE CASCADE,
    source_column     TEXT NOT NULL,              -- 'descriptor' today (swap seam)
    text_snippet      TEXT NOT NULL,              -- the exact text embedded (for display)
    embedding         VECTOR(384) NOT NULL,       -- dim fixed to the production model
    embedding_model   TEXT NOT NULL,              -- e.g. 'all-MiniLM-L6-v2'
    embedding_version TEXT NOT NULL,              -- pipeline version, e.g. 'v1'
    data_version      TEXT,                       -- gold manifest content hash
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (complaint_id, embedding_model, embedding_version)
);
```
- **Why a fixed `VECTOR(384)`:** pgvector columns are dim-fixed. A **same-dim** model change (MiniLM→BGE-small) is a `embedding_version` bump (re-embed rows). A **different-dim** model gets a **new table** (`complaint_embeddings_768`) — old vectors are never corrupted or mixed. This is documented explicitly.
- **`UNIQUE (complaint_id, model, version)`** lets two model versions coexist during a migration/A-B without collision.
- **Metadata for filtered search** (category, geo, date) is read by joining `silver.complaints_311` on `complaint_id` — no duplication of source-of-truth fields into the embedding table.

### Index choice
- **HNSW** with `vector_cosine_ops`: `CREATE INDEX ON semantic.complaint_embeddings USING hnsw (embedding vector_cosine_ops);`
- **Why HNSW over IVFFlat:** at 50k–204k vectors HNSW gives high recall + low latency with **no `lists` training/tuning** and robust behavior as the table grows; IVFFlat needs a trained `lists` param and a populated table. HNSW build is heavier but one-time. Defaults `m=16, ef_construction=64`; query `ef_search` tuned in Phase 5.
- **Built *after* bulk load** (index-then-load is slower). Documented.

---

## 8. Database migrations (introduce a real, reversible mechanism)

There is no Alembic. Rather than bolt on a heavy ORM-centric tool, M3 introduces **lightweight, reversible, numbered SQL migrations** matching the project's existing raw-SQL style:
```
db/migrations/
├── 0001_semantic_embeddings.up.sql     # schema: semantic schema, table
├── 0001_semantic_embeddings.down.sql   # DROP (reversible)
├── 0002_embeddings_hnsw_index.up.sql   # index (separate: run after load)
└── 0002_embeddings_hnsw_index.down.sql
```
- A tiny idempotent runner (`db/migrate.py`, psycopg) applies pending migrations and records them in a `schema_migrations` table; `--down` rolls back. No manual prod state changes.
- **Alternative considered:** full Alembic. Rejected for M3 as over-engineering (no SQLAlchemy models in the project; raw SQL is the established pattern). Documented as a future option if the schema grows.

---

## 9. Similarity search & the "semantic explorer"

- **Live query flow:** `text → embed_normalize → embed (ml_service) → pgvector ANN (cosine) → join silver for metadata → ranked results`.
- **Filters (extensible):** category (`complaint_type`/canonical), `min_similarity`, `top_k`, and — designed-in for **M5** — optional geographic filter (`ST_DWithin` on `geom`). We add the *hooks* now (optional lat/lon/radius params) without building geospatial analytics (that's M4/M5 — out of scope here).
- **Result contract** returns: `complaint_id`, `category`, `similarity`, `text` (snippet), plus safe metadata (borough, created_at) — **never** internal vector/row internals.

---

## 10. Duplicate detection (defensible, evaluated)

### Duplicate taxonomy (explicit)
| Class | Definition | Signal |
|---|---|---|
| **Exact duplicate** | Same text, same place, same time window | very high sim + same geo + tight time |
| **Near-duplicate** | Same incident, reworded | high sim + near geo + close time |
| **Related** | Same topic, *different* incident | high sim, **but** far geo or distant time |
| **Same-category, different issue** | Same bucket, unrelated | moderate sim only |

### Evaluation dataset (labeled, reproducible — §14 details)
- **Real/derived positives:** pairs of 311 records with near-identical descriptor **and** `ST_DWithin` < R meters **and** `|Δcreated_date|` < T hours → *defensible* likely-duplicates (labeled **"derived-real"**, not hand-verified).
- **Hard negatives:** same `complaint_type`, different descriptor / far apart / distant time → *related, not duplicate*.
- **Manually curated:** a small hand-labeled set of citizen-phrasing pairs (labeled **"curated"**).
- **Synthetic (supplementary, clearly labeled):** paraphrase perturbations of descriptors.
- All rows tagged `real` / `curated` / `synthetic`. **Synthetic is never presented as real-world ground truth.**

### Threshold selection (from data, not assumed)
- Sweep similarity thresholds on the **validation** split; pick the operating point by **F1**, but **report the full precision/recall curve** and default to a **precision-favoring** point (false merges are worse than misses — merging two real complaints hides one).
- Report **P / R / F1** and explicit **FP/FN** behavior at the chosen threshold.
- **Baseline vs transformer:** TF-IDF cosine vs MiniLM embeddings, same eval, same protocol → quantify whether semantics add value.
- **Spatial-temporal gate** evaluated as an ablation (embedding-only vs embedding+geo+time) to show it reduces false merges.

**Honesty:** on the 311-descriptor track, near-identical descriptors make this partly easy; the citizen-phrasing track is the real test. Both reported separately.

---

## 11. Clustering (analytical, offline)

- **Job:** `ml/semantic/cluster.py` (offline) → **HDBSCAN** over embeddings (optionally UMAP-reduced to ~10–50 dims *for the clusterer's stability*, documented), plus **K-Means baseline**. Stores `cluster_id` + `cluster_label` per complaint in a `semantic.complaint_clusters` table (separate, versioned).
- **Metrics:** Silhouette, Davies-Bouldin, cluster-size distribution, noise ratio, + **qualitative exemplars** per cluster. We will **not** optimize a metric into uninterpretable clusters.
- **Visualization:** UMAP/PCA → 2-D scatter for the admin explorer (viz only).
- **Honest limitation:** civic-complaint clusters largely track categories and overlap; interpretability is limited — reported, not oversold.

---

## 12. API design

**Responsibility split (per mission):** ml_service owns embeddings + similarity/semantic inference (and therefore holds a **read** DB connection for ANN queries); gateway owns validation, routing, contracts, error handling.

### ml_service (internal)
| Method | Path | Purpose |
|---|---|---|
| POST | `/embed` | Batch embed texts → vectors + model/dim (utility) |
| POST | `/semantic/search` | text → ANN search → ranked neighbors (+ filters) |
| POST | `/semantic/related` | by `complaint_id` → its neighbors (excludes self) |
| POST | `/semantic/duplicate-check` | text (+ optional geo/time) → candidate dups w/ class + threshold verdict |
| GET | `/health` | extend: report embedding model + vector count |

### gateway (public, stable)
| Method | Path |
|---|---|
| POST | `/api/v1/semantic/search` |
| POST | `/api/v1/semantic/related` |
| POST | `/api/v1/semantic/duplicate-check` |

### Contracts (Pydantic; validation baked in)
```jsonc
// POST /api/v1/semantic/search
// req
{ "query": "street light near my home is broken", "top_k": 5, "category": "Street Light", "min_similarity": 0.3 }
// res
{ "query": "...", "model": "all-MiniLM-L6-v2",
  "results": [ { "complaint_id": "12345", "category": "Street Light", "similarity": 0.91,
                 "text": "Street Light Out", "borough": "BROOKLYN", "created_at": "2024-..." } ] }
```
```jsonc
// POST /api/v1/semantic/duplicate-check
// req
{ "description": "no heat and no hot water for days", "latitude": 40.7, "longitude": -73.9 }
// res
{ "is_potential_duplicate": true, "threshold": 0.82,
  "matches": [ { "complaint_id": "...", "similarity": 0.88, "relation": "near-duplicate",
                 "category": "Heat/Hot Water", "created_at": "...", "distance_m": 120 } ] }
```
**Validation/limits:** `query`/`description` non-empty, ≤ 2000 chars; `top_k` ∈ [1, 50]; `min_similarity`/`threshold` ∈ [0, 1]; parameterized SQL only; no user-supplied SQL or vector expressions; structured error envelope; gateway 503-degrades if ml_service is down (never crashes). No DB internals exposed.

---

## 13. Frontend integration (inherit M2 — do not redesign)

Reuse `ui-kit.tsx`, `CategoryBadge`, `Reveal`, motion system, glass/gradient utilities, theme. New API client fns + hooks only.

1. **Duplicate warning in the report flow** — after enough text (debounced, non-blocking, reuses the `useClassify` pattern), call `duplicate-check`; if a match, show an animated *"Similar complaint detected"* card (similarity bar, category, date, distance) with **"This is a new issue → continue"**. Never blocks submission.
2. **Related complaints on the issue detail page** (`/issues/[id]`) — a "Related complaints" section of animated similarity cards (reuse the confidence-bar as a similarity bar).
3. **Semantic search** — a natural-language search mode on `/issues` (toggle: keyword ↔ semantic), with a vector-search loading state and reveal animation.
4. **Admin semantic explorer** — related-complaint inspection + (later) cluster view, in the M2 visual language.
- **Motion communicates meaning** (similarity animating up, connection reveal); reduced-motion honored via the existing `MotionConfig`.

---

## 14. Evaluation strategy (serious, real numbers)

Tracked in **MLflow** (`semantic-embeddings` experiment): model, dim, preprocessing version, dataset version, metric, threshold, clustering params, all metrics, latency.

| Dimension | Metrics | Dataset |
|---|---|---|
| Retrieval quality | **Precision@K, Recall@K, MRR** | relevance judgments (derived-real + curated) |
| Duplicate detection | **P, R, F1 + threshold curve + FP/FN**; TF-IDF baseline vs embeddings; geo/time ablation | labeled pairs (real/curated/synthetic, tagged) |
| Clustering | Silhouette, Davies-Bouldin, size distribution, noise %, qualitative | full embedding set |
| System perf | embed latency (single+batch throughput), ANN retrieval latency (p50/p95), memory, **vector storage size on disk** | measured on the stack |

- **Eval dataset** (`ml/semantic/evaluation/`, committed — it is small metadata/definitions): pair IDs + labels + provenance tag (`real`/`curated`/`synthetic`), plus a deterministic generator for synthetic. **DVC not required** (small, git-committable); we keep the M0/M1 reproducibility model (deterministic pipeline + content hashes). DVC init remains an optional future step.
- **If a metric can't be meaningfully measured, we say so** (e.g. true Recall is bounded because we lack exhaustive duplicate labels — reported as *estimated recall on the labeled set*).

---

## 15. Artifacts, security, performance, testing

- **Artifacts:** no embedding models or vector dumps in git (models cached in the image/volume; vectors live in Postgres). Git holds code, config, schemas, migrations, eval **definitions**, small metadata, docs. `.gitignore` updated if needed.
- **Security:** input length caps, `top_k`/threshold bounds, malformed-input handling, parameterized queries only, no arbitrary SQL/vector expressions, basic abuse considerations (payload size).
- **Performance:** measure before optimizing; no k8s/Kafka/extra vector DB. Stays Docker Compose (postgres + gateway + ml_service + frontend).
- **Testing (not just happy paths):** preprocessing parity (index==query, ml==ml_service), embedding dimension + determinism, cosine/similarity math, threshold logic, duplicate classification (incl. related-not-duplicate), API validation + error responses, vector search correctness, **gateway→ml_service integration**, and a dup-check integration test end-to-end.

---

## 16. Architecture

```
                    ┌───────────────────────── offline (batch, MLflow-tracked) ─────────────────────────┐
                    │  silver.complaints_311 (204k)                                                      │
                    │        │ descriptor                                                                │
                    │        ▼ embed_normalize (parity)                                                  │
                    │   sentence-transformers (all-MiniLM-L6-v2, 384d)  ──►  semantic.complaint_embeddings│
                    │        └► HDBSCAN/KMeans (analytical) ──► semantic.complaint_clusters               │
                    └────────────────────────────────────────────────────────────────────────────────────┘

  Citizen text ──► Frontend ──►  Gateway  ──►  ml_service  ──►  pgvector (HNSW, cosine)  ──► ranked
  (arbitrary NL)   (M2 UI)      /api/v1/       embed_normalize    + PostGIS ST_DWithin        neighbors
                                semantic/*      + query embed      (duplicate blocking)         │
                                (validate,      + ANN search                                     ▼
                                 route, 503)                                        Duplicate / Related / Search
                                                                                                 │
                                                                                                 ▼
                                                                                    Frontend: dup warning,
                                                                                    related cards, semantic search
```

---

## 17. Phased plan (maps to the 14 requested phases)

| Phase | Deliverable | Commit |
|---|---|---|
| 1 | Data reconcile (reload 204k → Postgres) + **semantic eval dataset** (real/curated/synthetic, tagged) | `feat(m3): reconcile silver + semantic evaluation dataset` |
| 2 | **Embedding model benchmark** (MiniLM vs BGE-small vs TF-IDF) on retrieval eval → select | `feat(m3): embedding model benchmark + selection` |
| 3 | **Embedding pipeline** (`ml/semantic/`: normalize, embedder, generate — resumable, versioned) | `feat(m3): add embedding pipeline` |
| 4 | **Migrations** + pgvector schema + HNSW index; bulk-embed 204k | `feat(m3): add pgvector semantic storage` |
| 5 | **Similarity retrieval** (vector_store queries, filters, latency) | `feat(m3): add similarity retrieval` |
| 6 | **Duplicate detection** + threshold selection + baseline compare + geo/time ablation | `feat(m3): add duplicate detection` |
| 7 | **Clustering** (HDBSCAN + KMeans baseline, UMAP viz, metrics) | `feat(m3): add semantic clustering` |
| 8 | **MLflow experiments + evaluation** consolidated | `feat(m3): semantic evaluation + mlflow` |
| 9 | **ml_service** semantic router + DB access + schemas + tests | `feat(m3): integrate semantic ml service` |
| 10 | **Gateway** `/api/v1/semantic/*` + validation + tests | `feat(m3): integrate semantic gateway APIs` |
| 11 | **Frontend** dup warning + related complaints + semantic search + admin explorer | `feat(m3): add semantic frontend experience` |
| 12 | **Docker** rebuild + compose (embedding deps in ml_service image; model cached) | `feat(m3): verify dockerized semantic stack` |
| 13 | **End-to-end verification** (gateway→ml_service→pgvector), latency/storage measured | (verification) |
| 14 | **Docs**: `M3_REPORT.md` (real numbers), model card, README status, diagram | `docs(m3): add semantic intelligence report` |

---

## 18. Risks & honest limitations

- **Descriptor ≠ free text.** Duplicate/retrieval on 311 descriptors is partly degenerate; real value shown on the citizen-phrasing track (reported separately). Never marketed as trained on rich citizen text.
- **Semantic similarity ≠ duplicate truth.** We gate with space+time and evaluate; we do **not** market similarity as perfect duplicate detection.
- **Synthetic eval** clearly labeled; never presented as real ground truth. Recall is *estimated* (no exhaustive labels) — stated.
- **Cluster interpretability** limited (clusters track categories); reported qualitatively.
- **Embedding model limits** (short-text domain shift, English-only) documented in the model card.
- **CPU inference** is slow on this machine (M1 evidence) — embedding the 204k is a batch job (minutes–tens of minutes), query embed is single-item (fast enough); measured, not assumed.
- **pgvector scaling:** single-node HNSW is fine to ~1M vectors; beyond that, partitioning or a dedicated store (Qdrant) is the documented scale-up path — **not** built now.

---

## 19. Decisions I need signed off before Phase 1

1. **Reload the 204k stratified silver into Postgres** (recommended) so embeddings cover the full-year dataset — vs. embed only the current 50k already in Postgres.
2. **Embedding model:** default **all-MiniLM-L6-v2**, benchmark **BGE-small-en-v1.5** as a drop-in challenger (same 384-dim) — vs. commit to one now.
3. **Migrations:** lightweight **numbered reversible SQL migrations** (recommended, matches project style) — vs. introduce full Alembic.
4. **Duplicate definition:** **semantic + spatial-temporal blocking** (recommended, prevents false merges) — vs. semantic-only.

*No implementation until these are confirmed.*

# CiviTrack AI — Intelligent Urban Complaint Management System

An AI-powered **decision-support platform for municipal operations** — not a
complaint form with a database. CiviTrack AI ingests citizen complaints and
historical civic data, then **understands** them (classification, severity,
resolution-time estimates, duplicates), **aggregates** them into spatial and
temporal intelligence (hotspots, trends, forecasts), and **recommends** actions
with plain-language, explainable output.

> ⚠️ **Project status: under active reconstruction.** This repository is being
> rebuilt from an earlier prototype into a production-grade AI/ML platform,
> milestone by milestone. It is **not yet feature-complete**. See
> [Current State](#current-state) for exactly what exists today.

The complete technical design — vision, architecture, data strategy, model
plan, and milestone roadmap — lives in **[docs/BLUEPRINT.md](docs/BLUEPRINT.md)**.
That document is the single source of truth; this README is the entry point.

---

## Current state

The project is being delivered in sequenced milestones (**M0 → M7**, see the
blueprint). Work in progress:

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M0** | Foundation: monorepo, Docker/Postgres infra, FastAPI scaffold, NYC 311 data pipeline, EDA | ✅ complete |
| **M1** | DistilBERT complaint classifier served end-to-end (ml_service + gateway) | ✅ complete |
| **M2** | Premium frontend on real AI APIs (design system, live classification) | ✅ complete |
| **M3** | Semantic intelligence: embeddings, pgvector search, duplicate detection, clustering | ✅ complete |
| M4 | Resolution-time regression + SHAP explainability | ⏳ planned |
| M5 | Geospatial clustering + statistical hotspots | ⏳ planned |
| M6 | Time-series volume forecasting | ⏳ planned |
| M7 | LLM layer: summaries, recommendations, NL query | ⏳ planned |

**M0 progress:** monorepo restructure ✅ · Docker/PostgreSQL + PostGIS + pgvector
🚧 · FastAPI scaffold ⏳ · NYC 311 ingestion ⏳ · EDA ⏳.

### What runs today
- **Frontend** (`frontend/`): the existing Next.js UI builds and runs, currently
  on mock data. It will be wired to real APIs in M2.

```bash
cd frontend
pnpm install
pnpm dev        # http://localhost:3000
```

---

## Target architecture (see the blueprint for detail)

A modular, service-oriented system — not a monolith, not fine-grained
microservices:

- **Frontend** — Next.js 16 (App Router), React 19, Tailwind, shadcn/ui.
- **API Gateway** — FastAPI: auth, validation, orchestration. Owns no model code.
- **ML Service** — FastAPI: synchronous inference (added from M1).
- **Worker** — async heavy jobs: clustering, hotspots, forecasting (added from M5).
- **LLM Service** — RAG summaries, recommendations, NL query (added from M7).
- **Data layer** — **PostgreSQL + PostGIS + pgvector**: relational + geospatial +
  vector search in one engine.
- **Data foundation** — real **NYC 311 open data** (not synthetic).

### Key technology decisions
| Choice | Over | Why |
|--------|------|-----|
| **FastAPI** | Flask | Async, Pydantic validation, native ML-serving ecosystem. |
| **PostgreSQL + PostGIS + pgvector** | MySQL + separate vector DB | One engine for relational, geospatial, and vector search. |
| **Real NYC 311 data** | Synthetic rows | Credible scale and labels for every model. |
| **Depth over breadth** | 14 shallow features | A focused, rigorous subset ships to production quality. |

---

## Repository structure

```
civitrack-ai/
├── docs/
│   └── BLUEPRINT.md         # full technical design & roadmap (source of truth)
├── frontend/                # Next.js app (UI)
├── services/                # backend microservices (FastAPI) — see services/README.md
├── ml/                      # data-science library: pipelines, models — see ml/README.md
├── infra/                   # Docker Compose, database init (from M0 Step B)
├── db/                      # migrations & seeds (from M0 Step B)
├── data/                    # DVC-tracked datasets (git-ignored, not committed)
└── archive/                 # preserved legacy prototype (Flask + MySQL), out of scope
```

---

## Prerequisites

- **Node.js 18+** and **pnpm** (frontend)
- **Docker + Docker Compose** (database & services)
- **Python 3.11+** (data pipelines & backend services)

---

## Legacy prototype

The original prototype (Flask + MySQL, disconnected frontend) is preserved under
[`archive/backend-flask-v1/`](archive/backend-flask-v1/) for reference and
history. It is **not** part of the active architecture and will be removed once
the FastAPI backend is stable.

---

## License

Educational / portfolio project.

# services/

Backend microservices for CiviTrack AI. Each service is independently
containerized and deployable (see `docs/BLUEPRINT.md` §7–§9).

| Service | Status | Introduced in | Purpose |
|---------|--------|---------------|---------|
| `gateway/`     | 🚧 scaffolded in M0 Step C | M0 | FastAPI API gateway: auth, validation, orchestration. Owns no model code. |
| `ml_service/`  | ⏳ future | M1 | Synchronous model inference (classify, severity, resolution-time, embeddings). |
| `worker/`      | ⏳ future | M5 | Async heavy jobs (clustering, hotspots, forecasting, retraining). |
| `llm_service/` | ⏳ future | M7 | RAG summaries, action recommendations, NL query. |

Directories are created in the milestone that first implements them — empty
placeholders are intentionally avoided.

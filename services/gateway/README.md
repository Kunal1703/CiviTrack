# API Gateway (`services/gateway`)

FastAPI service — the single entry point the frontend talks to. In M0 it
provides only **system endpoints**; auth, orchestration, and business routes
arrive in later milestones (see `docs/BLUEPRINT.md` §9).

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Service banner + docs link |
| GET | `/health` | Liveness (no dependencies) |
| GET | `/health/db` | Readiness — Postgres reachable + extension versions (503 if down) |
| GET | `/config` | Non-secret runtime configuration |
| GET | `/docs` | OpenAPI (Swagger) UI |

## Layout

```
app/
├── main.py            # application factory
├── core/
│   ├── config.py      # pydantic-settings (env-driven)
│   └── logging.py     # structured logging (console dev / JSON prod)
├── routers/system.py  # system endpoints
└── schemas/system.py  # response models
tests/                 # pytest (dependency-free)
```

## Run

**Via Docker Compose (recommended):**
```bash
cd infra && docker compose up -d
# → http://localhost:8000/health
```

**Locally:**
```bash
cd services/gateway
cp .env.example .env
pip install ".[dev]"
uvicorn app.main:app --reload
```

## Test
```bash
cd services/gateway
pip install ".[dev]"
pytest
```

Configuration is entirely environment-driven (`app/core/config.py`); no secrets
are committed and none are exposed via `/config`.

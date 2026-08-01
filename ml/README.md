# ml/

The data-science core of CiviTrack AI — a Python library (not a running
service). See `docs/BLUEPRINT.md` §12–§14.

## M0 contents (data engineering + EDA)

```
ml/
├── requirements.txt        # pipeline + EDA dependencies
├── data/                   # NYC 311 data pipeline (medallion: bronze → silver)
│   ├── config.py           # env-driven pipeline config (bounded dev dataset)
│   ├── ingest.py           # Socrata API → bronze parquet
│   ├── clean.py            # bronze → silver (clean, standardize, resolution_hours)
│   ├── validate.py         # pandera schema validation
│   ├── load.py             # silver → Postgres (+ PostGIS geometry, indexes)
│   ├── report.py           # data-quality report (Markdown + JSON)
│   └── pipeline.py         # entrypoint: ingest → clean → validate → load → report
├── notebooks/
│   └── eda_nyc311.ipynb    # exploratory data analysis (executed, with outputs)
└── reports/
    ├── data_quality_report.md
    └── data_quality_report.json
```

Future (later milestones): `data/features/`, `models/`, `evaluation/`.

## Setup & run

```bash
cd ml
python -m venv .venv
.venv/Scripts/activate            # Windows  (source .venv/bin/activate on *nix)
pip install -r requirements.txt
cp .env.example .env              # points at the Postgres container (host port 5433)

# Run the pipeline (fetches the bounded NYC 311 dev dataset, loads Postgres)
python -m data.pipeline

# Execute the EDA notebook
python -m nbconvert --to notebook --execute --inplace notebooks/eda_nyc311.ipynb
```

## Notes

- **Data is not committed.** `data/` (bronze/silver parquet) is git-ignored and
  is DVC territory; the pipeline regenerates it from the Socrata API.
- The development dataset is **bounded and configurable** (`fetch_limit`,
  `since_date` in `data/config.py`) so it runs in minutes.
- The pipeline runs on the host and connects to the Postgres **container** via
  its mapped host port (`5433` — see `infra/docker-compose.yml`).

"""Seed clearly-labeled DEMO Delhi civic complaints for the product UI.

WHY THIS EXISTS / HONESTY NOTE
------------------------------
The ML corpus (silver.complaints_311) is real **NYC 311** data — it is NOT Delhi.
The product experience is Delhi-based, so we need Delhi complaints to demonstrate
the citizen/admin UI and the map. Rather than mislabel NYC rows as Delhi (which
would be dishonest), we generate a **separate, explicitly-tagged demo dataset**:

  • app.complaints rows with source='seed_delhi_demo', is_demo=true
  • embeddings tagged embedding_version='delhi-v1', data_version='delhi_demo'

This keeps the datasets swappable: a real Delhi open dataset can later replace the
seed by loading into app.complaints with source='delhi_open' (or similar) and
re-running the embedding step. The NYC M3 corpus is never touched.

Run (stack up, from repo root):
    POSTGRES_PORT=5433 .venv/Scripts/python.exe db/seed_delhi_demo.py

Idempotent: it clears prior seed_delhi_demo rows (and their embeddings) first.
"""

from __future__ import annotations

import json
import os
import random
import urllib.request
from datetime import datetime, timedelta, timezone

import psycopg

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
DELHI_VERSION = "delhi-v1"
DELHI_DATA_VERSION = "delhi_demo"

random.seed(20260808)  # deterministic seed → reproducible demo dataset

# ── Category → (natural-language templates, department slug, priority weight) ──
# Categories are the canonical taxonomy (frontend lib/categories.ts). Descriptions
# are citizen-phrased (not formulaic) so the M3 embeddings are meaningful.
CATEGORY_TEMPLATES: dict[str, dict] = {
    "Street Light": {
        "dept": "electricity",
        "templates": [
            "The street light near {place} has been switched off for {n} days and the whole lane is pitch dark at night.",
            "Street light outside {place} is not working, it feels unsafe for women walking home after dark.",
            "Two street lamps near {place} have been flickering and finally went dead this week.",
        ],
    },
    "Street Condition": {
        "dept": "pwd",
        "templates": [
            "There is a large pothole on the road near {place} and two-wheelers keep skidding on it.",
            "The road near {place} is badly broken after the rains, it's damaging vehicles.",
            "A deep crater has formed on the main road at {place}, please repair it urgently.",
        ],
    },
    "Sanitation": {
        "dept": "sanitation",
        "templates": [
            "Garbage has not been picked up near {place} for over a week, it is overflowing and stinking.",
            "The community bin at {place} is overflowing and stray animals are scattering the trash.",
            "Piles of waste are lying on the footpath near {place}, it's a health hazard.",
        ],
    },
    "Plumbing/Water": {
        "dept": "water-board",
        "templates": [
            "A water pipeline is leaking near {place} and clean water is being wasted onto the road all day.",
            "There has been no water supply near {place} for three days, tankers are not coming either.",
            "The main water pipe at {place} burst this morning and the street is flooded.",
        ],
    },
    "Sewer": {
        "dept": "water-board",
        "templates": [
            "The drain near {place} is blocked and dirty sewage water is overflowing onto the street.",
            "Sewage has been overflowing near {place} for days, the smell is unbearable.",
            "The manhole at {place} is clogged and waste water is entering shops.",
        ],
    },
    "Noise": {
        "dept": "general",
        "templates": [
            "Loud music from a banquet hall near {place} continues past midnight and residents can't sleep.",
            "Constant construction noise near {place} starts very early and goes on late into the night.",
        ],
    },
    "Illegal Parking": {
        "dept": "traffic",
        "templates": [
            "Cars are parked illegally on both sides near {place}, completely blocking the road.",
            "A vehicle has been parked for weeks near {place}, blocking the entrance to our lane.",
        ],
    },
    "Tree": {
        "dept": "parks",
        "templates": [
            "A large tree branch near {place} has fallen after the storm and is blocking the footpath.",
            "The old tree near {place} is leaning dangerously and might fall on parked vehicles.",
        ],
    },
    "Environmental Hazard": {
        "dept": "sanitation",
        "templates": [
            "Someone is burning garbage near {place} every evening and the smoke is causing heavy air pollution.",
            "Open dumping and burning of waste near {place} is making it hard to breathe.",
        ],
    },
}

# ── Delhi neighbourhoods: (name, lat, lon, target #complaints) ──
# Target counts deliberately span the heat thresholds (1–2 yellow, 3–4 orange,
# 5+ red) so the map shows a realistic mix of densities.
NEIGHBOURHOODS: list[tuple[str, float, float, int]] = [
    ("Chandni Chowk", 28.6506, 77.2303, 7),
    ("Connaught Place", 28.6315, 77.2167, 6),
    ("Karol Bagh", 28.6519, 77.1909, 5),
    ("Lajpat Nagar", 28.5677, 77.2433, 4),
    ("Saket", 28.5245, 77.2066, 4),
    ("Hauz Khas", 28.5494, 77.2001, 3),
    ("Dwarka Sector 10", 28.5823, 77.0500, 3),
    ("Rohini", 28.7361, 77.1015, 3),
    ("Janakpuri", 28.6217, 77.0878, 2),
    ("Mayur Vihar", 28.6089, 77.2960, 2),
    ("Preet Vihar", 28.6410, 77.2947, 2),
    ("Vasant Kunj", 28.5200, 77.1591, 2),
    ("Jama Masjid", 28.6507, 77.2334, 1),
    ("Jantar Mantar", 28.6270, 77.2166, 1),
    ("India Gate", 28.6129, 77.2295, 1),
]

STATUSES = ["new", "triaged", "in_progress", "resolved"]
STATUS_WEIGHTS = [0.30, 0.20, 0.30, 0.20]
PRIORITIES = ["low", "medium", "high"]
PRIORITY_WEIGHTS = [0.3, 0.5, 0.2]


def _jitter(base: float, meters: float) -> float:
    # ~111_000 m per degree latitude; good enough for a demo scatter.
    return base + random.uniform(-meters, meters) / 111_000.0


def _title_for(category: str, place: str) -> str:
    short = {
        "Street Light": "Street light not working",
        "Street Condition": "Pothole / broken road",
        "Sanitation": "Garbage not collected",
        "Plumbing/Water": "Water leakage / no supply",
        "Sewer": "Blocked drain / sewage overflow",
        "Noise": "Noise disturbance",
        "Illegal Parking": "Illegal parking blocking road",
        "Tree": "Fallen / dangerous tree",
        "Environmental Hazard": "Open burning / air pollution",
    }[category]
    return f"{short} near {place}"


def _dept_ids(conn) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute("SELECT slug, id FROM app.departments")
        return {slug: dept_id for slug, dept_id in cur.fetchall()}


def _embed(texts: list[str]) -> tuple[str, list[list[float]]]:
    body = json.dumps({"texts": texts}).encode()
    req = urllib.request.Request(
        f"{ML_SERVICE_URL}/semantic/embed", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.load(resp)
    return data["model"], data["vectors"]


def main() -> None:
    conn = psycopg.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5433")),
        dbname=os.getenv("POSTGRES_DB", "civitrack"),
        user=os.getenv("POSTGRES_USER", "civitrack"),
        password=os.getenv("POSTGRES_PASSWORD", "civitrack_dev_pw"),
        autocommit=False,
    )
    with conn:
        depts = _dept_ids(conn)
        categories = list(CATEGORY_TEMPLATES.keys())

        # 1. Clear any prior seed (and its embeddings) — idempotent re-runs.
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM app.complaints WHERE source = 'seed_delhi_demo'")
            old_ids = [str(r[0]) for r in cur.fetchall()]
            if old_ids:
                cur.execute(
                    "DELETE FROM semantic.complaint_embeddings "
                    "WHERE data_version = %s AND complaint_id = ANY(%s)",
                    (DELHI_DATA_VERSION, old_ids),
                )
            cur.execute("DELETE FROM app.complaints WHERE source = 'seed_delhi_demo'")

        # 2. Generate complaints.
        rows: list[dict] = []
        now = datetime.now(timezone.utc)
        for name, lat, lon, count in NEIGHBOURHOODS:
            for _ in range(count):
                category = random.choice(categories)
                meta = CATEGORY_TEMPLATES[category]
                place = name
                desc = random.choice(meta["templates"]).format(place=place, n=random.randint(3, 14))
                status = random.choices(STATUSES, STATUS_WEIGHTS)[0]
                created = now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
                closed = created + timedelta(days=random.randint(1, 20)) if status == "resolved" else None
                rows.append({
                    "title": _title_for(category, place),
                    "description": desc,
                    "category": category,
                    "status": status,
                    "priority": random.choices(PRIORITIES, PRIORITY_WEIGHTS)[0],
                    "department_id": depts.get(meta["dept"]),
                    "lat": round(_jitter(lat, 350), 6),
                    "lon": round(_jitter(lon, 350), 6),
                    "address": name + ", Delhi",
                    "created": created,
                    "closed": closed,
                })

        # 3. Insert complaints, capturing ids in order.
        ids: list[int] = []
        with conn.cursor() as cur:
            for r in rows:
                cur.execute(
                    """
                    INSERT INTO app.complaints
                        (reporter_id, title, description, category, status, priority,
                         department_id, latitude, longitude, geom, address_text,
                         source, is_demo, created_at, updated_at, closed_at)
                    VALUES
                        (NULL, %(title)s, %(description)s, %(category)s, %(status)s, %(priority)s,
                         %(department_id)s, %(lat)s, %(lon)s,
                         ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326), %(address)s,
                         'seed_delhi_demo', true, %(created)s, %(created)s, %(closed)s)
                    RETURNING id
                    """,
                    r,
                )
                cid = cur.fetchone()[0]
                ids.append(cid)
                # Public timeline: created + (optional) progression.
                cur.execute(
                    "INSERT INTO app.complaint_updates (complaint_id, type, new_status, note, visibility, created_at) "
                    "VALUES (%s, 'created', 'new', 'Complaint registered.', 'public', %s)",
                    (cid, r["created"]),
                )
                if r["status"] in ("triaged", "in_progress", "resolved"):
                    cur.execute(
                        "INSERT INTO app.complaint_updates (complaint_id, type, old_status, new_status, note, visibility, created_at) "
                        "VALUES (%s, 'status_change', 'new', %s, %s, 'public', %s)",
                        (cid, r["status"], f"Status updated to {r['status'].replace('_', ' ')}.",
                         r["created"] + timedelta(days=1)),
                    )

        # 4. Embed descriptions via ml_service and store in the Delhi index.
        descriptions = [r["description"] for r in rows]
        model, vectors = _embed(descriptions)
        with conn.cursor() as cur:
            for cid, desc, vec in zip(ids, descriptions, vectors):
                vec_literal = "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
                cur.execute(
                    """
                    INSERT INTO semantic.complaint_embeddings
                        (complaint_id, source_column, text_snippet, embedding,
                         embedding_model, embedding_version, data_version)
                    VALUES (%s, 'description', %s, %s::vector, %s, %s, %s)
                    ON CONFLICT (complaint_id, embedding_model, embedding_version)
                    DO UPDATE SET embedding = EXCLUDED.embedding, text_snippet = EXCLUDED.text_snippet
                    """,
                    (str(cid), desc[:500], vec_literal, model, DELHI_VERSION, DELHI_DATA_VERSION),
                )

    print(f"Seeded {len(ids)} Delhi demo complaints across {len(NEIGHBOURHOODS)} areas.")
    print(f"Embedded with model={model} version={DELHI_VERSION} data_version={DELHI_DATA_VERSION}.")


if __name__ == "__main__":
    main()

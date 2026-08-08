"""Minimal, reversible SQL migration runner.

The project has no ORM, so we use plain numbered SQL migrations instead of
Alembic. Each migration is a pair `NNNN_name.up.sql` / `NNNN_name.down.sql`.
Applied versions are tracked in `public.schema_migrations`.

Usage (from repo root, with the ml venv or any psycopg-enabled python):
    python db/migrate.py up          # apply all pending
    python db/migrate.py down        # roll back the most recently applied
    python db/migrate.py status      # list applied / pending

Connection comes from POSTGRES_* env vars (defaults target the Docker container
on host port 5433).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg

MIG_DIR = Path(__file__).resolve().parent / "migrations"


def _conn() -> psycopg.Connection:
    # autocommit=True → psycopg uses the simple query protocol, which runs
    # multi-statement SQL scripts (extended protocol allows only one command).
    return psycopg.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5433")),
        dbname=os.getenv("POSTGRES_DB", "civitrack"),
        user=os.getenv("POSTGRES_USER", "civitrack"),
        password=os.getenv("POSTGRES_PASSWORD", "civitrack_dev_pw"),
        autocommit=True,
    )


def _ensure_table(conn: psycopg.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS public.schema_migrations "
        "(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    conn.commit()


def _versions() -> list[str]:
    return sorted({p.name.split(".")[0] for p in MIG_DIR.glob("*.up.sql")})


def _applied(conn: psycopg.Connection) -> set[str]:
    return {r[0] for r in conn.execute("SELECT version FROM public.schema_migrations").fetchall()}


def up(target: str | None = None) -> None:
    with _conn() as conn:
        _ensure_table(conn)
        applied = _applied(conn)
        for v in _versions():
            if v in applied:
                continue
            if target is not None and v.split("_")[0] > target:
                break
            sql = (MIG_DIR / f"{v}.up.sql").read_text(encoding="utf-8")
            print(f"applying {v} …")
            conn.execute(sql)
            conn.execute("INSERT INTO public.schema_migrations (version) VALUES (%s)", (v,))
            conn.commit()
        print("up: done")


def down() -> None:
    with _conn() as conn:
        _ensure_table(conn)
        applied = sorted(_applied(conn))
        if not applied:
            print("nothing to roll back")
            return
        v = applied[-1]
        sql = (MIG_DIR / f"{v}.down.sql").read_text(encoding="utf-8")
        print(f"rolling back {v} …")
        conn.execute(sql)
        conn.execute("DELETE FROM public.schema_migrations WHERE version = %s", (v,))
        conn.commit()
        print("down: done")


def status() -> None:
    with _conn() as conn:
        _ensure_table(conn)
        applied = _applied(conn)
    for v in _versions():
        print(f"  [{'x' if v in applied else ' '}] {v}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "up":
        up(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == "down":
        down()
    else:
        status()

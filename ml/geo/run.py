"""Compute Gi* hotspots and write them to geo.hotspots.

Run (stack up, from repo root):
    POSTGRES_PORT=5433 python -m ml.geo.run
"""

from __future__ import annotations

import json
import time

import numpy as np
import psycopg

from . import config, gi_star, grid


def _write(conn, rows: list[dict], category: str | None, window_label: str) -> None:
    with conn.cursor() as cur:
        for r in rows:
            cur.execute(
                """
                INSERT INTO geo.hotspots
                    (method, spatial_unit, cell_key, category, window_label, count,
                     gi_z, p_value, significance, centroid, cell)
                VALUES ('getis_ord_gi_star', %s, %s, %s, %s, %s, %s, %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326), ST_GeomFromText(%s, 4326))
                ON CONFLICT (spatial_unit, cell_key, category, window_label)
                DO UPDATE SET count = EXCLUDED.count, gi_z = EXCLUDED.gi_z,
                    p_value = EXCLUDED.p_value, significance = EXCLUDED.significance,
                    centroid = EXCLUDED.centroid, cell = EXCLUDED.cell, computed_at = now()
                """,
                (config.SPATIAL_UNIT, r["key"], category, window_label, r["count"],
                 r["z"], r["p"], r["band"], r["cx"], r["cy"], r["wkt"]),
            )


def _run_one(conn, category: str | None, window_label: str, month: str | None) -> dict | None:
    counts = grid.load_counts(conn, category=category, month=month)
    if len(counts) < 20:
        return None
    cells = grid.build_cells(counts)
    w = gi_star.queen_weights(cells)
    z, p, bands = gi_star.compute([c["count"] for c in cells], w)
    rows = [{**c, "z": float(zi), "p": float(pi), "band": bi}
            for c, zi, pi, bi in zip(cells, z, p, bands) if c["count"] > 0]
    _write(conn, rows, category, window_label)
    sig = {b: sum(1 for r in rows if r["band"] == b)
           for b in ("hot_99", "hot_95", "hot_90", "cold_99", "cold_95", "cold_90")}
    hot_keys = {r["key"] for r in rows if r["band"].startswith("hot")}
    top_hot = sorted((r for r in rows if r["band"].startswith("hot")), key=lambda r: -r["z"])[:5]
    return {"cells": len(rows), "significant": sig, "hot_keys": hot_keys, "top_hot": top_hot}


def main() -> None:
    config.REPORT_DIR.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    report: dict = {"spatial_unit": config.SPATIAL_UNIT, "cell_size_deg": config.CELL_SIZE_DEG,
                    "permutations": config.PERMUTATIONS, "fdr_alpha": config.FDR_ALPHA}
    conn = psycopg.connect(**config.db_dsn())
    with conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM geo.hotspots")

        print("overall Gi* …")
        overall = _run_one(conn, None, "all", None)
        report["overall"] = ({"cells": overall["cells"], "significant": overall["significant"]}
                             if overall else None)

        print("per-category Gi* …")
        report["by_category"] = {}
        for cat in grid.top_categories(conn, config.TOP_CATEGORIES):
            r = _run_one(conn, cat, "all", None)
            if r:
                report["by_category"][cat] = {"cells": r["cells"], "significant": r["significant"]}

        print("per-month Gi* (stability) …")
        monthly: dict[str, set] = {}
        for mon in config.MONTHS:
            r = _run_one(conn, None, mon, mon)
            if r:
                monthly[mon] = r["hot_keys"]
        months = sorted(monthly)
        jac = []
        for a, b in zip(months, months[1:]):
            A, B = monthly[a], monthly[b]
            jac.append(round(len(A & B) / len(A | B), 3) if (A | B) else 1.0)
        report["monthly_hotspot_stability_jaccard"] = {
            "consecutive": jac, "mean": round(float(np.mean(jac)), 3) if jac else None}

        if overall:
            report["overall_hot_cells"] = len(overall["hot_keys"])
            report["top_hot_cells"] = [
                {"cell": r["key"], "count": r["count"], "gi_z": round(r["z"], 2),
                 "lon": round(r["cx"], 4), "lat": round(r["cy"], 4), "band": r["band"]}
                for r in overall["top_hot"]]

    report["wall_seconds"] = round(time.time() - t0, 1)
    (config.REPORT_DIR / "metrics.json").write_text(json.dumps(report, indent=2, default=str))
    conn.close()

    print("\n==== M5 HOTSPOTS (Gi*, NYC 311) ====")
    if overall:
        s = overall["significant"]
        print(f"  overall: {overall['cells']} cells | hot(99/95/90)={s['hot_99']}/{s['hot_95']}/{s['hot_90']}"
              f" | cold={s['cold_99']}/{s['cold_95']}/{s['cold_90']}")
    print(f"  monthly hotspot stability (Jaccard mean): {report['monthly_hotspot_stability_jaccard']['mean']}")
    print(f"  wall {report['wall_seconds']}s")


if __name__ == "__main__":
    main()

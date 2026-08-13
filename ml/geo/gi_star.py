"""Getis-Ord Gi* via esda, with BH-FDR significance banding."""

from __future__ import annotations

import numpy as np
from esda.getisord import G_Local
from libpysal.weights import W

from . import config


def queen_weights(cells: list[dict]) -> W:
    """Queen (8-neighbour) contiguity among the grid study cells, row-standardized."""
    idx = {(c["i"], c["j"]): k for k, c in enumerate(cells)}
    neighbors: dict[int, list[int]] = {}
    for k, c in enumerate(cells):
        nb = []
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if di == 0 and dj == 0:
                    continue
                m = idx.get((c["i"] + di, c["j"] + dj))
                if m is not None:
                    nb.append(m)
        neighbors[k] = nb
    w = W(neighbors, silence_warnings=True)
    w.transform = "r"
    return w


def _bh_fdr(p: np.ndarray) -> np.ndarray:
    """Benjamini–Hochberg adjusted p-values."""
    p = np.asarray(p, dtype=float)
    n = len(p)
    order = np.argsort(p)
    ranked = p[order] * n / np.arange(1, n + 1)
    ranked = np.minimum.accumulate(ranked[::-1])[::-1]  # enforce monotonicity
    q = np.empty(n)
    q[order] = np.clip(ranked, 0.0, 1.0)
    return q


def compute(counts_by_cell: list[int], w: W):
    """Return (z-scores, FDR p-values, significance bands) for the cells."""
    y = np.asarray(counts_by_cell, dtype=float)
    gi = G_Local(y, w, transform="R", star=True, permutations=config.PERMUTATIONS, seed=config.SEED)
    z = np.asarray(gi.Zs, dtype=float)
    p_fdr = _bh_fdr(np.asarray(gi.p_sim, dtype=float))
    bands = []
    for zi, pf in zip(z, p_fdr):
        hot = zi > 0
        if pf < 0.01:
            bands.append("hot_99" if hot else "cold_99")
        elif pf < 0.05:
            bands.append("hot_95" if hot else "cold_95")
        elif pf < 0.10:
            bands.append("hot_90" if hot else "cold_90")
        else:
            bands.append("ns")
    return z, p_fdr, bands

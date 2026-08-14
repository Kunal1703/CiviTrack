"""Train/val/test splits. Time-based is primary; random is a secondary sanity check."""

from __future__ import annotations

import pandas as pd

from . import config


def time_split(df: pd.DataFrame):
    """Split by created_date: train ≤ Aug, val = Sep, test = Oct–Dec.

    Documented caveat (M4_DESIGN §6): because resolution can exceed the observation
    window, the closed-only test set under-represents slow late-window complaints
    (survivorship bias). Error is reported sliced by created-month to expose it.
    """
    dt = pd.to_datetime(df["created_date"])
    train = df[dt < config.VAL_START]
    val = df[(dt >= config.VAL_START) & (dt < config.TEST_START)]
    test = df[dt >= config.TEST_START]
    return train.reset_index(drop=True), val.reset_index(drop=True), test.reset_index(drop=True)


def random_split(df: pd.DataFrame, seed: int = config.SEED):
    d = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    n = len(d)
    a, b = int(n * 0.70), int(n * 0.85)
    return d.iloc[:a].reset_index(drop=True), d.iloc[a:b].reset_index(drop=True), d.iloc[b:].reset_index(drop=True)

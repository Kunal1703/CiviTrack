"""Embedding text normalization — the train/serve parity contract for M3.

Intentionally *lighter* than the classifier's `clean_text`: sentence-transformer
models are trained on natural text, so we keep punctuation and casing and only
strip URLs and collapse whitespace. Aggressive cleaning (as the classifier does)
would discard signal the embedder relies on.

Applied identically at index time and query time, and vendored verbatim into
services/ml_service (kept in sync; a test asserts byte-for-byte parity).
"""

from __future__ import annotations

import re

_URL = re.compile(r"http\S+|www\.\S+")
_WS = re.compile(r"\s+")


def embed_normalize(text: str | None) -> str:
    if text is None:
        return ""
    t = str(text).replace("\n", " ").replace("\t", " ")
    t = _URL.sub(" ", t)
    t = _WS.sub(" ", t).strip()
    return t

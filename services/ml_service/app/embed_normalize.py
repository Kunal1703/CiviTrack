"""Embedding normalization — VENDORED COPY (M3 parity contract).

⚠️  Byte-for-byte copy of ml/semantic/normalize.py::embed_normalize. The
embeddings in pgvector were produced with this exact function, so query-time
normalization here must match. Keep in sync (a test asserts parity).
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

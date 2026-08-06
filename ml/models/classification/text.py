"""Shared text preprocessing — the train/serve consistency contract.

This function is applied **identically** at training time (to NYC 311
`descriptor`) and at inference time (to arbitrary user-written complaint text).
It takes *any* string and is intentionally source-agnostic: nothing here assumes
the input is a 311 descriptor rather than a free-form citizen complaint.

The same logic must run on both sides of the train/serve boundary, so this
module is vendored into `services/ml_service` verbatim (kept in sync).
Keep it minimal and dependency-free.
"""

from __future__ import annotations

import re

_URL = re.compile(r"http\S+|www\.\S+")
_KEEP = re.compile(r"[^a-z0-9/&\-\s]")
_WS = re.compile(r"\s+")


def clean_text(text: str | None) -> str:
    """Normalize arbitrary complaint text to a canonical form.

    Lowercase, strip URLs, drop punctuation (keeping a few civic-relevant
    separators), and collapse whitespace. Deterministic and idempotent.
    """
    if text is None:
        return ""
    t = str(text).lower().strip()
    t = _URL.sub(" ", t)
    t = t.replace("\n", " ").replace("\t", " ")
    t = _KEEP.sub(" ", t)
    t = _WS.sub(" ", t).strip()
    return t

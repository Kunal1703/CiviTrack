"""Shared text preprocessing — VENDORED COPY.

⚠️  This file is a verbatim copy of
    ml/models/classification/text.py
It MUST stay byte-for-byte in sync with the training-side version: the model was
trained on text produced by this exact function, so inference must apply the
identical transformation. (A future refactor may extract this into a shared,
installable package; for now it is vendored to keep the service self-contained
for containerization.)
"""

from __future__ import annotations

import re

_URL = re.compile(r"http\S+|www\.\S+")
_KEEP = re.compile(r"[^a-z0-9/&\-\s]")
_WS = re.compile(r"\s+")


def clean_text(text: str | None) -> str:
    """Normalize arbitrary complaint text to a canonical form."""
    if text is None:
        return ""
    t = str(text).lower().strip()
    t = _URL.sub(" ", t)
    t = t.replace("\n", " ").replace("\t", " ")
    t = _KEEP.sub(" ", t)
    t = _WS.sub(" ", t).strip()
    return t

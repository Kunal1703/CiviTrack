"""Semantic layer tests (fast, no model/DB): preprocessing parity + validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.embed_normalize import embed_normalize
from app.schemas.semantic import DuplicateCheckRequest, SearchRequest

# Parity contract — these outputs MUST match ml/semantic/normalize.embed_normalize
# (the same cases are asserted there). If either side changes, both tests fail.
PARITY_CASES = [
    ("  Hello   World  ", "Hello World"),
    ("no\theat\nand water", "no heat and water"),
    ("visit http://x.com now", "visit now"),
    ("Street Light Out", "Street Light Out"),
    (None, ""),
]


def test_embed_normalize_parity() -> None:
    for inp, expected in PARITY_CASES:
        assert embed_normalize(inp) == expected


def test_search_request_validation() -> None:
    with pytest.raises(ValidationError):
        SearchRequest(query="", top_k=5)          # empty query
    with pytest.raises(ValidationError):
        SearchRequest(query="ok", top_k=100)       # top_k > 50
    with pytest.raises(ValidationError):
        SearchRequest(query="ok", min_similarity=2)  # out of [0,1]
    assert SearchRequest(query="street light", top_k=5).top_k == 5


def test_duplicate_check_validation() -> None:
    with pytest.raises(ValidationError):
        DuplicateCheckRequest(description="")
    with pytest.raises(ValidationError):
        DuplicateCheckRequest(description="x", latitude=200)  # bad lat
    ok = DuplicateCheckRequest(description="no heat", latitude=40.7, longitude=-73.9)
    assert ok.description == "no heat"

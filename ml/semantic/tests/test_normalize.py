"""Parity contract for embed_normalize (mirrors services/ml_service test)."""

from __future__ import annotations

from semantic.normalize import embed_normalize

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

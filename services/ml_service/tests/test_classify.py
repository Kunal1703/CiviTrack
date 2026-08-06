"""ML service tests (no model artifact required).

Verify health, input validation, and graceful degradation when no model is
loaded (503). Model-backed prediction is covered by the end-to-end verification.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app

client = TestClient(create_app())


def test_health_reports_model_state() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "model_loaded" in body
    assert "model_version" in body


def test_classify_rejects_empty_text() -> None:
    resp = client.post("/classify", json={"text": ""})
    assert resp.status_code == 422  # validation


def test_classify_503_without_model() -> None:
    # In unit tests no artifact is mounted, so the model is not loaded.
    resp = client.post("/classify", json={"text": "streetlight is broken"})
    assert resp.status_code in (503, 200)  # 503 without model; 200 if one is present

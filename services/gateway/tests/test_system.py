"""Tests for system endpoints.

These are dependency-free (no live database needed): they exercise liveness,
the config contract, and — critically — assert that no secret leaks from
``/config``.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app

client = TestClient(create_app())


def test_health_ok() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"]
    assert body["environment"]


def test_root_ok() -> None:
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["docs"] == "/docs"


def test_config_contract_and_no_secrets() -> None:
    resp = client.get("/config")
    assert resp.status_code == 200
    body = resp.json()
    # Contract fields present
    for key in ("app_name", "version", "environment", "database_host", "database_name"):
        assert key in body
    # Secrets must never be exposed
    assert "password" not in body
    assert "database_url" not in body
    assert not any("password" in str(v).lower() for v in body.values())

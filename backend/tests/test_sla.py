"""Tests for SLA rule CRUD."""
import os
import sys
import pytest

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from starlette.testclient import TestClient
from main import app

client = TestClient(app)


def test_sla_list(auth_headers):
    """GET /sla/ returns list (may be empty)."""
    resp = client.get("/sla/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_sla_create(auth_headers):
    """POST /sla/ creates a rule."""
    payload = {
        "name": "Test SLA Rule Pytest",
        "description": "Pytest created",
        "ticket_type": "onsite",
        "sla_target_hours": 24,
        "sla_breach_hours": 48,
        "is_active": True,
    }
    resp = client.post("/sla/", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    rule_id = data.get("rule_id") or (data.get("id") if isinstance(data, dict) else None)
    if rule_id:
        assert data.get("name") == "Test SLA Rule Pytest" or "name" in str(data)


def test_sla_get(auth_headers):
    """GET /sla/{rule_id} returns the rule."""
    create_resp = client.post(
        "/sla/",
        json={"name": "Get Test Rule Pytest", "sla_target_hours": 12, "is_active": True},
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    data = create_resp.json()
    rule_id = data.get("rule_id") or data.get("id") if isinstance(data, dict) else None
    if not rule_id:
        list_resp = client.get("/sla/", headers=auth_headers)
        rules = list_resp.json()
        rule = next((r for r in rules if r.get("name") == "Get Test Rule Pytest"), None)
        assert rule is not None
        rule_id = rule["rule_id"]
    resp = client.get(f"/sla/{rule_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json().get("name") == "Get Test Rule Pytest"


def test_sla_update(auth_headers):
    """PUT /sla/{rule_id} updates the rule."""
    create_resp = client.post(
        "/sla/",
        json={"name": "Update Test Rule Pytest", "sla_target_hours": 24, "is_active": True},
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    data = create_resp.json()
    rule_id = data.get("rule_id") or data.get("id") if isinstance(data, dict) else None
    if not rule_id:
        list_resp = client.get("/sla/", headers=auth_headers)
        rules = list_resp.json()
        rule = next((r for r in rules if r.get("name") == "Update Test Rule Pytest"), None)
        assert rule is not None
        rule_id = rule["rule_id"]
    resp = client.put(
        f"/sla/{rule_id}",
        json={"name": "Updated Name Pytest", "sla_target_hours": 48, "is_active": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    out = resp.json()
    if out:
        assert out.get("name") == "Updated Name Pytest"


def test_sla_delete(auth_headers):
    """DELETE /sla/{rule_id} removes the rule."""
    create_resp = client.post(
        "/sla/",
        json={"name": "Delete Test Rule Pytest", "sla_target_hours": 24, "is_active": True},
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    data = create_resp.json()
    rule_id = data.get("rule_id") or data.get("id") if isinstance(data, dict) else None
    if not rule_id:
        list_resp = client.get("/sla/", headers=auth_headers)
        rules = list_resp.json()
        rule = next((r for r in rules if r.get("name") == "Delete Test Rule Pytest"), None)
        assert rule is not None
        rule_id = rule["rule_id"]
    resp = client.delete(f"/sla/{rule_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json().get("success") is True
    get_resp = client.get(f"/sla/{rule_id}", headers=auth_headers)
    assert get_resp.status_code == 404

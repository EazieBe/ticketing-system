"""Tests for ticket create, update, approve, claim, complete."""
import os
import sys
import pytest

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from starlette.testclient import TestClient
from main import app
from database import SessionLocal
import crud
import schemas
import models

client = TestClient(app)


@pytest.fixture
def test_site_id(ensure_test_site):
    """Return a site_id that exists (from conftest ensure_test_site)."""
    db = SessionLocal()
    try:
        site = db.query(models.Site).first()
        assert site is not None
        return site.site_id
    finally:
        db.close()


def test_ticket_create(auth_headers, ensure_test_site, test_site_id):
    """POST /tickets/ creates a ticket and returns 200 with ticket_id."""
    payload = {
        "site_id": test_site_id,
        "type": "onsite",
        "status": "open",
        "priority": "normal",
        "notes": "Test ticket from pytest",
    }
    resp = client.post("/tickets/", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "ticket_id" in data
    assert data["site_id"] == test_site_id
    assert data["notes"] == "Test ticket from pytest"


def test_ticket_create_unauthorized(ensure_test_site, test_site_id):
    """POST /tickets/ without auth returns 401."""
    payload = {"site_id": test_site_id, "type": "onsite", "status": "open"}
    resp = client.post("/tickets/", json=payload)
    assert resp.status_code == 401


def test_ticket_update(auth_headers, ensure_test_site, test_site_id):
    """PUT /tickets/{id} updates a ticket."""
    # Create ticket first
    create_resp = client.post(
        "/tickets/",
        json={"site_id": test_site_id, "type": "onsite", "status": "open", "notes": "Original"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    ticket_id = create_resp.json()["ticket_id"]

    # Update
    update_resp = client.put(
        f"/tickets/{ticket_id}",
        json={"notes": "Updated by test"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["notes"] == "Updated by test"


def test_ticket_approve(auth_headers, ensure_test_site, test_site_id):
    """POST /tickets/{id}/approve?approve=true approves a ticket (must be completed first)."""
    create_resp = client.post(
        "/tickets/",
        json={"site_id": test_site_id, "type": "onsite", "status": "open"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    ticket_id = create_resp.json()["ticket_id"]
    client.put(f"/tickets/{ticket_id}/claim", json={}, headers=auth_headers)
    client.put(f"/tickets/{ticket_id}/complete", json={}, headers=auth_headers)

    resp = client.post(f"/tickets/{ticket_id}/approve?approve=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") in ("approved", "archived")


def test_ticket_claim(auth_headers, ensure_test_site, test_site_id):
    """PUT /tickets/{id}/claim sets claimed_by."""
    create_resp = client.post(
        "/tickets/",
        json={"site_id": test_site_id, "type": "onsite", "status": "open"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    ticket_id = create_resp.json()["ticket_id"]

    resp = client.put(f"/tickets/{ticket_id}/claim", json={}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("claimed_by") is not None


def test_ticket_complete(auth_headers, ensure_test_site, test_site_id):
    """PUT /tickets/{id}/complete sets status completed."""
    create_resp = client.post(
        "/tickets/",
        json={"site_id": test_site_id, "type": "onsite", "status": "open"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    ticket_id = create_resp.json()["ticket_id"]
    # Claim first (complete may require claimed)
    client.put(f"/tickets/{ticket_id}/claim", json={}, headers=auth_headers)

    resp = client.put(f"/tickets/{ticket_id}/complete", json={}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "completed"

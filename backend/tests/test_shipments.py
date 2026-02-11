"""Tests for shipment status update and archive."""
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
    db = SessionLocal()
    try:
        site = db.query(models.Site).first()
        assert site is not None
        return site.site_id
    finally:
        db.close()


@pytest.fixture
def test_ticket_id(auth_headers, ensure_test_site, test_site_id):
    """Create a ticket and return its id for shipment tests."""
    resp = client.post(
        "/tickets/",
        json={"site_id": test_site_id, "type": "onsite", "status": "open"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    return resp.json()["ticket_id"]


@pytest.fixture
def test_shipment_id(auth_headers, test_site_id, test_ticket_id):
    """Create a shipment and return its id."""
    resp = client.post(
        "/shipments/",
        json={
            "site_id": test_site_id,
            "ticket_id": test_ticket_id,
            "what_is_being_shipped": "Test parts",
        },
        headers=auth_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    data = resp.json()
    # Response may be { shipment_id, message } or the shipment object
    return data.get("shipment_id") or data.get("id") or data["shipment_id"]


def test_shipment_status_update(auth_headers, test_shipment_id):
    """PATCH /shipments/{id}/status updates status."""
    resp = client.patch(
        f"/shipments/{test_shipment_id}/status",
        json={"status": "in_transit", "tracking_number": "TRK123"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "in_transit" or "tracking_number" in str(data)


def test_shipment_archive(auth_headers, test_shipment_id):
    """PATCH /shipments/{id}/archive archives the shipment."""
    resp = client.patch(
        f"/shipments/{test_shipment_id}/archive",
        params={"archived": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("archived") is True

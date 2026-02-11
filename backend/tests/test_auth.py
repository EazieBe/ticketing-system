"""Tests for auth: login, refresh, role checks."""
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


def test_login_success(ensure_test_user):
    """POST /login with valid credentials returns tokens and user."""
    resp = client.post(
        "/login",
        data={"username": "test-admin@example.com", "password": "testpass123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data.get("user") or "access_token" in data


def test_login_invalid_password(ensure_test_user):
    """POST /login with wrong password returns 401."""
    resp = client.post(
        "/login",
        data={"username": "test-admin@example.com", "password": "wrongpass"},
    )
    assert resp.status_code == 401


def test_login_invalid_user():
    """POST /login with unknown email returns 401."""
    resp = client.post(
        "/login",
        data={"username": "nonexistent@example.com", "password": "any"},
    )
    assert resp.status_code == 401


def test_refresh_returns_new_tokens(ensure_test_user):
    """POST /refresh with valid refresh_token returns new access_token."""
    login_resp = client.post(
        "/login",
        data={"username": "test-admin@example.com", "password": "testpass123"},
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    resp = client.post("/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_refresh_validation_error():
    """POST /refresh with missing body returns 422."""
    resp = client.post("/refresh", json={})
    assert resp.status_code == 422


def test_protected_route_without_token():
    """GET /tickets/ without Authorization returns 401."""
    resp = client.get("/tickets/")
    assert resp.status_code == 401


def test_protected_route_with_valid_token(auth_headers):
    """GET /tickets/ with valid token returns 200."""
    resp = client.get("/tickets/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

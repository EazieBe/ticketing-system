from starlette.testclient import TestClient
import os
import sys
import pytest

# Ensure backend package root is on sys.path
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from main import app  # type: ignore
from database import SessionLocal
from utils.main_utils import get_password_hash
import crud
import schemas
import models


def get_test_client() -> TestClient:
    return TestClient(app)


# Test user for authenticated requests (created once per test session)
TEST_USER_EMAIL = "test-admin@example.com"
TEST_USER_PASSWORD = "testpass123"


@pytest.fixture(scope="session")
def ensure_test_user():
    """Ensure a test admin user exists so login works. Call once per session."""
    db = SessionLocal()
    try:
        existing = crud.get_user_by_email(db, email=TEST_USER_EMAIL)
        if not existing:
            crud.create_user(
                db,
                schemas.AdminUserCreate(
                    name="Test Admin",
                    email=TEST_USER_EMAIL,
                    role=models.UserRole.admin.value,
                    hashed_password=get_password_hash(TEST_USER_PASSWORD),
                ),
            )
        elif not getattr(existing, "hashed_password", None):
            # Fix existing user from a previous run that had no hash
            existing.hashed_password = get_password_hash(TEST_USER_PASSWORD)
            db.commit()
    finally:
        db.close()


@pytest.fixture(scope="session")
def auth_headers(ensure_test_user):
    """Return headers dict with Bearer token from login (session-scoped to avoid rate limit)."""
    client = TestClient(app)
    resp = client.post(
        "/login",
        data={"username": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    token = data.get("access_token")
    assert token
    return {"Authorization": f"Bearer {token}"}
@pytest.fixture(scope="session")
def ensure_test_site():
    """Ensure at least one site exists for ticket/shipment tests."""
    db = SessionLocal()
    try:
        from sqlalchemy import func
        count = db.query(func.count(models.Site.site_id)).scalar()
        if count == 0:
            crud.create_site(
                db,
                schemas.SiteCreate(
                    site_id="TEST-SITE-001",
                    location="Test location",
                    city="Test City",
                    state="TX",
                ),
            )
    finally:
        db.close()

from starlette.testclient import TestClient
import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from main import app  # type: ignore


def test_refresh_validation_error():
    client = TestClient(app)
    # Missing body -> validation error
    resp = client.post("/refresh", json={})
    assert resp.status_code == 422



import json
from starlette.testclient import TestClient
import concurrent.futures as futures
import pytest
import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from main import app  # type: ignore
from utils.main_utils import create_access_token  # type: ignore


def test_websocket_connects_with_valid_token():
    client = TestClient(app)
    # Create a short-lived token for any user_id (WS endpoint does not hit DB)
    token = create_access_token({"sub": "test-user"})
    with pytest.raises(futures.CancelledError):
        with client.websocket_connect(f"/ws/updates?token={token}"):
            # Open then close; CancelledError on exit is acceptable in tests
            pass



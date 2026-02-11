"""
Main utility functions for the FastAPI application
"""

import jwt
import hashlib
import secrets
import string
import bcrypt
import os
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
import models
import schemas
import crud
from database import get_db

def generate_temp_password(length: int = 12) -> str:
    """Generate a temporary password"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password - supports both bcrypt and SHA256 (legacy)"""
    if not hashed_password:
        return False
    # Check if it's a bcrypt hash (starts with $2b$ or $2a$ or $2y$)
    if hashed_password.startswith('$2'):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False
    # Fall back to SHA256 for legacy hashes
    else:
        sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        return sha256_hash == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create an access token"""
    # Import here to avoid circular imports
    from utils.auth import SECRET_KEY, ALGORITHM
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _as_ticket_status(status_str) -> schemas.TicketStatus:
    """Convert model/schema enum or string to schemas.TicketStatus enum"""
    # Accept SQLAlchemy Enum (models.TicketStatus), Pydantic Enum, or raw string
    value = getattr(status_str, 'value', status_str)
    try:
        return schemas.TicketStatus(str(value))
    except Exception:
        return schemas.TicketStatus.open

def _as_role(role_str: str) -> models.UserRole:
    """Convert string to UserRole enum"""
    try:
        return models.UserRole(role_str)
    except ValueError:
        return models.UserRole.tech

# Import auth functions from auth module
from utils.auth import get_current_user, require_role

def audit_log(db: Session, user_id: str, field: str, old_value: str, new_value: str, ticket_id: str = None):
    """Create an audit log entry"""
    audit = schemas.TicketAuditCreate(
        ticket_id=ticket_id,
        user_id=user_id,
        change_time=datetime.now(timezone.utc),
        field_changed=field,
        old_value=old_value,
        new_value=new_value
    )
    crud.create_ticket_audit(db, audit)

def _enqueue_broadcast(background_tasks, message: str):
    """Enqueue a WebSocket broadcast message"""
    # Defer import to avoid circular dependency; delegate to app-level helper
    try:
        from main import _enqueue_broadcast as app_enqueue_broadcast  # type: ignore
        app_enqueue_broadcast(background_tasks, message)
    except Exception:
        # If import fails (e.g., during scripts/tools), safely no-op
        return


class APILatencyTracker:
    """In-memory rolling latency tracker for quick p50/p95 baselines."""

    def __init__(self, max_samples_per_key: int = 500):
        self.max_samples_per_key = max_samples_per_key
        self._samples = defaultdict(lambda: deque(maxlen=max_samples_per_key))

    def record(self, key: str, milliseconds: float):
        if milliseconds < 0:
            return
        self._samples[key].append(float(milliseconds))

    @staticmethod
    def _percentile(values, percentile: float) -> float:
        if not values:
            return 0.0
        ordered = sorted(values)
        idx = int((len(ordered) - 1) * percentile)
        return round(ordered[idx], 2)

    def summary(self):
        out = {}
        for key, samples in self._samples.items():
            vals = list(samples)
            if not vals:
                continue
            out[key] = {
                "count": len(vals),
                "avg_ms": round(sum(vals) / len(vals), 2),
                "p50_ms": self._percentile(vals, 0.50),
                "p95_ms": self._percentile(vals, 0.95),
                "max_ms": round(max(vals), 2),
            }
        return out


def timer_ms():
    return time.perf_counter() * 1000.0

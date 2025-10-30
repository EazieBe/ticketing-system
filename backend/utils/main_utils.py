"""
Main utility functions for the FastAPI application
"""

import jwt
import hashlib
import secrets
import string
import bcrypt
import os
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
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
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
        return models.UserRole.technician

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
    # This will be overridden in main.py with access to redis_client
    pass

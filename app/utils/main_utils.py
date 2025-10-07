"""
Main utility functions for the FastAPI application
"""

import jwt
import hashlib
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
import models
import schemas
import crud
from database import get_db

# Security
SECRET_KEY = "your-secret-key-here"  # Should be from environment
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def generate_temp_password(length: int = 12) -> str:
    """Generate a temporary password"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password"""
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create an access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _as_ticket_status(status_str: str) -> schemas.TicketStatus:
    """Convert string to TicketStatus enum"""
    try:
        return schemas.TicketStatus(status_str)
    except ValueError:
        return schemas.TicketStatus.open

def _as_role(role_str: str) -> models.UserRole:
    """Convert string to UserRole enum"""
    try:
        return models.UserRole(role_str)
    except ValueError:
        return models.UserRole.technician

def require_role(allowed_roles: list):
    """Dependency to require specific roles"""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

def get_current_user(token: str = Depends(lambda: None), db: Session = Depends(get_db)):
    """Get current user from token"""
    # This will be overridden by the OAuth2PasswordBearer in main.py
    pass

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

"""
Authentication utilities
"""

import jwt
import os
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import models
import crud
from database import get_db

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")

# Validate SECRET_KEY length for security
if len(SECRET_KEY) < 32:
    raise ValueError(
        "SECRET_KEY must be at least 32 characters long for security. "
        "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
    
    user = crud.get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(allowed_roles: list):
    """Dependency to require specific roles"""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Handle both enum and string role values
        user_role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
        normalized_allowed = [r.value if hasattr(r, 'value') else r for r in allowed_roles]
        
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

# Simple in-memory per-process rate limiter (best-effort)
_RATE_BUCKETS = {}

def rate_limit(key_prefix: str, limit: int = 60, window_seconds: int = 60):
    """Dependency to rate limit actions per user per window.
    Not distributed-safe; per-process best effort.
    """
    def _limiter(current_user: models.User = Depends(get_current_user)):
        from time import time
        now = int(time())
        window = now // window_seconds
        bucket_key = f"{key_prefix}:{current_user.user_id}:{window}"
        count = _RATE_BUCKETS.get(bucket_key, 0)
        if count >= limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        _RATE_BUCKETS[bucket_key] = count + 1
    return _limiter


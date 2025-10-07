from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta, timezone
import secrets
import string
import os
import json
import asyncio
import redis
from contextlib import asynccontextmanager

import models, schemas, crud
from database import SessionLocal, engine
from routers import tickets, users, sites, shipments, fieldtechs, tasks, equipment, inventory, sla, audit, logging

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Redis connection for WebSocket broadcasting
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global redis_client
    try:
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        redis_client.ping()
        print("Connected to Redis for WebSocket broadcasting")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        redis_client = None
    
    yield
    
    if redis_client:
        redis_client.close()

app = FastAPI(
    title="Ticketing System API",
    description="A comprehensive ticketing system for field operations",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://192.168.43.50:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tickets.router)
app.include_router(users.router)
app.include_router(sites.router)
app.include_router(shipments.router)
app.include_router(fieldtechs.router)
app.include_router(tasks.router)
app.include_router(equipment.router)
app.include_router(inventory.router)
app.include_router(sla.router)
app.include_router(audit.router)
app.include_router(logging.router)

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Utility functions
def generate_temp_password(length: int = 12) -> str:
    """Generate a temporary password"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def get_password_hash(password: str) -> str:
    """Hash a password"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password"""
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create an access token"""
    import jwt
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

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(crud.get_db)):
    """Get current user from token"""
    import jwt
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = crud.get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

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

def _enqueue_broadcast(background_tasks: BackgroundTasks, message: str):
    """Enqueue a WebSocket broadcast message"""
    if redis_client:
        background_tasks.add_task(broadcast_message, message)

async def broadcast_message(message: str):
    """Broadcast a message to all WebSocket connections"""
    if redis_client:
        try:
            redis_client.publish("websocket_updates", message)
        except Exception as e:
            print(f"Failed to broadcast message: {e}")

# Authentication endpoints
@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(crud.get_db)):
    """Login endpoint"""
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "must_change_password": user.must_change_password
    }

@app.post("/refresh")
def refresh_token(refresh_data: dict, db: Session = Depends(crud.get_db)):
    """Refresh access token"""
    refresh_token = refresh_data.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token required")
    
    # In a real implementation, you'd validate the refresh token
    # For now, we'll just create a new access token
    user_id = refresh_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

# WebSocket endpoint
@app.websocket("/ws/updates")
async def websocket_endpoint(websocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    
    if redis_client:
        pubsub = redis_client.pubsub()
        pubsub.subscribe("websocket_updates")
        
        try:
            while True:
                message = pubsub.get_message(timeout=1.0)
                if message and message['type'] == 'message':
                    await websocket.send_text(message['data'])
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            pubsub.close()
    else:
        # Fallback: just keep connection alive
        try:
            while True:
                await websocket.receive_text()
        except Exception as e:
            print(f"WebSocket error: {e}")

# Health check
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Root endpoint
@app.get("/")
def read_root():
    """Root endpoint"""
    return {"message": "Ticketing System API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import models, schemas, crud
from database import SessionLocal, engine
from typing import List, Optional
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, date, timezone
import asyncio
import random
import string
import csv
import io
import uuid

app = FastAPI()

# CORS middleware must be added immediately after creating the app
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.43.50:3000",
    # Add your production frontend domain here
    # "https://your-frontend-domain.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Keep True since we're using JWT tokens
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

SECRET_KEY = "supersecretkey"  # TODO: Move to env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Short-lived access tokens
REFRESH_TOKEN_EXPIRE_DAYS = 1     # Long-lived refresh tokens (24 hours)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None

def get_user_by_email(db, email: str):
    return crud.get_user_by_email(db, email=email)

def authenticate_user(db, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None
    # Use dedicated hashed_password field
    if not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        role = payload.get("role")
        token_data = schemas.TokenData(user_id=user_id, role=role)
    except JWTError:
        raise credentials_exception
    user = crud.get_user(db, user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    return user

def require_role(required_roles):
    def role_checker(user=Depends(get_current_user)):
        if user.role not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

def generate_temp_password(length=10):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

@app.get("/")
def read_root():
    return {"message": "Ticketing System API is running."}

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and container orchestration"""
    try:
        # Test database connectivity
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "database": db_status,
        "services": {
            "api": "running",
            "websocket": "available"
        }
    }

@app.get("/test-cors")
def test_cors():
    return {"message": "CORS test endpoint", "cors_enabled": True}

# --- User Endpoints ---
@app.post("/users/", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Always generate a temp password for new users (ignore any password from frontend)
    temp_password = generate_temp_password()
    hashed_password = get_password_hash(temp_password)
    user.hashed_password = hashed_password
    user.preferences = "{}"
    # Set must_change_password True for new users
    user.must_change_password = True
    result = crud.create_user(db=db, user=user)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="user_create",
        old_value=None,
        new_value=str(result.user_id)
    )
    crud.create_ticket_audit(db, audit)
    # Return temp password in response for admin
    out_dict = {
        "user_id": result.user_id,
        "name": result.name,
        "email": result.email,
        "role": result.role,
        "phone": result.phone,
        "region": result.region,
        "preferences": result.preferences,
        "must_change_password": result.must_change_password,
        "temp_password": temp_password
    }
    return out_dict

@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/users/", response_model=List[schemas.UserOut])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_users(db, skip=skip, limit=limit)

@app.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: str, user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.update_user(db, user_id=user_id, user=user)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="user_update",
        old_value=None,
        new_value=str(result.user_id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.delete_user(db, user_id=user_id)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="user_delete",
        old_value=str(user_id),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.post("/users/{user_id}/change_password")
def change_password(user_id: str, password_data: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to change this password")
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = password_data.get("new_password")
    if not new_password:
        raise HTTPException(status_code=400, detail="new_password is required")
    
    db_user.hashed_password = get_password_hash(new_password)
    db_user.must_change_password = False
    db.commit()
    db.refresh(db_user)
    return {"success": True}

@app.post("/users/{user_id}/reset_password")
def reset_password(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can reset passwords")
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    temp_password = generate_temp_password()
    db_user.hashed_password = get_password_hash(temp_password)
    db_user.must_change_password = True
    db.commit()
    db.refresh(db_user)
    return {"success": True, "temp_password": temp_password}

# --- Site Endpoints ---
@app.post("/sites/", response_model=schemas.SiteOut)
def create_site(site: schemas.SiteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.create_site(db=db, site=site)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="site_create",
        old_value=None,
        new_value=str(result.site_id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.get("/sites/{site_id}", response_model=schemas.SiteOut)
def get_site(site_id: str, db: Session = Depends(get_db)):
    db_site = crud.get_site(db, site_id=site_id)
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    return db_site

@app.get("/sites/", response_model=List[schemas.SiteOut])
def list_sites(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_sites(db, skip=skip, limit=limit)

@app.put("/sites/{site_id}", response_model=schemas.SiteOut)
def update_site(site_id: str, site: schemas.SiteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_site(db, site_id)
    result = crud.update_site(db, site_id=site_id, site=site)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="site_update",
        old_value=str(prev),
        new_value=str(result)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.delete("/sites/{site_id}")
def delete_site(site_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_site(db, site_id)
    if not prev:
        raise HTTPException(status_code=404, detail="Site not found")
    
    result = crud.delete_site(db, site_id=site_id)
    
    # Create audit log for site deletion
    audit = schemas.TicketAuditCreate(
        ticket_id=None,  # Site deletion doesn't have a specific ticket
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="site_delete",
        old_value=f"Site {site_id}: {prev.location}",
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    return result

# --- Ticket Endpoints ---
@app.post("/tickets/", response_model=schemas.TicketOut)
def create_ticket(ticket: schemas.TicketCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.create_ticket(db=db, ticket=ticket)
    try:
        asyncio.create_task(manager.broadcast('{"type": "ticket", "action": "create"}'))
    except RuntimeError:
        # Handle case where no event loop is running
        pass
    return result

@app.get("/tickets/{ticket_id}", response_model=schemas.TicketOut)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    db_ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket

@app.get("/tickets/", response_model=List[schemas.TicketOut])
def list_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_tickets(db, skip=skip, limit=limit)

@app.put("/tickets/{ticket_id}", response_model=schemas.TicketOut)
def update_ticket(ticket_id: str, ticket: schemas.TicketUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # If non-admin/dispatcher tries to close, set to pending approval
    is_admin_or_dispatcher = current_user.role in ('admin', 'dispatcher')
    prev_ticket = crud.get_ticket(db, ticket_id)
    
    if not prev_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Handle status change logic
    if ticket.status and ticket.status != prev_ticket.status:
        new_status = ticket.status
        if new_status == schemas.TicketStatus.closed and not is_admin_or_dispatcher:
            new_status = schemas.TicketStatus.pending
        ticket.status = new_status
    
    # Set update metadata
    ticket.last_updated_by = current_user.user_id
    ticket.last_updated_at = datetime.utcnow()
    
    result = crud.update_ticket(db, ticket_id=ticket_id, ticket=ticket)
    
    # Audit log for status changes
    if prev_ticket and ticket.status and prev_ticket.status != ticket.status:
        audit = schemas.TicketAuditCreate(
            ticket_id=ticket_id,
            user_id=current_user.user_id,
            change_time=datetime.utcnow(),
            field_changed="status",
            old_value=prev_ticket.status,
            new_value=ticket.status
        )
        crud.create_ticket_audit(db, audit)
    
    try:
        asyncio.create_task(manager.broadcast('{"type": "ticket", "action": "update"}'))
    except RuntimeError:
        # Handle case where no event loop is running
        pass
    return result

@app.patch("/tickets/{ticket_id}/status", response_model=schemas.TicketOut)
def update_ticket_status(ticket_id: str, status_update: schemas.StatusUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Quick endpoint for status changes only"""
    prev_ticket = crud.get_ticket(db, ticket_id)
    
    if not prev_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Handle status change logic
    is_admin_or_dispatcher = current_user.role in ('admin', 'dispatcher')
    new_status = status_update.status
    if new_status == schemas.TicketStatus.closed and not is_admin_or_dispatcher:
        new_status = schemas.TicketStatus.pending
    
    # Create update object
    ticket_update = schemas.TicketUpdate(
        status=new_status,
        last_updated_by=current_user.user_id,
        last_updated_at=datetime.utcnow()
    )
    
    result = crud.update_ticket(db, ticket_id=ticket_id, ticket=ticket_update)
    
    # Audit log
    if prev_ticket.status != new_status:
        audit = schemas.TicketAuditCreate(
            ticket_id=ticket_id,
            user_id=current_user.user_id,
            change_time=datetime.utcnow(),
            field_changed="status",
            old_value=prev_ticket.status,
            new_value=new_status
        )
        crud.create_ticket_audit(db, audit)
    
    try:
        asyncio.create_task(manager.broadcast('{"type": "ticket", "action": "update"}'))
    except RuntimeError:
        pass
    return result

@app.post("/tickets/{ticket_id}/approve")
def approve_ticket(ticket_id: str, approve: bool, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(['admin', 'dispatcher']))):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != schemas.TicketStatus.closed:
        raise HTTPException(status_code=400, detail="Ticket is not closed and ready for approval")
    prev_status = ticket.status
    if approve:
        ticket.status = schemas.TicketStatus.approved
    else:
        ticket.status = schemas.TicketStatus.in_progress  # or previous status if tracked
    db.commit()
    db.refresh(ticket)
    # Audit log
    audit = schemas.TicketAuditCreate(
        ticket_id=ticket_id,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="approval",
        old_value=prev_status,
        new_value=ticket.status
    )
    crud.create_ticket_audit(db, audit)
    try:
        asyncio.create_task(manager.broadcast('{"type": "ticket", "action": "approval"}'))
    except RuntimeError:
        # Handle case where no event loop is running
        pass
    return ticket

@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.delete_ticket(db, ticket_id=ticket_id)
    try:
        asyncio.create_task(manager.broadcast('{"type": "ticket", "action": "delete"}'))
    except RuntimeError:
        # Handle case where no event loop is running
        pass
    return result

# --- Shipment Endpoints ---
@app.post("/shipments/", response_model=schemas.ShipmentOut)
def create_shipment(shipment: schemas.ShipmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.create_shipment(db=db, shipment=shipment)
    audit = schemas.TicketAuditCreate(
        ticket_id=shipment.ticket_id,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="shipment_create",
        old_value=None,
        new_value=str(result.shipment_id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.get("/shipments/{shipment_id}", response_model=schemas.ShipmentOut)
def get_shipment(shipment_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_shipment = crud.get_shipment(db, shipment_id=shipment_id)
    if not db_shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return db_shipment

@app.get("/shipments/", response_model=List[schemas.ShipmentOut])
def list_shipments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_shipments(db, skip=skip, limit=limit)

@app.put("/shipments/{shipment_id}", response_model=schemas.ShipmentOut)
def update_shipment(shipment_id: str, shipment: schemas.ShipmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_shipment(db, shipment_id)
    if not prev:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    result = crud.update_shipment(db, shipment_id=shipment_id, shipment=shipment)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update shipment")
    audit = schemas.TicketAuditCreate(
        ticket_id=shipment.ticket_id,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="shipment_update",
        old_value=str(prev),
        new_value=str(result)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.delete("/shipments/{shipment_id}")
def delete_shipment(shipment_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_shipment(db, shipment_id)
    if not prev:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    result = crud.delete_shipment(db, shipment_id=shipment_id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to delete shipment")
    audit = schemas.TicketAuditCreate(
        ticket_id=prev.ticket_id if prev else None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="shipment_delete",
        old_value=str(prev),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    return result

# --- InventoryItem Endpoints ---
@app.post("/inventory/", response_model=schemas.InventoryItemOut)
def create_inventory_item(item: schemas.InventoryItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.create_inventory_item(db=db, item=item)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="inventory_create",
        old_value=None,
        new_value=str(result.item_id)
    )
    crud.create_ticket_audit(db, audit)
    try:
        asyncio.create_task(manager.broadcast('{"type": "inventory", "action": "create"}'))
    except RuntimeError:
        # Handle case where no event loop is running
        pass
    return result

@app.get("/inventory/{item_id}", response_model=schemas.InventoryItemOut)
def get_inventory_item(item_id: str, db: Session = Depends(get_db)):
    db_item = crud.get_inventory_item(db, item_id=item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return db_item

@app.get("/inventory/", response_model=List[schemas.InventoryItemOut])
def list_inventory_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_inventory_items(db, skip=skip, limit=limit)

@app.put("/inventory/{item_id}", response_model=schemas.InventoryItemOut)
def update_inventory_item(item_id: str, item: schemas.InventoryItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_inventory_item(db, item_id)
    result = crud.update_inventory_item(db, item_id=item_id, item=item)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="inventory_update",
        old_value=str(prev),
        new_value=str(result)
    )
    crud.create_ticket_audit(db, audit)
    asyncio.create_task(manager.broadcast('{"type": "inventory", "action": "update"}'))
    return result

@app.delete("/inventory/{item_id}")
def delete_inventory_item(item_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_inventory_item(db, item_id)
    result = crud.delete_inventory_item(db, item_id=item_id)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="inventory_delete",
        old_value=str(prev),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    asyncio.create_task(manager.broadcast('{"type": "inventory", "action": "delete"}'))
    return result

@app.post("/inventory/scan")
def scan_inventory_item(scan_data: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Handle barcode scanning for inventory items"""
    barcode = scan_data.get("barcode")
    scan_type = scan_data.get("type", "in")
    user_id = scan_data.get("user_id")
    
    if not barcode:
        raise HTTPException(status_code=400, detail="Barcode is required")
    
    # Find item by barcode
    item = db.query(models.InventoryItem).filter(models.InventoryItem.barcode == barcode).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found with this barcode")
    
    # Create inventory transaction
    transaction = models.InventoryTransaction(
        transaction_id=str(uuid.uuid4()),
        item_id=item.item_id,
        user_id=user_id,
        date=datetime.now().date(),
        quantity=1,
        type=models.InventoryTransactionType.in_ if scan_type == "in" else models.InventoryTransactionType.out,
        notes=f"Scanned {scan_type} - {barcode}"
    )
    
    # Update item quantity
    if scan_type == "in":
        item.quantity_on_hand += 1
    else:
        if item.quantity_on_hand > 0:
            item.quantity_on_hand -= 1
        else:
            raise HTTPException(status_code=400, detail="Cannot scan out - no quantity available")
    
    db.add(transaction)
    db.commit()
    db.refresh(item)
    db.refresh(transaction)
    
    # Create audit log
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="inventory_scan",
        old_value=f"Qty: {item.quantity_on_hand - (1 if scan_type == 'in' else -1)}",
        new_value=f"Qty: {item.quantity_on_hand} - {scan_type} scan"
    )
    crud.create_ticket_audit(db, audit)
    
    return {
        "success": True,
        "item": {
            "item_id": item.item_id,
            "name": item.name,
            "quantity_on_hand": item.quantity_on_hand,
            "barcode": item.barcode
        },
        "transaction": {
            "transaction_id": transaction.transaction_id,
            "type": transaction.type.value,
            "quantity": transaction.quantity
        }
    }

# --- FieldTech Endpoints ---
@app.post("/fieldtechs/", response_model=schemas.FieldTechOut)
def create_field_tech(tech: schemas.FieldTechCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.create_field_tech(db=db, tech=tech)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="fieldtech_create",
        old_value=None,
        new_value=str(result.field_tech_id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.get("/fieldtechs/{field_tech_id}", response_model=schemas.FieldTechOut)
def get_field_tech(field_tech_id: str, db: Session = Depends(get_db)):
    db_tech = crud.get_field_tech(db, field_tech_id=field_tech_id)
    if not db_tech:
        raise HTTPException(status_code=404, detail="Field tech not found")
    return db_tech

@app.get("/fieldtechs/", response_model=List[schemas.FieldTechOut])
def list_field_techs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_field_techs(db, skip=skip, limit=limit)

@app.put("/fieldtechs/{field_tech_id}", response_model=schemas.FieldTechOut)
def update_field_tech(field_tech_id: str, tech: schemas.FieldTechCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_field_tech(db, field_tech_id)
    result = crud.update_field_tech(db, field_tech_id=field_tech_id, tech=tech)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="fieldtech_update",
        old_value=str(prev),
        new_value=str(result)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.delete("/fieldtechs/{field_tech_id}")
def delete_field_tech(field_tech_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_field_tech(db, field_tech_id)
    result = crud.delete_field_tech(db, field_tech_id=field_tech_id)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="fieldtech_delete",
        old_value=str(prev),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.post("/fieldtechs/import-csv")
def import_field_techs_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Import field techs from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read CSV content
        content = file.file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(content))
        
        imported_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 because row 1 is headers
            try:
                # Map CSV columns to field tech fields
                # Expected columns: Name, Phone, Email, Region, City, State, Zip, Notes
                field_tech_data = {
                    "field_tech_id": str(uuid.uuid4()),
                    "name": row.get('Name', '').strip(),
                    "phone": row.get('Phone', '').strip(),
                    "email": row.get('Email', '').strip(),
                    "region": row.get('Region', '').strip(),
                    "city": row.get('City', '').strip(),
                    "state": row.get('State', '').strip(),
                    "zip": row.get('Zip', '').strip(),
                    "notes": row.get('Notes', '').strip()
                }
                
                # Validate required fields
                if not field_tech_data["name"]:
                    errors.append(f"Row {row_num}: Name is required")
                    continue
                
                # Create field tech
                field_tech = models.FieldTech(**field_tech_data)
                db.add(field_tech)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        # Commit all successful imports
        if imported_count > 0:
            db.commit()
        
        # Create audit log
        audit = schemas.TicketAuditCreate(
            ticket_id=None,
            user_id=current_user.user_id,
            change_time=datetime.utcnow(),
            field_changed="field_techs_imported",
            old_value="",
            new_value=f"Imported {imported_count} field techs from CSV"
        )
        crud.create_ticket_audit(db, audit)
        
        return {
            "message": f"Successfully imported {imported_count} field techs",
            "imported_count": imported_count,
            "errors": errors,
            "total_rows_processed": len(list(csv.DictReader(io.StringIO(content))))
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")
    finally:
        file.file.close()

# --- Task Endpoints ---
@app.post("/tasks/", response_model=schemas.TaskOut)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.create_task(db=db, task=task)
    audit = schemas.TicketAuditCreate(
        ticket_id=task.ticket_id,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="task_create",
        old_value=None,
        new_value=str(result.task_id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: str, db: Session = Depends(get_db)):
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.get("/tasks/", response_model=List[schemas.TaskOut])
def list_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_tasks(db, skip=skip, limit=limit)

@app.put("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: str, task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_task(db, task_id)
    result = crud.update_task(db, task_id=task_id, task=task)
    audit = schemas.TicketAuditCreate(
        ticket_id=task.ticket_id,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="task_update",
        old_value=str(prev),
        new_value=str(result)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_task(db, task_id)
    result = crud.delete_task(db, task_id=task_id)
    audit = schemas.TicketAuditCreate(
        ticket_id=prev.ticket_id if prev else None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="task_delete",
        old_value=str(prev),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    return result

# --- Equipment Endpoints ---
@app.post("/equipment/", response_model=schemas.EquipmentOut)
def create_equipment(equipment: schemas.EquipmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = crud.create_equipment(db=db, equipment=equipment)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="equipment_create",
        old_value=None,
        new_value=str(result.equipment_id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.get("/equipment/{equipment_id}", response_model=schemas.EquipmentOut)
def get_equipment(equipment_id: str, db: Session = Depends(get_db)):
    db_equipment = crud.get_equipment(db, equipment_id=equipment_id)
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_equipment

@app.get("/equipment/", response_model=List[schemas.EquipmentOut])
def list_equipments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_equipments(db, skip=skip, limit=limit)

@app.put("/equipment/{equipment_id}", response_model=schemas.EquipmentOut)
def update_equipment(equipment_id: str, equipment: schemas.EquipmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_equipment(db, equipment_id)
    result = crud.update_equipment(db, equipment_id=equipment_id, equipment=equipment)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="equipment_update",
        old_value=str(prev),
        new_value=str(result)
    )
    crud.create_ticket_audit(db, audit)
    return result

@app.delete("/equipment/{equipment_id}")
def delete_equipment(equipment_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    prev = crud.get_equipment(db, equipment_id)
    result = crud.delete_equipment(db, equipment_id=equipment_id)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="equipment_delete",
        old_value=str(prev),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    return result

# --- TicketAudit Endpoints ---
@app.post("/audits/", response_model=schemas.TicketAuditOut)
def create_ticket_audit(audit: schemas.TicketAuditCreate, db: Session = Depends(get_db)):
    return crud.create_ticket_audit(db=db, audit=audit)

@app.get("/audits/{audit_id}", response_model=schemas.TicketAuditOut)
def get_ticket_audit(audit_id: str, db: Session = Depends(get_db)):
    db_audit = crud.get_ticket_audit(db, audit_id=audit_id)
    if not db_audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return db_audit

@app.get("/audits/", response_model=List[schemas.TicketAuditOut])
def list_ticket_audits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_ticket_audits(db, skip=skip, limit=limit)

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.user_id, "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": user.user_id, "role": user.role.value})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
        "must_change_password": getattr(user, 'must_change_password', False)
    }

@app.post("/refresh", response_model=schemas.Token)
def refresh_token(refresh_request: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = verify_refresh_token(refresh_request.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    role = payload.get("role")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Verify user still exists
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Create new tokens
    access_token = create_access_token(data={"sub": user.user_id, "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": user.user_id, "role": user.role.value})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
    }

# In-memory set of connected WebSocket clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                # Parse the received data
                import json
                message = json.loads(data)
                
                # Handle ping messages
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    continue
                    
            except json.JSONDecodeError:
                # If it's not JSON, just ignore it (keep alive)
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Demo endpoint to broadcast a message to all clients
@app.post("/broadcast_update")
def broadcast_update(message: str):
    import asyncio
    asyncio.create_task(manager.broadcast(message))
    return {"status": "broadcasted"}

@app.get("/reports/ticket-status")
def report_ticket_status(db: Session = Depends(get_db)):
    from sqlalchemy import func
    result = db.query(models.Ticket.status, func.count(models.Ticket.ticket_id)).group_by(models.Ticket.status).all()
    return {"status_counts": dict(result)}

@app.get("/reports/time-spent")
def report_time_spent(db: Session = Depends(get_db)):
    from sqlalchemy import func
    result = db.query(models.Ticket.assigned_user_id, func.sum(models.Ticket.time_spent)).group_by(models.Ticket.assigned_user_id).all()
    return {"time_spent_by_user": dict(result)}

@app.get("/reports/shipments")
def report_shipments(db: Session = Depends(get_db)):
    from sqlalchemy import func
    count = db.query(func.count(models.Shipment.shipment_id)).scalar()
    total_cost = db.query(func.sum(models.Shipment.charges_out)).scalar() or 0
    return {"shipment_count": count, "total_shipping_cost": total_cost}

@app.get("/reports/inventory")
def report_inventory(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total_items = db.query(func.sum(models.InventoryItem.quantity_on_hand)).scalar() or 0
    by_item = db.query(models.InventoryItem.name, func.sum(models.InventoryItem.quantity_on_hand)).group_by(models.InventoryItem.name).all()
    return {"total_items": total_items, "by_item": dict(by_item)} 

@app.get("/analytics/performance")
def get_performance_analytics(db: Session = Depends(get_db)):
    """Get performance analytics including response times, resolution times, and SLA compliance"""
    tickets = crud.get_tickets(db)
    
    # Calculate performance metrics
    total_tickets = len(tickets)
    closed_tickets = [t for t in tickets if t.status == 'closed']
    avg_resolution_time = 0
    sla_compliance_rate = 0
    
    if closed_tickets:
        resolution_times = []
        sla_compliant = 0
        
        for ticket in closed_tickets:
            if ticket.date_created and ticket.date_closed:
                created = datetime.combine(ticket.date_created, datetime.min.time())
                closed = datetime.combine(ticket.date_closed, datetime.min.time())
                hours = (closed - created).total_seconds() / 3600
                resolution_times.append(hours)
                
                # Check SLA compliance
                if ticket.sla_target_hours and hours <= ticket.sla_target_hours:
                    sla_compliant += 1
        
        avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
        sla_compliance_rate = (sla_compliant / len(closed_tickets)) * 100 if closed_tickets else 0
    
    return {
        "total_tickets": total_tickets,
        "closed_tickets": len(closed_tickets),
        "open_tickets": len([t for t in tickets if t.status != 'closed']),
        "avg_resolution_time_hours": round(avg_resolution_time, 2),
        "sla_compliance_rate": round(sla_compliance_rate, 2),
        "tickets_by_status": {
            "open": len([t for t in tickets if t.status == 'open']),
            "in_progress": len([t for t in tickets if t.status == 'in_progress']),
            "pending": len([t for t in tickets if t.status == 'pending']),
            "closed": len(closed_tickets),
            "approved": len([t for t in tickets if t.status == 'approved'])
        },
        "tickets_by_priority": {
            "low": len([t for t in tickets if t.priority == 'Low']),
            "medium": len([t for t in tickets if t.priority == 'Medium']),
            "high": len([t for t in tickets if t.priority == 'High']),
            "urgent": len([t for t in tickets if t.priority == 'Urgent'])
        }
    }

@app.get("/analytics/trends")
def get_trend_analytics(db: Session = Depends(get_db), days: int = 30):
    """Get trend analytics for the specified number of days"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    tickets = crud.get_tickets(db)
    
    # Filter tickets by date range
    filtered_tickets = []
    for ticket in tickets:
        if ticket.date_created:
            ticket_date = datetime.combine(ticket.date_created, datetime.min.time())
            if start_date <= ticket_date <= end_date:
                filtered_tickets.append(ticket)
    
    # Group by date
    daily_stats = {}
    for ticket in filtered_tickets:
        date_str = ticket.date_created.strftime('%Y-%m-%d')
        if date_str not in daily_stats:
            daily_stats[date_str] = {
                "created": 0,
                "closed": 0,
                "by_type": {},
                "by_priority": {}
            }
        
        daily_stats[date_str]["created"] += 1
        
        if ticket.status == 'closed':
            daily_stats[date_str]["closed"] += 1
        
        # Count by type
        ticket_type = ticket.type or 'unknown'
        daily_stats[date_str]["by_type"][ticket_type] = daily_stats[date_str]["by_type"].get(ticket_type, 0) + 1
        
        # Count by priority
        priority = ticket.priority or 'unknown'
        daily_stats[date_str]["by_priority"][priority] = daily_stats[date_str]["by_priority"].get(priority, 0) + 1
    
    return {
        "period_days": days,
        "total_tickets": len(filtered_tickets),
        "daily_stats": daily_stats
    }

@app.get("/analytics/site-performance")
def get_site_performance_analytics(db: Session = Depends(get_db)):
    """Get performance analytics by site"""
    sites = crud.get_sites(db)
    tickets = crud.get_tickets(db)
    
    site_performance = {}
    
    for site in sites:
        site_tickets = [t for t in tickets if t.site_id == site.site_id]
        closed_tickets = [t for t in site_tickets if t.status == 'closed']
        
        avg_resolution_time = 0
        if closed_tickets:
            resolution_times = []
            for ticket in closed_tickets:
                if ticket.date_created and ticket.date_closed:
                    created = datetime.combine(ticket.date_created, datetime.min.time())
                    closed = datetime.combine(ticket.date_closed, datetime.min.time())
                    hours = (closed - created).total_seconds() / 3600
                    resolution_times.append(hours)
            
            avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
        
        site_performance[site.site_id] = {
            "site_name": site.location,
            "total_tickets": len(site_tickets),
            "open_tickets": len([t for t in site_tickets if t.status != 'closed']),
            "closed_tickets": len(closed_tickets),
            "avg_resolution_time_hours": round(avg_resolution_time, 2),
            "tickets_by_type": {
                "inhouse": len([t for t in site_tickets if t.type == 'inhouse']),
                "onsite": len([t for t in site_tickets if t.type == 'onsite']),
                "projects": len([t for t in site_tickets if t.type == 'projects']),
                "shipping": len([t for t in site_tickets if t.type == 'shipping']),
                "nro": len([t for t in site_tickets if t.type == 'nro']),
                "misc": len([t for t in site_tickets if t.type == 'misc'])
            }
        }
    
    return site_performance

@app.get("/analytics/user-performance")
def get_user_performance_analytics(db: Session = Depends(get_db)):
    """Get performance analytics by user"""
    users = crud.get_users(db)
    tickets = crud.get_tickets(db)
    
    user_performance = {}
    
    for user in users:
        assigned_tickets = [t for t in tickets if t.assigned_user_id == user.user_id]
        closed_tickets = [t for t in assigned_tickets if t.status == 'closed']
        
        avg_resolution_time = 0
        if closed_tickets:
            resolution_times = []
            for ticket in closed_tickets:
                if ticket.date_created and ticket.date_closed:
                    created = datetime.combine(ticket.date_created, datetime.min.time())
                    closed = datetime.combine(ticket.date_closed, datetime.min.time())
                    hours = (closed - created).total_seconds() / 3600
                    resolution_times.append(hours)
            
            avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
        
        user_performance[user.user_id] = {
            "user_name": user.name,
            "total_assigned": len(assigned_tickets),
            "open_tickets": len([t for t in assigned_tickets if t.status != 'closed']),
            "closed_tickets": len(closed_tickets),
            "avg_resolution_time_hours": round(avg_resolution_time, 2),
            "tickets_by_status": {
                "open": len([t for t in assigned_tickets if t.status == 'open']),
                "in_progress": len([t for t in assigned_tickets if t.status == 'in_progress']),
                "pending": len([t for t in assigned_tickets if t.status == 'pending']),
                "closed": len(closed_tickets),
                "approved": len([t for t in assigned_tickets if t.status == 'approved'])
            }
        }
    
    return user_performance

@app.get("/search")
def search_endpoint(q: str, db: Session = Depends(get_db)):
    """Search across tickets, sites, and users"""
    if not q or len(q.strip()) < 2:
        return {"tickets": [], "sites": [], "users": []}
    
    search_term = f"%{q.strip()}%"
    
    # Search tickets
    tickets = db.query(models.Ticket).filter(
        models.Ticket.inc_number.ilike(search_term) |
        models.Ticket.so_number.ilike(search_term) |
        models.Ticket.notes.ilike(search_term) |
        models.Ticket.customer_name.ilike(search_term)
    ).limit(10).all()
    
    # Search sites
    sites = db.query(models.Site).filter(
        models.Site.site_id.ilike(search_term) |
        models.Site.location.ilike(search_term) |
        models.Site.brand.ilike(search_term) |
        models.Site.notes.ilike(search_term)
    ).limit(10).all()
    
    # Search users
    users = db.query(models.User).filter(
        models.User.name.ilike(search_term) |
        models.User.email.ilike(search_term)
    ).limit(10).all()
    
    return {
        "tickets": [{"ticket_id": t.ticket_id, "inc_number": t.inc_number, "type": t.type, "status": t.status} for t in tickets],
        "sites": [{"site_id": s.site_id, "location": s.location, "brand": s.brand} for s in sites],
        "users": [{"user_id": u.user_id, "name": u.name, "email": u.email} for u in users]
    } 

# SLA Rule Endpoints

@app.post("/sla-rules/", response_model=schemas.SLARuleOut)
def create_sla_rule(rule: schemas.SLARuleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create a new SLA rule"""
    result = crud.create_sla_rule(db=db, rule=rule)
    
    # Create audit log
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="sla_rule_create",
        old_value=None,
        new_value=str(result.rule_id)
    )
    crud.create_ticket_audit(db, audit)
    
    return result

@app.get("/sla-rules/{rule_id}", response_model=schemas.SLARuleOut)
def get_sla_rule(rule_id: str, db: Session = Depends(get_db)):
    """Get a specific SLA rule"""
    rule = crud.get_sla_rule(db, rule_id=rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="SLA rule not found")
    return rule

@app.get("/sla-rules/", response_model=List[schemas.SLARuleOut])
def list_sla_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all SLA rules"""
    return crud.get_sla_rules(db, skip=skip, limit=limit)

@app.put("/sla-rules/{rule_id}", response_model=schemas.SLARuleOut)
def update_sla_rule(rule_id: str, rule: schemas.SLARuleUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Update an SLA rule"""
    result = crud.update_sla_rule(db=db, rule_id=rule_id, rule=rule)
    if not result:
        raise HTTPException(status_code=404, detail="SLA rule not found")
    
    # Create audit log
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="sla_rule_update",
        old_value=str(rule_id),
        new_value=str(rule_id)
    )
    crud.create_ticket_audit(db, audit)
    
    return result

@app.delete("/sla-rules/{rule_id}")
def delete_sla_rule(rule_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete an SLA rule"""
    result = crud.delete_sla_rule(db=db, rule_id=rule_id)
    if not result:
        raise HTTPException(status_code=404, detail="SLA rule not found")
    
    # Create audit log
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="sla_rule_delete",
        old_value=str(rule_id),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    
    return {"message": "SLA rule deleted successfully"}

@app.get("/sla-rules/match")
def get_matching_sla_rule(
    ticket_type: str = None,
    customer_impact: str = None,
    business_priority: str = None,
    db: Session = Depends(get_db)
):
    """Get the matching SLA rule for given criteria"""
    rule = crud.get_matching_sla_rule(
        db=db,
        ticket_type=ticket_type,
        customer_impact=customer_impact,
        business_priority=business_priority
    )
    
    if not rule:
        raise HTTPException(status_code=404, detail="No matching SLA rule found")
    
    return {
        "rule_id": rule.rule_id,
        "name": rule.name,
        "sla_target_hours": rule.sla_target_hours,
        "sla_breach_hours": rule.sla_breach_hours,
        "escalation_levels": rule.escalation_levels
    } 

# Time Entries endpoints
@app.post("/tickets/{ticket_id}/time-entries/", response_model=schemas.TimeEntryOut)
def create_time_entry(
    ticket_id: str, 
    time_entry: schemas.TimeEntryCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Create a new time entry for a ticket"""
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    time_entry_data = time_entry.dict()
    time_entry_data["ticket_id"] = ticket_id
    time_entry_data["user_id"] = current_user.user_id
    
    db_time_entry = crud.create_time_entry(db, time_entry_data)
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"time_entry_created:{ticket_id}"))
    
    return db_time_entry

@app.get("/tickets/{ticket_id}/time-entries/", response_model=List[schemas.TimeEntryOut])
def get_time_entries(
    ticket_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get all time entries for a ticket"""
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return crud.get_time_entries_by_ticket(db, ticket_id)

@app.put("/tickets/{ticket_id}/time-entries/{entry_id}", response_model=schemas.TimeEntryOut)
def update_time_entry(
    ticket_id: str, 
    entry_id: str, 
    time_entry: schemas.TimeEntryUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update a time entry"""
    db_time_entry = crud.get_time_entry(db, entry_id)
    if not db_time_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    if db_time_entry.ticket_id != ticket_id:
        raise HTTPException(status_code=400, detail="Time entry does not belong to this ticket")
    
    updated_entry = crud.update_time_entry(db, entry_id, time_entry.dict(exclude_unset=True))
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"time_entry_updated:{ticket_id}"))
    
    return updated_entry

@app.delete("/tickets/{ticket_id}/time-entries/{entry_id}")
def delete_time_entry(
    ticket_id: str, 
    entry_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Delete a time entry"""
    db_time_entry = crud.get_time_entry(db, entry_id)
    if not db_time_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    if db_time_entry.ticket_id != ticket_id:
        raise HTTPException(status_code=400, detail="Time entry does not belong to this ticket")
    
    crud.delete_time_entry(db, entry_id)
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"time_entry_deleted:{ticket_id}"))
    
    return {"message": "Time entry deleted"}

# Comments endpoints
@app.post("/tickets/{ticket_id}/comments/", response_model=schemas.TicketCommentOut)
def create_comment(
    ticket_id: str, 
    comment: schemas.TicketCommentCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Create a new comment for a ticket"""
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    comment_data = comment.dict()
    comment_data["ticket_id"] = ticket_id
    comment_data["user_id"] = current_user.user_id
    
    db_comment = crud.create_ticket_comment(db, comment_data)
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"comment_created:{ticket_id}"))
    
    return db_comment

@app.get("/tickets/{ticket_id}/comments/", response_model=List[schemas.TicketCommentOut])
def get_comments(
    ticket_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get all comments for a ticket"""
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return crud.get_comments_by_ticket(db, ticket_id)

@app.put("/tickets/{ticket_id}/comments/{comment_id}", response_model=schemas.TicketCommentOut)
def update_comment(
    ticket_id: str, 
    comment_id: str, 
    comment: schemas.TicketCommentUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update a comment"""
    db_comment = crud.get_ticket_comment(db, comment_id)
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if db_comment.ticket_id != ticket_id:
        raise HTTPException(status_code=400, detail="Comment does not belong to this ticket")
    
    updated_comment = crud.update_ticket_comment(db, comment_id, comment.dict(exclude_unset=True))
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"comment_updated:{ticket_id}"))
    
    return updated_comment

@app.delete("/tickets/{ticket_id}/comments/{comment_id}")
def delete_comment(
    ticket_id: str, 
    comment_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Delete a comment"""
    db_comment = crud.get_ticket_comment(db, comment_id)
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if db_comment.ticket_id != ticket_id:
        raise HTTPException(status_code=400, detail="Comment does not belong to this ticket")
    
    crud.delete_ticket_comment(db, comment_id)
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"comment_deleted:{ticket_id}"))
    
    return {"message": "Comment deleted"}

# Enhanced Ticket Operations

@app.put("/tickets/{ticket_id}/claim")
def claim_ticket(
    ticket_id: str,
    claim_data: schemas.TicketClaim,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Claim a ticket for in-house tech work"""
    result = crud.claim_ticket(db, ticket_id, claim_data.claimed_by)
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"ticket_claimed:{ticket_id}"))
    
    return result

@app.put("/tickets/{ticket_id}/check-in")
def check_in_ticket(
    ticket_id: str,
    check_in_data: schemas.TicketCheckIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Check in a field tech for onsite work"""
    result = crud.check_in_ticket(db, ticket_id, check_in_data.onsite_tech_id)
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"ticket_checked_in:{ticket_id}"))
    
    return result

@app.put("/tickets/{ticket_id}/check-out")
def check_out_ticket(
    ticket_id: str,
    check_out_data: schemas.TicketCheckOut,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Check out a field tech from onsite work"""
    result = crud.check_out_ticket(db, ticket_id, check_out_data.dict())
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"ticket_checked_out:{ticket_id}"))
    
    return result

@app.get("/tickets/daily/{date}")
def get_daily_tickets(
    date: date,
    ticket_type: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    assigned_user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get tickets for daily operations dashboard"""
    tickets = crud.get_daily_tickets(
        db, 
        date=date, 
        ticket_type=ticket_type, 
        priority=priority, 
        status=status, 
        assigned_user_id=assigned_user_id
    )
    return tickets

@app.put("/tickets/{ticket_id}/costs")
def update_ticket_costs(
    ticket_id: str,
    cost_data: schemas.TicketCostUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update ticket cost information"""
    result = crud.update_ticket_costs(db, ticket_id, cost_data.dict(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"ticket_costs_updated:{ticket_id}"))
    
    return result

# Site Equipment Endpoints

@app.post("/sites/{site_id}/equipment", response_model=schemas.SiteEquipmentOut)
def create_site_equipment(
    site_id: str,
    equipment: schemas.SiteEquipmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add equipment to a site"""
    equipment.site_id = site_id
    result = crud.create_site_equipment(db, equipment)
    
    # Create audit log
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="site_equipment_create",
        old_value=None,
        new_value=str(result.equipment_id)
    )
    crud.create_ticket_audit(db, audit)
    
    return result

@app.get("/sites/{site_id}/equipment", response_model=List[schemas.SiteEquipmentOut])
def get_site_equipment(
    site_id: str,
    db: Session = Depends(get_db)
):
    """Get all equipment for a site"""
    return crud.get_site_equipment_by_site(db, site_id)

@app.get("/equipment/{equipment_id}", response_model=schemas.SiteEquipmentOut)
def get_equipment(
    equipment_id: str,
    db: Session = Depends(get_db)
):
    """Get specific equipment"""
    equipment = crud.get_site_equipment(db, equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return equipment

@app.put("/equipment/{equipment_id}", response_model=schemas.SiteEquipmentOut)
def update_equipment(
    equipment_id: str,
    equipment: schemas.SiteEquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update equipment"""
    result = crud.update_site_equipment(db, equipment_id, equipment)
    if not result:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Create audit log
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="site_equipment_update",
        old_value=str(equipment_id),
        new_value=str(equipment_id)
    )
    crud.create_ticket_audit(db, audit)
    
    return result

@app.delete("/equipment/{equipment_id}")
def delete_equipment(
    equipment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete equipment"""
    result = crud.delete_site_equipment(db, equipment_id)
    if not result:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Create audit log
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.utcnow(),
        field_changed="site_equipment_delete",
        old_value=str(equipment_id),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    
    return {"message": "Equipment deleted"}

# Ticket Attachment Endpoints

@app.post("/tickets/{ticket_id}/attachments", response_model=schemas.TicketAttachmentOut)
def create_ticket_attachment(
    ticket_id: str,
    attachment: schemas.TicketAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload a file attachment to a ticket"""
    attachment.ticket_id = ticket_id
    attachment.uploaded_by = current_user.user_id
    
    result = crud.create_ticket_attachment(db, attachment)
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"attachment_uploaded:{ticket_id}"))
    
    return result

@app.get("/tickets/{ticket_id}/attachments", response_model=List[schemas.TicketAttachmentOut])
def get_ticket_attachments(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all attachments for a ticket"""
    return crud.get_ticket_attachments(db, ticket_id)

@app.get("/attachments/{attachment_id}", response_model=schemas.TicketAttachmentOut)
def get_attachment(
    attachment_id: str,
    db: Session = Depends(get_db)
):
    """Get specific attachment"""
    attachment = crud.get_ticket_attachment(db, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return attachment

@app.put("/attachments/{attachment_id}", response_model=schemas.TicketAttachmentOut)
def update_attachment(
    attachment_id: str,
    attachment: schemas.TicketAttachmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update attachment"""
    result = crud.update_ticket_attachment(db, attachment_id, attachment)
    if not result:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"attachment_updated:{result.ticket_id}"))
    
    return result

@app.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete attachment"""
    attachment = crud.get_ticket_attachment(db, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    result = crud.delete_ticket_attachment(db, attachment_id)
    
    # Broadcast update
    asyncio.create_task(manager.broadcast(f"attachment_deleted:{attachment.ticket_id}"))
    
    return {"message": "Attachment deleted"}
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.post("/")
def create_inventory_item(
    data: schemas.InventoryItemCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new inventory item"""
    result = crud.create_inventory_item(db=db, item=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="inventory_create",
        old_value=None,
        new_value=str(result.item_id if hasattr(result, 'item_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"inventory","action":"create"}')
    return result

@router.get("/{item_id}")
def get_inventory_item(
    item_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific inventory item by ID"""
    db_item = crud.get_inventory_item(db, item_id=item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return db_item

@router.get("/")
def list_inventory_items(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all inventory items with pagination"""
    return crud.get_inventory_items(db, skip=skip, limit=limit)

@router.put("/{item_id}")
def update_inventory_item(
    item_id: str, 
    data: schemas.InventoryItemCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update an inventory item"""
    result = crud.update_inventory_item(db, item_id=item_id, item=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="inventory_update",
        old_value=None,
        new_value=str(result.item_id if hasattr(result, 'item_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@router.get("/{item_id}/transactions")
def get_item_transactions(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all transactions for an inventory item"""
    # Verify item exists
    item = crud.get_inventory_item(db, item_id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    # Get transactions
    transactions = crud.get_transactions_by_item(db, item_id=item_id)
    return transactions

@router.post("/scan")
def scan_inventory_item(
    scan_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Scan barcode to find inventory item"""
    barcode = scan_data.get('barcode')
    if not barcode:
        raise HTTPException(status_code=400, detail="Barcode required")
    
    # Find item by barcode
    item = crud.get_inventory_item_by_barcode(db, barcode=barcode)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found with this barcode")
    
    return item

@router.delete("/{item_id}")
def delete_inventory_item(
    item_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Delete an inventory item"""
    result = crud.delete_inventory_item(db, item_id=item_id)
    if not result:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return {"success": True, "message": "Inventory item deleted successfully"}


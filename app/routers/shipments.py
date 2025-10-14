from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/shipments", tags=["shipments"])

@router.post("/")
def create_shipment(
    data: schemas.ShipmentCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new shipment"""
    result = crud.create_shipment(db=db, shipment=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="shipments_create",
        old_value=None,
        new_value=str(result.shipment_id if hasattr(result, 'shipment_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"shipments","action":"create"}')
    return result

@router.get("/{shipment_id}")
def get_shipment(
    shipment_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific shipment by ID"""
    db_item = crud.get_shipment(db, shipment_id=shipment_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return db_item

@router.get("/")
def list_shipments(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all shipments with pagination"""
    return crud.get_shipments(db, skip=skip, limit=limit)

@router.put("/{shipment_id}")
def update_shipment(
    shipment_id: str, 
    data: schemas.ShipmentCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update a shipment"""
    result = crud.update_shipment(db, shipment_id=shipment_id, shipment=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="shipments_update",
        old_value=None,
        new_value=str(result.shipment_id if hasattr(result, 'shipment_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@router.patch("/{shipment_id}/status")
def update_shipment_status(
    shipment_id: str,
    status_data: schemas.ShipmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update shipment status"""
    shipment = crud.get_shipment(db, shipment_id=shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Update status and tracking info
    if status_data.status:
        shipment.status = status_data.status
    if status_data.tracking_number:
        shipment.tracking_number = status_data.tracking_number
    if status_data.return_tracking:
        shipment.return_tracking = status_data.return_tracking
    
    # Set date_shipped if status is 'shipped' and not already set
    if status_data.status == 'shipped' and not shipment.date_shipped:
        from datetime import datetime, timezone
        shipment.date_shipped = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(shipment)
    
    return shipment

@router.delete("/{shipment_id}")
def delete_shipment(
    shipment_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Delete a shipment"""
    result = crud.delete_shipment(db, shipment_id=shipment_id)
    if not result:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return {"success": True, "message": "Shipment deleted successfully"}


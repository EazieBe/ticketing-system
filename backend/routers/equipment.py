from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/equipment", tags=["equipment"])

@router.post("/")
def create_equipment(
    data: schemas.EquipmentCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new equipment item"""
    result = crud.create_equipment(db=db, data=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="equipment_create",
        old_value=None,
        new_value=str(result.equipment_id if hasattr(result, 'equipment_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"equipment","action":"create"}')
    return result

@router.get("/{equipment_id}")
def get_equipment(
    equipment_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific equipment item by ID"""
    db_item = crud.get_equipment(db, equipment_id=equipment_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_item

@router.get("/")
def list_equipment(
    skip: int = 0, 
    limit: int = 100,
    site_id: str = None,
    equipment_type: str = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all equipment with pagination and optional filtering by site_id or equipment_type"""
    return crud.get_equipments(db, skip=skip, limit=limit, site_id=site_id, equipment_type=equipment_type)

@router.put("/{equipment_id}")
def update_equipment(
    equipment_id: str, 
    data: schemas.EquipmentCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Update an equipment item"""
    result = crud.update_equipment(db, equipment_id=equipment_id, data=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="equipment_update",
        old_value=None,
        new_value=str(result.equipment_id if hasattr(result, 'equipment_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"equipment","action":"update"}')
    
    return result

@router.delete("/{equipment_id}")
def delete_equipment(
    equipment_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value, models.UserRole.dispatcher.value])),
    background_tasks: BackgroundTasks = None
):
    """Delete an equipment item"""
    result = crud.delete_equipment(db, equipment_id=equipment_id)
    if not result:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"equipment","action":"delete"}')
    
    return {"success": True, "message": "Equipment deleted successfully"}


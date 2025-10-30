from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/fieldtechs", tags=["fieldtechs"])

@router.post("/")
def create_field_tech(
    data: schemas.FieldTechCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new field tech"""
    result = crud.create_field_tech(db=db, tech=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="field_tech_create",
        old_value=None,
        new_value=str(result.field_tech_id if hasattr(result, 'field_tech_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"field_tech","action":"create"}')
    return result

@router.get("/{field_tech_id}")
def get_field_tech(
    field_tech_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific field tech by ID"""
    db_item = crud.get_field_tech(db, field_tech_id=field_tech_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Field tech not found")
    return db_item

@router.get("/")
def list_field_techs(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all field techs with pagination"""
    return crud.get_field_techs(db, skip=skip, limit=limit)

@router.put("/{field_tech_id}")
def update_field_tech(
    field_tech_id: str, 
    data: schemas.FieldTechCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Update a field tech"""
    result = crud.update_field_tech(db, field_tech_id=field_tech_id, tech=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="field_tech_update",
        old_value=None,
        new_value=str(result.field_tech_id if hasattr(result, 'field_tech_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"field_tech","action":"update"}')
    
    return result

@router.delete("/{field_tech_id}")
def delete_field_tech(
    field_tech_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value, models.UserRole.dispatcher.value])),
    background_tasks: BackgroundTasks = None
):
    """Delete a field tech"""
    result = crud.delete_field_tech(db, field_tech_id=field_tech_id)
    if not result:
        raise HTTPException(status_code=404, detail="Field tech not found")
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"field_tech","action":"delete"}')
    
    return {"success": True, "message": "Field tech deleted successfully"}


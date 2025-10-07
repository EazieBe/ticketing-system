from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/sla", tags=["sla"])

@router.post("/rules")
def create_sla_rule(
    data: schemas.SLARuleCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new SLA rule"""
    result = crud.create_sla(db=db, data=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="sla_create",
        old_value=None,
        new_value=str(result.sla_id if hasattr(result, 'sla_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"sla","action":"create"}')
    return result

@router.get("/rules/{rule_id}")
def get_sla_rule(
    sla_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific SLA rule by ID"""
    db_item = crud.get_sla(db, sla_id=sla_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Sla not found")
    return db_item

@router.get("/rules")
def list_sla_rules(
    sla_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all SLA rules with pagination"""
    db_item = crud.get_sla(db, sla_id=sla_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Sla not found")
    return db_item

@router.put("/rules/{rule_id}")
def update_sla_rule(
    sla_id: str, 
    data: schemas.SLARuleCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update an SLA rule"""
    result = crud.update_sla(db, sla_id=sla_id, data=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="sla_update",
        old_value=None,
        new_value=str(result.sla_id if hasattr(result, 'sla_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@router.delete("/rules/{rule_id}")
def delete_sla_rule(
    sla_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Delete an SLA rule"""
    result = crud.delete_sla(db, sla_id=sla_id)
    if not result:
        raise HTTPException(status_code=404, detail="Sla not found")
    return {"success": True, "message": "Sla deleted successfully"}


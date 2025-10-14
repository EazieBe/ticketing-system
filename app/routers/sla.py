from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/sla", tags=["sla"])

@router.post("/")
def create_sla_rule(
    data: schemas.SLARuleCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new SLA rule"""
    result = crud.create_sla_rule(db=db, rule=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="sla_rule_create",
        old_value=None,
        new_value=str(result.rule_id if hasattr(result, 'rule_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"sla","action":"create"}')
    return result

@router.get("/{rule_id}")
def get_sla_rule(
    rule_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific SLA rule by ID"""
    db_item = crud.get_sla_rule(db, rule_id=rule_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="SLA rule not found")
    return db_item

@router.get("/")
def list_sla_rules(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all SLA rules with pagination"""
    return crud.get_sla_rules(db, skip=skip, limit=limit)

@router.put("/{rule_id}")
def update_sla_rule(
    rule_id: str, 
    data: schemas.SLARuleUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update an SLA rule"""
    result = crud.update_sla_rule(db, rule_id=rule_id, rule=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="sla_rule_update",
        old_value=None,
        new_value=str(result.rule_id if hasattr(result, 'rule_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@router.delete("/{rule_id}")
def delete_sla_rule(
    rule_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Delete an SLA rule"""
    result = crud.delete_sla_rule(db, rule_id=rule_id)
    if not result:
        raise HTTPException(status_code=404, detail="SLA rule not found")
    return {"success": True, "message": "SLA rule deleted successfully"}


from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/")
def create_task(
    data: schemas.TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new task"""
    result = crud.create_task(db=db, task=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="task_create",
        old_value=None,
        new_value=str(result.task_id if hasattr(result, 'task_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"tasks","action":"create"}')
    return result

@router.get("/{task_id}")
def get_task(
    task_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific task by ID"""
    db_item = crud.get_task(db, task_id=task_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_item

@router.get("/")
def list_tasks(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all tasks with pagination"""
    return crud.get_tasks(db, skip=skip, limit=limit)

@router.put("/{task_id}")
def update_task(
    task_id: str, 
    data: schemas.TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update a task"""
    result = crud.update_task(db, task_id=task_id, task=data)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="task_update",
        old_value=None,
        new_value=str(result.task_id if hasattr(result, 'task_id') else result.id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@router.delete("/{task_id}")
def delete_task(
    task_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Delete a task"""
    result = crud.delete_task(db, task_id=task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "message": "Task deleted successfully"}


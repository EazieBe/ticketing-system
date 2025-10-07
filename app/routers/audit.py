from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/")
def get_audit_logs(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get audit logs with filtering"""
    return crud.get_audits(db, skip=skip, limit=limit)

@router.get("/{audit_id}")
def get_audit_log(
    audit_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific audit log entry"""
    db_item = crud.get_audit(db, audit_id=audit_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Audit not found")
    return db_item


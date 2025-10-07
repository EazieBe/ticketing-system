from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/sites", tags=["sites"])

@router.post("/", response_model=schemas.SiteOut)
def create_site(
    site: schemas.SiteCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new site"""
    result = crud.create_site(db=db, site=site)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="site_create",
        old_value=None,
        new_value=str(result.site_id)
    )
    crud.create_ticket_audit(db, audit)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"site","action":"create"}')
    return result

@router.get("/{site_id}", response_model=schemas.SiteOut)
def get_site(
    site_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific site by ID"""
    db_site = crud.get_site(db, site_id=site_id)
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    return db_site

@router.get("/", response_model=List[schemas.SiteOut])
def list_sites(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all sites with pagination"""
    return crud.get_sites(db, skip=skip, limit=limit)

@router.put("/{site_id}", response_model=schemas.SiteOut)
def update_site(
    site_id: str, 
    site: schemas.SiteCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update a site"""
    result = crud.update_site(db, site_id=site_id, site=site)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="site_update",
        old_value=None,
        new_value=str(result.site_id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@router.delete("/{site_id}")
def delete_site(
    site_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Delete a site"""
    result = crud.delete_site(db, site_id=site_id)
    if not result:
        raise HTTPException(status_code=404, detail="Site not found")
    return {"success": True, "message": "Site deleted successfully"}

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _as_ticket_status, _as_role
from utils.main_utils import _enqueue_broadcast

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.post("/", response_model=schemas.TicketOut)
def create_ticket(
    ticket: schemas.TicketCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new ticket"""
    result = crud.create_ticket(db=db, ticket=ticket)
    
    # Create audit log for ticket creation
    audit = schemas.TicketAuditCreate(
        ticket_id=result.ticket_id,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="ticket_create",
        old_value=None,
        new_value=f"Ticket {result.ticket_id} created"
    )
    crud.create_ticket_audit(db, audit)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"create"}')
    return result

@router.get("/{ticket_id}", response_model=schemas.TicketOut)
def get_ticket(
    ticket_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific ticket by ID"""
    db_ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket

@router.get("/", response_model=List[schemas.TicketOut])
def list_tickets(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all tickets with pagination"""
    return crud.get_tickets(db, skip=skip, limit=limit)

@router.put("/{ticket_id}", response_model=schemas.TicketOut)
def update_ticket(
    ticket_id: str, 
    ticket: schemas.TicketUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Update a ticket"""
    prev_ticket = crud.get_ticket(db, ticket_id)
    if not prev_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status is not None:
        requested = _as_ticket_status(ticket.status)
        prev = _as_ticket_status(prev_ticket.status)
        new_status = requested
        if requested == schemas.TicketStatus.closed and _as_role(current_user.role) not in (models.UserRole.admin, models.UserRole.dispatcher):
            new_status = schemas.TicketStatus.pending
        ticket.status = new_status.value  # store value consistently as string

    # metadata
    ticket.last_updated_by = current_user.user_id
    ticket.last_updated_at = datetime.now(timezone.utc)
    
    result = crud.update_ticket(db, ticket_id=ticket_id, ticket=ticket)
    
    # Audit comparisons
    if ticket.status is not None and not (prev_ticket.status == ticket.status):
        audit_log(db, current_user.user_id, "status", prev_ticket.status, ticket.status, ticket_id)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"update"}')
    return result

@router.patch("/{ticket_id}/status", response_model=schemas.TicketOut)
def update_ticket_status(
    ticket_id: str, 
    status_update: schemas.StatusUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Quick endpoint for status changes only"""
    prev_ticket = crud.get_ticket(db, ticket_id)
    
    if not prev_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Handle status change logic
    requested = _as_ticket_status(status_update.status)
    is_admin_or_dispatcher = _as_role(current_user.role) in (models.UserRole.admin, models.UserRole.dispatcher)
    new_status = requested if not (requested == schemas.TicketStatus.closed and not is_admin_or_dispatcher) else schemas.TicketStatus.pending

    ticket_update = schemas.TicketUpdate(
        status=new_status.value,
        last_updated_by=current_user.user_id,
        last_updated_at=datetime.now(timezone.utc),
    )
    
    result = crud.update_ticket(db, ticket_id=ticket_id, ticket=ticket_update)
    
    # Audit log
    if prev_ticket.status != new_status:
        audit_log(db, current_user.user_id, "status", prev_ticket.status, new_status, ticket_id)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"update"}')
    return result

@router.post("/{ticket_id}/approve")
def approve_ticket(
    ticket_id: str, 
    approve: bool, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value, models.UserRole.dispatcher.value]))
):
    """Approve or reject a ticket"""
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if _as_ticket_status(ticket.status) != schemas.TicketStatus.closed:
        raise HTTPException(status_code=400, detail="Ticket is not closed and ready for approval")

    prev_status = _as_ticket_status(ticket.status)
    ticket.status = (schemas.TicketStatus.approved if approve else schemas.TicketStatus.in_progress).value
    db.commit()
    db.refresh(ticket)
    # Audit log
    audit_log(db, current_user.user_id, "approval", prev_status, ticket.status, ticket_id)
    _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"approval"}')
    return ticket

@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Delete a ticket"""
    result = crud.delete_ticket(db, ticket_id=ticket_id)
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"delete"}')
    return result

@router.get("/daily/{date_str}")
def get_daily_tickets(
    date_str: str,
    ticket_type: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    assigned_user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get tickets for daily operations dashboard"""
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    tickets = crud.get_daily_tickets(
        db, 
        date=date_obj, 
        ticket_type=ticket_type, 
        priority=priority, 
        status=status, 
        assigned_user_id=assigned_user_id
    )
    return tickets

@router.put("/{ticket_id}/costs")
def update_ticket_costs(
    ticket_id: str,
    cost_data: schemas.TicketCostUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Update ticket cost information"""
    result = crud.update_ticket_costs(db, ticket_id, cost_data.dict(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Broadcast update
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"costs_updated"}')
    
    return result

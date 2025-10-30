from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _as_ticket_status, _as_role
from utils.main_utils import _enqueue_broadcast

router = APIRouter(prefix="/tickets", tags=["tickets"])

# Ensure datetime fields are timezone-aware (UTC) before serialization
def _normalize_ticket_dt(t: models.Ticket):
    if not t:
        return t
    from datetime import timezone as _tz
    for field in ("created_at", "claimed_at", "check_in_time", "check_out_time", "end_time", "approved_at"):
        val = getattr(t, field, None)
        if val is not None and getattr(val, 'tzinfo', None) is None:
            try:
                setattr(t, field, val.replace(tzinfo=_tz.utc))
            except Exception:
                pass
    return t

@router.get("/count")
def tickets_count(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_user_id: Optional[str] = None,
    site_id: Optional[str] = None,
    ticket_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    response: Response = None
):
    count = crud.count_tickets(
        db,
        status=status,
        priority=priority,
        assigned_user_id=assigned_user_id,
        site_id=site_id,
        ticket_type=ticket_type,
        search=search,
    )
    if response is not None:
        response.headers["Cache-Control"] = "public, max-age=15"
    return {"count": count}

@router.post("/", response_model=schemas.TicketOut)
def create_ticket(
    ticket: schemas.TicketCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user), 
    background_tasks: BackgroundTasks = None
):
    """Create a new ticket"""
    # Wrap to return cleaner errors
    try:
        result = crud.create_ticket(db=db, ticket=ticket)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not create ticket: {str(e)}")
    
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
    return _normalize_ticket_dt(result)

@router.get("/", response_model=List[schemas.TicketOut])
def list_tickets(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_user_id: Optional[str] = None,
    site_id: Optional[str] = None,
    ticket_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List tickets with pagination and filters"""
    tickets = crud.get_tickets(
        db,
        skip=skip,
        limit=limit,
        status=status,
        priority=priority,
        assigned_user_id=assigned_user_id,
        site_id=site_id,
        ticket_type=ticket_type,
        search=search,
    )
    return [_normalize_ticket_dt(t) for t in tickets]

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
    return _normalize_ticket_dt(db_ticket)

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

    # RBAC: Only admin/dispatcher or assigned/claimer can update
    user_role = _as_role(current_user.role)
    is_admin_or_dispatcher = user_role in (models.UserRole.admin, models.UserRole.dispatcher)
    is_assigned = prev_ticket.assigned_user_id == current_user.user_id
    is_claimer = (getattr(prev_ticket, 'claimed_by', None) == current_user.user_id)
    if not (is_admin_or_dispatcher or is_assigned or is_claimer):
        raise HTTPException(status_code=403, detail="Not authorized to update this ticket")

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
    
    try:
        result = crud.update_ticket(db, ticket_id=ticket_id, ticket=ticket)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not update ticket: {str(e)}")
    
    # Audit comparisons
    if ticket.status is not None and not (prev_ticket.status == ticket.status):
        audit_log(db, current_user.user_id, "status", prev_ticket.status, ticket.status, ticket_id)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"update"}')
    return _normalize_ticket_dt(result)

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
    
    try:
        result = crud.update_ticket(db, ticket_id=ticket_id, ticket=ticket_update)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not update status: {str(e)}")
    
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
    background_tasks: BackgroundTasks = None, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value, models.UserRole.dispatcher.value]))
):
    """Approve or reject a ticket"""
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    current = _as_ticket_status(ticket.status)
    if current not in (schemas.TicketStatus.completed, schemas.TicketStatus.closed):
        raise HTTPException(status_code=400, detail="Ticket must be completed or closed before approval")

    from datetime import datetime, timezone
    prev_status = _as_ticket_status(ticket.status)
    ticket.status = (schemas.TicketStatus.archived if approve else schemas.TicketStatus.in_progress).value
    ticket.approved_by = current_user.user_id if approve else None
    ticket.approved_at = datetime.now(timezone.utc) if approve else None
    db.commit()
    db.refresh(ticket)
    # Audit log
    audit_log(db, current_user.user_id, "approval", prev_status, ticket.status, ticket_id)
    _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"approval"}')
    return _normalize_ticket_dt(ticket)

@router.put("/{ticket_id}/claim")
def claim_ticket(
    ticket_id: str,
    claim_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Claim a ticket (for in-house technicians)"""
    ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Update ticket with claim info - auto-assign to claiming user
    from datetime import datetime, timezone
    ticket.claimed_by = claim_data.get('claimed_by', current_user.user_id)
    ticket.claimed_at = datetime.now(timezone.utc)
    ticket.assigned_user_id = current_user.user_id  # Auto-assign to claimer
    # Start timer on claim if not already started
    if not getattr(ticket, 'start_time', None):
        ticket.start_time = datetime.now(timezone.utc)
    ticket.status = models.TicketStatus.in_progress.value
    
    db.commit()
    db.refresh(ticket)
    
    # Audit log
    audit_log(db, current_user.user_id, "claimed", None, ticket.claimed_by, ticket_id)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"claimed"}')
    
    return _normalize_ticket_dt(ticket)

@router.put("/{ticket_id}/complete")
def complete_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Complete a ticket: stop timer and compute time_spent."""
    ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Permissions: admin/dispatcher or assigned/claimer can complete
    user_role = _as_role(current_user.role)
    is_admin_or_dispatcher = user_role in (models.UserRole.admin, models.UserRole.dispatcher)
    is_assigned = ticket.assigned_user_id == current_user.user_id
    is_claimer = (getattr(ticket, 'claimed_by', None) == current_user.user_id)
    if not (is_admin_or_dispatcher or is_assigned or is_claimer):
        raise HTTPException(status_code=403, detail="Not authorized to complete this ticket")

    # Stop timer and compute duration (minutes)
    from datetime import timezone as _tz
    now = datetime.now(_tz.utc)
    ticket.end_time = now
    start = getattr(ticket, 'start_time', None) or getattr(ticket, 'claimed_at', None) or getattr(ticket, 'check_in_time', None) or getattr(ticket, 'created_at', None)
    if start is not None:
        # Ensure both aware
        if getattr(start, 'tzinfo', None) is None:
            start = start.replace(tzinfo=_tz.utc)
        duration = now - start
        import math
        seconds = max(0, int(duration.total_seconds()))
        minutes = max(1, math.ceil(seconds / 60)) if seconds > 0 else 0
        ticket.time_spent = minutes

    prev_status = ticket.status
    ticket.status = models.TicketStatus.completed.value

    db.commit()
    db.refresh(ticket)

    # Create a time entry for billing based on computed duration
    if ticket.time_spent and ticket.time_spent > 0:
        try:
            entry_dict = {
                'ticket_id': ticket.ticket_id,
                'user_id': current_user.user_id,
                'start_time': start,
                'end_time': now,
                'duration_minutes': ticket.time_spent,
                'description': 'Auto: work duration from claim to complete',
                'is_billable': True,
            }
            crud.create_time_entry(db, entry_dict)
        except Exception:
            pass

    # Audit log
    audit_log(db, current_user.user_id, "status", prev_status, ticket.status, ticket_id)

    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"complete"}')

    return _normalize_ticket_dt(ticket)

@router.put("/{ticket_id}/check-in")
def check_in_ticket(
    ticket_id: str,
    check_in_data: dict = Body(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Field tech check-in at site"""
    ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Update ticket with check-in info
    from datetime import datetime, timezone
    ticket.check_in_time = datetime.now(timezone.utc)
    ticket.status = models.TicketStatus.checked_in.value
    
    db.commit()
    db.refresh(ticket)
    
    # Audit log
    audit_log(db, current_user.user_id, "check_in", None, str(ticket.check_in_time), ticket_id)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"check_in"}')
    
    return ticket

@router.put("/{ticket_id}/check-out")
def check_out_ticket(
    ticket_id: str,
    check_out_data: dict = Body(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Field tech check-out from site"""
    ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Update ticket with check-out info
    from datetime import datetime, timezone
    ticket.check_out_time = datetime.now(timezone.utc)
    
    # Calculate onsite duration if check-in exists
    if ticket.check_in_time:
        # Ensure both datetimes are timezone-aware for comparison
        check_in = ticket.check_in_time
        if check_in.tzinfo is None:
            # Make timezone-naive datetime aware (assume UTC)
            check_in = check_in.replace(tzinfo=timezone.utc)
        
        duration = ticket.check_out_time - check_in
        ticket.onsite_duration_minutes = int(duration.total_seconds() / 60)
    
    ticket.status = models.TicketStatus.completed.value
    
    db.commit()
    db.refresh(ticket)
    
    # Audit log
    audit_log(db, current_user.user_id, "check_out", None, str(ticket.check_out_time), ticket_id)
    
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"check_out"}')
    
    return ticket

@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value, models.UserRole.dispatcher.value])), 
    background_tasks: BackgroundTasks = None
):
    """Delete a ticket"""
    try:
        result = crud.delete_ticket(db, ticket_id=ticket_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not delete ticket: {str(e)}")
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"delete"}')
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"success": True, "message": "Ticket deleted"}

# ============================
# Bulk operations
# ============================

@router.post("/bulk/status", response_model=List[schemas.TicketOut])
def bulk_update_ticket_status(
    payload: schemas.BulkTicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Bulk update status for multiple tickets"""
    updated: List[models.Ticket] = []
    user_role = _as_role(current_user.role)
    is_admin_or_dispatcher = user_role in (models.UserRole.admin, models.UserRole.dispatcher)

    requested = _as_ticket_status(payload.status)
    for tid in payload.ticket_ids:
        t = crud.get_ticket(db, tid)
        if not t:
            continue
        # Permission: same as single update - only admin/dispatcher can close
        new_status = requested if not (requested == schemas.TicketStatus.closed and not is_admin_or_dispatcher) else schemas.TicketStatus.pending
        ticket_update = schemas.TicketUpdate(
            status=new_status.value,
            last_updated_by=current_user.user_id,
            last_updated_at=datetime.now(timezone.utc),
        )
        try:
            res = crud.update_ticket(db, ticket_id=tid, ticket=ticket_update)
        except Exception:
            res = None
        if res:
            if getattr(t, 'status', None) != new_status.value:
                audit_log(db, current_user.user_id, "status", getattr(t, 'status', None), new_status, tid)
            updated.append(res)

    if background_tasks and updated:
        _enqueue_broadcast(background_tasks, '{"type":"ticket","action":"bulk_status"}')
    return updated

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

# ============================================================================
# COMMENTS ENDPOINTS
# ============================================================================

@router.get("/{ticket_id}/comments")
def get_ticket_comments(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all comments for a ticket"""
    # Verify ticket exists
    ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    comments = crud.get_comments_by_ticket(db, ticket_id=ticket_id)
    return comments

@router.post("/{ticket_id}/comments")
def create_comment(
    ticket_id: str,
    comment_data: schemas.TicketCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Create a comment on a ticket"""
    # Verify ticket exists
    ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Create comment with user info
    comment_dict = comment_data.dict()
    comment_dict['ticket_id'] = ticket_id
    comment_dict['user_id'] = current_user.user_id
    
    result = crud.create_ticket_comment(db, comment_dict)
    
    # Broadcast update
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"comment","action":"create"}')
    
    return result

@router.put("/{ticket_id}/comments/{comment_id}")
def update_comment(
    ticket_id: str,
    comment_id: str,
    comment_data: schemas.TicketCommentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Update a comment"""
    # Verify comment exists and belongs to ticket
    comment = crud.get_ticket_comment(db, comment_id=comment_id)
    if not comment or comment.ticket_id != ticket_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only allow user to edit their own comments (or admin)
    if comment.user_id != current_user.user_id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")
    
    result = crud.update_ticket_comment(db, comment_id=comment_id, comment_data=comment_data.dict(exclude_unset=True))
    
    # Broadcast update
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"comment","action":"update"}')
    
    return result

@router.delete("/{ticket_id}/comments/{comment_id}")
def delete_comment(
    ticket_id: str,
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Delete a comment"""
    # Verify comment exists and belongs to ticket
    comment = crud.get_ticket_comment(db, comment_id=comment_id)
    if not comment or comment.ticket_id != ticket_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only allow user to delete their own comments (or admin)
    if comment.user_id != current_user.user_id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    crud.delete_ticket_comment(db, comment_id=comment_id)
    
    # Broadcast update
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"comment","action":"delete"}')
    
    return {"success": True, "message": "Comment deleted successfully"}

# ============================================================================
# TIME ENTRIES ENDPOINTS
# ============================================================================

@router.get("/{ticket_id}/time-entries/")
def get_ticket_time_entries(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all time entries for a ticket"""
    # Verify ticket exists
    ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    time_entries = crud.get_time_entries_by_ticket(db, ticket_id=ticket_id)
    return time_entries

@router.post("/{ticket_id}/time-entries/")
def create_time_entry(
    ticket_id: str,
    entry_data: schemas.TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Create a time entry for a ticket"""
    # Verify ticket exists
    ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Create time entry with user and ticket info
    entry_dict = entry_data.dict()
    entry_dict['ticket_id'] = ticket_id
    entry_dict['user_id'] = current_user.user_id
    
    result = crud.create_time_entry(db, entry_dict)
    
    # Broadcast update
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"time_entry","action":"create"}')
    
    return result

@router.put("/{ticket_id}/time-entries/{entry_id}")
def update_time_entry(
    ticket_id: str,
    entry_id: str,
    entry_data: schemas.TimeEntryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Update a time entry"""
    # Verify time entry exists and belongs to ticket
    entry = crud.get_time_entry(db, entry_id=entry_id)
    if not entry or entry.ticket_id != ticket_id:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    # Only allow user to edit their own entries (or admin)
    if entry.user_id != current_user.user_id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this time entry")
    
    result = crud.update_time_entry(db, entry_id=entry_id, time_entry_data=entry_data.dict(exclude_unset=True))
    
    # Broadcast update
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"time_entry","action":"update"}')
    
    return result

@router.delete("/{ticket_id}/time-entries/{entry_id}")
def delete_time_entry(
    ticket_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """Delete a time entry"""
    # Verify time entry exists and belongs to ticket
    entry = crud.get_time_entry(db, entry_id=entry_id)
    if not entry or entry.ticket_id != ticket_id:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    # Only allow user to delete their own entries (or admin)
    if entry.user_id != current_user.user_id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this time entry")
    
    crud.delete_time_entry(db, entry_id=entry_id)
    
    # Broadcast update
    if background_tasks:
        _enqueue_broadcast(background_tasks, '{"type":"time_entry","action":"delete"}')
    
    return {"success": True, "message": "Time entry deleted successfully"}

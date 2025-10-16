from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from main import get_current_user, require_role, audit_log, generate_temp_password, get_password_hash

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=schemas.UserOut)
def create_user(
    user: schemas.AdminUserCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value]))
):
    """Create a new user (admin only)"""
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Use provided password if present; otherwise generate a temporary one
    temp_password = None
    if user.password:
        hashed_password = get_password_hash(user.password)
        must_change_password = user.must_change_password if hasattr(user, 'must_change_password') and user.must_change_password is not None else False
    else:
        temp_password = generate_temp_password()
        hashed_password = get_password_hash(temp_password)
        must_change_password = True

    # Create user data with proper password handling
    user_data = user.dict()
    user_data['hashed_password'] = hashed_password
    user_data['preferences'] = user_data.get('preferences') or "{}"  # Ensure non-null TEXT
    user_data['must_change_password'] = must_change_password
    
    # Create proper AdminUserCreate object
    admin_user = schemas.AdminUserCreate(**user_data)
    
    result = crud.create_user(db=db, user=admin_user)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="user_create",
        old_value=None,
        new_value=str(result.user_id)
    )
    crud.create_ticket_audit(db, audit)
    
    # Return temp password in response only if generated
    out_dict = {
        "user_id": result.user_id,
        "name": result.name,
        "email": result.email,
        "role": result.role,
        "phone": result.phone,
        "preferences": result.preferences,
        "must_change_password": result.must_change_password,
        **({"temp_password": temp_password} if temp_password else {})
    }
    return out_dict

@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific user by ID"""
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.get("/", response_model=List[schemas.UserOut])
def list_users(
    skip: int = 0, 
    limit: int = 100,
    email: str = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value]))
):
    """List all users with pagination and optional email filter (admin only)"""
    # If email filter is provided, return matching user
    if email:
        user = crud.get_user_by_email(db, email=email)
        return [user] if user else []
    return crud.get_users(db, skip=skip, limit=limit)

@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: str, 
    user: schemas.UserCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value]))
):
    """Update a user (admin only)"""
    result = crud.update_user(db, user_id=user_id, user=user)
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="user_update",
        old_value=None,
        new_value=str(result.user_id)
    )
    crud.create_ticket_audit(db, audit)
    return result

@router.delete("/{user_id}")
def delete_user(
    user_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value]))
):
    """Delete a user (admin only)"""
    result = crud.delete_user(db, user_id=user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    audit = schemas.TicketAuditCreate(
        ticket_id=None,
        user_id=current_user.user_id,
        change_time=datetime.now(timezone.utc),
        field_changed="user_delete",
        old_value=str(user_id),
        new_value=None
    )
    crud.create_ticket_audit(db, audit)
    return {"success": True, "message": "User deleted successfully"}

@router.post("/{user_id}/change_password")
def change_password(
    user_id: str, 
    password_data: dict = Body(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Change user password"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to change this password")
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = password_data.get("new_password")
    if not new_password:
        raise HTTPException(status_code=400, detail="new_password is required")
    
    db_user.hashed_password = get_password_hash(new_password)
    db_user.must_change_password = False
    db.commit()
    db.refresh(db_user)
    return {"success": True}

@router.post("/{user_id}/reset_password")
def reset_password(
    user_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value]))
):
    """Reset user password (admin only)"""
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    temp_password = generate_temp_password()
    db_user.hashed_password = get_password_hash(temp_password)
    db_user.must_change_password = True
    db.commit()
    db.refresh(db_user)
    return {"success": True, "temp_password": temp_password}

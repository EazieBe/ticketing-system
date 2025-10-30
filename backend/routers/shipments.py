from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

import models, schemas, crud
from database import get_db
from utils.main_utils import get_current_user, require_role, audit_log, _enqueue_broadcast

router = APIRouter(prefix="/shipments", tags=["shipments"])

def create_shipment_data_from_request(data: schemas.ShipmentWithItemsCreate) -> schemas.ShipmentCreate:
    """Consolidated function to create ShipmentCreate from ShipmentWithItemsCreate"""
    return schemas.ShipmentCreate(
        site_id=data.site_id,
        ticket_id=data.ticket_id,
        item_id=data.items[0].item_id if data.items else None,  # For backward compatibility
        what_is_being_shipped=data.what_is_being_shipped,
        shipping_preference=data.shipping_preference,
        charges_out=data.charges_out,
        charges_in=data.charges_in,
        tracking_number=data.tracking_number,
        return_tracking=data.return_tracking,
        date_shipped=data.date_shipped,
        date_returned=data.date_returned,
        notes=data.notes,
        source_ticket_type=data.source_ticket_type,
        shipping_priority=data.shipping_priority,
        parts_cost=data.parts_cost,
        total_cost=data.total_cost,
        status=data.status,
        quantity=data.quantity,
        archived=data.archived,
        remove_from_inventory=data.remove_from_inventory
    )

@router.post("/test-auth")
def test_shipment_creation_with_auth(
    data: schemas.ShipmentWithItemsCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Test endpoint with authentication to debug the issue"""
    # Create the base shipment
    shipment_data = schemas.ShipmentCreate(
        site_id=data.site_id,
        what_is_being_shipped=data.what_is_being_shipped,
        status='pending'
    )
    
    result = crud.create_shipment(db=db, shipment=shipment_data)
    
    # Broadcast the update
    _enqueue_broadcast(background_tasks, '{"type":"shipment","action":"create"}')
    
    return {"shipment_id": result.shipment_id, "message": "Test auth shipment created"}

@router.post("/test")
def test_shipment_creation(
    data: schemas.ShipmentWithItemsCreate, 
    db: Session = Depends(get_db)
):
    """Test endpoint without authentication to isolate performance issue"""
    import time
    start_time = time.time()
    
    # Create the base shipment
    shipment_data = schemas.ShipmentCreate(
        site_id=data.site_id,
        what_is_being_shipped=data.what_is_being_shipped,
        status='pending'
    )
    
    create_start = time.time()
    result = crud.create_shipment(db=db, shipment=shipment_data)
    create_time = time.time() - create_start
    
    total_time = time.time() - start_time
    
    return {"shipment_id": result.shipment_id, "time": total_time}

@router.post("/")
def create_shipment(
    data: schemas.ShipmentWithItemsCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Create a new shipment with multiple items"""
    try:
        # Create the base shipment using consolidated function
        shipment_data = create_shipment_data_from_request(data)
        
        result = crud.create_shipment(db=db, shipment=shipment_data)
        
        # Create shipment items
        for item in data.items:
            crud.create_shipment_item(db=db, shipment_item=item, shipment_id=result.shipment_id)
        
        # Create audit log with proper tracking
        crud.create_audit_log(
            db=db,
            user_id=current_user.user_id,
            field_changed="shipment_create",
            old_value=None,
            new_value=result.shipment_id,
            ticket_id=result.ticket_id
        )
        
        # Commit all changes
        db.commit()
        
        # Broadcast with specific shipment ID for real-time UI updates
        _enqueue_broadcast(background_tasks, f'{{"type":"shipment","action":"create","shipment_id":"{result.shipment_id}"}}')
        
        # Convert to response model
        from schemas import ShipmentOut
        response_data = ShipmentOut.model_validate(result)
        
        return response_data
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create shipment: {str(e)}")

@router.get("/{shipment_id}")
def get_shipment(
    shipment_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific shipment by ID"""
    db_item = crud.get_shipment(db, shipment_id=shipment_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return db_item

@router.get("/count")
def shipments_count(
    site_id: str | None = None,
    ticket_id: str | None = None,
    search: str | None = None,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    response: Response = None
):
    count = crud.count_shipments(db, site_id=site_id, ticket_id=ticket_id, search=search, include_archived=include_archived)
    if response is not None:
        response.headers["Cache-Control"] = "public, max-age=15"
    return {"count": count}

@router.get("/")
def list_shipments(
    skip: int = 0, 
    limit: int = 50, 
    site_id: str | None = None,
    ticket_id: str | None = None,
    search: str | None = None,
    include_archived: bool = False,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """List all shipments with pagination and optional filters"""
    items = crud.get_shipments(db, skip=skip, limit=limit, site_id=site_id, ticket_id=ticket_id, search=search)
    if not include_archived:
        items = [s for s in items if not getattr(s, 'archived', False)]
    return items

@router.put("/{shipment_id}")
def update_shipment(
    shipment_id: str, 
    data: schemas.ShipmentWithItemsCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update a shipment with multiple items"""
    try:
        # Update the base shipment using consolidated function
        shipment_data = create_shipment_data_from_request(data)
        
        result = crud.update_shipment(db, shipment_id=shipment_id, shipment=shipment_data)
        if not result:
            raise HTTPException(status_code=404, detail="Shipment not found")
        
        # Update shipment items - delete existing and recreate
        existing_items = crud.get_shipment_items(db, shipment_id=shipment_id)
        for item in existing_items:
            crud.delete_shipment_item(db, item.shipment_item_id)
        
        # Create new shipment items
        for item in data.items:
            crud.create_shipment_item(db=db, shipment_item=item, shipment_id=shipment_id)
        
        # Create audit log with proper tracking
        crud.create_audit_log(
            db=db,
            user_id=current_user.user_id,
            field_changed="shipment_update",
            old_value=None,
            new_value=result.shipment_id,
            ticket_id=result.ticket_id
        )
        
        # Commit all changes
        db.commit()
        
        # Broadcast with specific shipment ID for real-time UI updates
        _enqueue_broadcast(background_tasks, f'{{"type":"shipment","action":"update","shipment_id":"{result.shipment_id}"}}')
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update shipment: {str(e)}")

@router.patch("/{shipment_id}/status")
def update_shipment_status(
    shipment_id: str,
    status_data: schemas.ShipmentStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update shipment status with optimized inventory handling"""
    # Get shipment with all related data
    shipment = crud.get_shipment_with_items(db, shipment_id=shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Capture old values for audit logging
    old_status = shipment.status
    old_tracking = shipment.tracking_number
    old_return_tracking = shipment.return_tracking
    old_remove_from_inventory = shipment.remove_from_inventory
    
    # Update status and tracking info
    if status_data.status:
        shipment.status = status_data.status
    if status_data.tracking_number:
        shipment.tracking_number = status_data.tracking_number
    if status_data.return_tracking:
        shipment.return_tracking = status_data.return_tracking
    if status_data.remove_from_inventory is not None:
        shipment.remove_from_inventory = status_data.remove_from_inventory
    
    # Set date_shipped if status is 'shipped' and not already set
    if status_data.status == 'shipped' and not shipment.date_shipped:
        shipment.date_shipped = datetime.now(timezone.utc)
    
    # Handle inventory removal with optimized bulk operations
    inventory_result = None
    if status_data.status == 'shipped':
        try:
            inventory_result = crud.bulk_update_inventory_for_shipment(
                db=db,
                shipment_id=shipment_id,
                user_id=current_user.user_id,
                ticket_id=shipment.ticket_id
            )
        except Exception as e:
            # Log the error and create audit entry for failed inventory update
            crud.create_audit_log(
                db=db,
                user_id=current_user.user_id,
                field_changed="inventory_error",
                old_value="Inventory update attempted",
                new_value=f"Failed: {str(e)}",
                ticket_id=shipment.ticket_id
            )
            inventory_result = {"errors": [str(e)]}
    
    # Create comprehensive audit logs
    if old_status != status_data.status:
        crud.create_audit_log(
            db=db,
            user_id=current_user.user_id,
            field_changed="shipment_status",
            old_value=old_status,
            new_value=status_data.status,
            ticket_id=shipment.ticket_id
        )
    
    if old_tracking != status_data.tracking_number:
        crud.create_audit_log(
            db=db,
            user_id=current_user.user_id,
            field_changed="shipment_tracking",
            old_value=old_tracking,
            new_value=status_data.tracking_number,
            ticket_id=shipment.ticket_id
        )
    
    if inventory_result and inventory_result.get("updated_items", 0) > 0:
        crud.create_audit_log(
            db=db,
            user_id=current_user.user_id,
            field_changed="inventory_removal",
            old_value=f"Updated {inventory_result['updated_items']} items",
            new_value=f"Created {inventory_result['transactions_created']} transactions",
            ticket_id=shipment.ticket_id
        )
    
    db.commit()
    db.refresh(shipment)
    
    # Broadcast with specific shipment ID for real-time UI updates
    _enqueue_broadcast(background_tasks, f'{{"type":"shipment","action":"status_update","shipment_id":"{shipment_id}"}}')
    
    return shipment

@router.patch("/{shipment_id}/archive")
def archive_shipment(
    shipment_id: str,
    archived: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Archive/unarchive a shipment; archived shipments are hidden from default lists."""
    shipment = crud.archive_shipment(db, shipment_id=shipment_id, archived=archived)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment

@router.delete("/{shipment_id}")
def delete_shipment(
    shipment_id: str, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role([models.UserRole.admin.value, models.UserRole.dispatcher.value]))
):
    """Delete a shipment with proper audit logging"""
    # Get shipment info before deletion for audit
    shipment = crud.get_shipment(db, shipment_id=shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Create audit log before deletion
    crud.create_audit_log(
        db=db,
        user_id=current_user.user_id,
        field_changed="shipment_delete",
        old_value=shipment.shipment_id,
        new_value=None,
        ticket_id=shipment.ticket_id
    )
    
    result = crud.delete_shipment(db, shipment_id=shipment_id)
    if not result:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Broadcast with specific shipment ID for real-time UI updates
    _enqueue_broadcast(background_tasks, f'{{"type":"shipment","action":"delete","shipment_id":"{shipment_id}"}}')
    
    return {"success": True, "message": "Shipment deleted successfully"}

# Shipment Item endpoints
@router.get("/{shipment_id}/items")
def get_shipment_items(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all items for a shipment"""
    items = crud.get_shipment_items(db, shipment_id=shipment_id)
    return items

@router.post("/{shipment_id}/items")
def add_shipment_item(
    shipment_id: str,
    item: schemas.ShipmentItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add an item to a shipment"""
    result = crud.create_shipment_item(db=db, shipment_item=item, shipment_id=shipment_id)
    return result

@router.put("/items/{shipment_item_id}")
def update_shipment_item(
    shipment_item_id: str,
    item: schemas.ShipmentItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a shipment item"""
    result = crud.update_shipment_item(db=db, shipment_item_id=shipment_item_id, shipment_item=item)
    if not result:
        raise HTTPException(status_code=404, detail="Shipment item not found")
    return result

@router.delete("/items/{shipment_item_id}")
def delete_shipment_item(
    shipment_item_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role([models.UserRole.admin.value, models.UserRole.dispatcher.value]))
):
    """Delete a shipment item"""
    result = crud.delete_shipment_item(db=db, shipment_item_id=shipment_item_id)
    if not result:
        raise HTTPException(status_code=404, detail="Shipment item not found")
    return {"success": True, "message": "Shipment item deleted successfully"}


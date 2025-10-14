from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import and_, or_, desc, asc
import models, schemas
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional

# =============================================================================
# OPTIMIZED CRUD OPERATIONS WITH PROPER EAGER LOADING
# =============================================================================

# User CRUD - Optimized
def create_user(db: Session, user):
    """Create user - accepts both UserCreate and AdminUserCreate schemas"""
    db_user = models.User(
        user_id=str(uuid.uuid4()),
        name=user.name,
        email=user.email,
        role=user.role,
        phone=user.phone,
        region=user.region,
        preferences=user.preferences,
        hashed_password=getattr(user, 'hashed_password', None),
        must_change_password=getattr(user, 'must_change_password', False),
        active=getattr(user, 'active', True)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: str):
    """Get user with optimized query"""
    return db.query(models.User).filter(models.User.user_id == user_id).first()

def get_user_by_email(db: Session, email: str):
    """Get user by email with optimized query"""
    return db.query(models.User).filter(models.User.email.ilike(email)).first()

def get_users(db: Session, skip: int = 0, limit: int = 100, include_inactive: bool = False):
    """Get users with pagination and optional filtering"""
    query = db.query(models.User)
    if not include_inactive:
        query = query.filter(models.User.active == True)
    return query.offset(skip).limit(limit).all()

def update_user(db: Session, user_id: str, user):
    """Update user - accepts both UserCreate and AdminUserCreate schemas"""
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        return None
    
    # Update fields
    db_user.name = user.name
    db_user.email = user.email
    db_user.role = user.role
    db_user.phone = user.phone
    db_user.region = user.region
    db_user.preferences = user.preferences
    if hasattr(user, 'active') and user.active is not None:
        db_user.active = user.active
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: str):
    """Delete user (soft delete by setting active=False)"""
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        return None
    
    # Soft delete instead of hard delete
    db_user.active = False
    db.commit()
    return db_user

# Site CRUD - Optimized
def create_site(db: Session, site: schemas.SiteCreate):
    """Create site with optimized query"""
    db_site = models.Site(
        site_id=site.site_id,
        ip_address=site.ip_address,
        location=site.location,
        brand=site.brand,
        main_number=site.main_number,
        mp=site.mp,
        service_address=site.service_address,
        city=site.city,
        state=site.state,
        zip=site.zip,
        region=site.region,
        notes=site.notes,
        equipment_notes=site.equipment_notes,
        phone_system=site.phone_system,
        phone_types=site.phone_types,
        network_equipment=site.network_equipment,
        additional_equipment=site.additional_equipment
    )
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    return db_site

def get_site(db: Session, site_id: str):
    """Get site with related data eager loaded"""
    return db.query(models.Site).options(
        selectinload(models.Site.tickets),
        selectinload(models.Site.shipments),
        selectinload(models.Site.equipment),
        selectinload(models.Site.site_equipment)
    ).filter(models.Site.site_id == site_id).first()

def get_sites(db: Session, skip: int = 0, limit: int = 100, region: Optional[str] = None):
    """Get sites with pagination and optional region filtering"""
    query = db.query(models.Site)
    if region:
        query = query.filter(models.Site.region == region)
    return query.offset(skip).limit(limit).all()

def update_site(db: Session, site_id: str, site: schemas.SiteCreate):
    """Update site with optimized query"""
    db_site = db.query(models.Site).filter(models.Site.site_id == site_id).first()
    if not db_site:
        return None
    
    # Update all fields
    for field, value in site.dict().items():
        if hasattr(db_site, field) and value is not None:
            setattr(db_site, field, value)
    
    db.commit()
    db.refresh(db_site)
    return db_site

def delete_site(db: Session, site_id: str):
    """Delete site (check for dependencies first)"""
    db_site = db.query(models.Site).filter(models.Site.site_id == site_id).first()
    if not db_site:
        return None
    
    # Check for dependencies
    ticket_count = db.query(models.Ticket).filter(models.Ticket.site_id == site_id).count()
    if ticket_count > 0:
        raise ValueError(f"Cannot delete site with {ticket_count} associated tickets")
    
    db.delete(db_site)
    db.commit()
    return db_site

# Ticket CRUD - Highly Optimized
# =============================================================================
# ID GENERATION FUNCTIONS
# =============================================================================

def generate_ticket_id(db: Session) -> str:
    """Generate a sequential ticket ID in format: YYYY-NNNNNN"""
    from datetime import datetime, timezone
    
    current_year = datetime.now(timezone.utc).year
    year_prefix = str(current_year)
    
    # Get the highest ticket number for this year
    latest_ticket = db.query(models.Ticket).filter(
        models.Ticket.ticket_id.like(f"{year_prefix}-%")
    ).order_by(models.Ticket.ticket_id.desc()).first()
    
    if latest_ticket:
        # Extract the number part and increment
        try:
            last_number = int(latest_ticket.ticket_id.split('-')[1])
            new_number = last_number + 1
        except (ValueError, IndexError):
            new_number = 1
    else:
        # First ticket of the year
        new_number = 1
    
    # Format: YYYY-NNNNNN (6 digits, can handle up to 999,999 tickets per year)
    ticket_id = f"{year_prefix}-{new_number:06d}"
    
    return ticket_id

def generate_sequential_id(db: Session, model, id_field: str, prefix: str, digits: int = 6) -> str:
    """
    Generate a sequential ID with prefix: PREFIX-NNNNNN
    
    Args:
        db: Database session
        model: SQLAlchemy model class
        id_field: Name of the ID field (e.g., 'shipment_id')
        prefix: Prefix for the ID (e.g., 'SHIP')
        digits: Number of digits for the counter (default 6)
    
    Returns:
        Sequential ID string (e.g., 'SHIP-000001')
    """
    # Get the highest ID with this prefix
    latest = db.query(model).filter(
        getattr(model, id_field).like(f"{prefix}-%")
    ).order_by(getattr(model, id_field).desc()).first()
    
    if latest:
        # Extract the number part and increment
        try:
            current_id = getattr(latest, id_field)
            last_number = int(current_id.split('-')[1])
            new_number = last_number + 1
        except (ValueError, IndexError):
            new_number = 1
    else:
        # First ID with this prefix
        new_number = 1
    
    # Format: PREFIX-NNNNNN
    new_id = f"{prefix}-{new_number:0{digits}d}"
    
    return new_id

def create_ticket(db: Session, ticket: schemas.TicketCreate):
    """Create ticket with optimized query"""
    from timezone_utils import get_eastern_today
    
    db_ticket = models.Ticket(
        ticket_id=generate_ticket_id(db),
        site_id=ticket.site_id,
        inc_number=ticket.inc_number,
        so_number=ticket.so_number,
        type=ticket.type,
        status=ticket.status,
        priority=ticket.priority,
        category=ticket.category,
        assigned_user_id=ticket.assigned_user_id,
        onsite_tech_id=ticket.onsite_tech_id,
        date_created=ticket.date_created or get_eastern_today(),
        date_scheduled=ticket.date_scheduled,
        date_closed=ticket.date_closed,
        time_spent=ticket.time_spent,
        notes=ticket.notes,
        color_flag=ticket.color_flag,
        special_flag=ticket.special_flag,
        last_updated_by=ticket.last_updated_by,
        last_updated_at=ticket.last_updated_at,
        # New Ticket Type System Fields
        claimed_by=ticket.claimed_by,
        claimed_at=ticket.claimed_at,
        check_in_time=ticket.check_in_time,
        check_out_time=ticket.check_out_time,
        onsite_duration_minutes=ticket.onsite_duration_minutes,
        billing_rate=ticket.billing_rate,
        total_cost=ticket.total_cost,
        # Enhanced Workflow Fields
        estimated_hours=ticket.estimated_hours,
        actual_hours=ticket.actual_hours,
        start_time=ticket.start_time,
        end_time=ticket.end_time,
        is_billable=ticket.is_billable,
        requires_approval=ticket.requires_approval,
        approved_by=ticket.approved_by,
        approved_at=ticket.approved_at,
        rejection_reason=ticket.rejection_reason,
        # Enhanced SLA Management Fields
        sla_target_hours=ticket.sla_target_hours,
        sla_breach_hours=ticket.sla_breach_hours,
        first_response_time=ticket.first_response_time,
        resolution_time=ticket.resolution_time,
        escalation_level=ticket.escalation_level,
        escalation_notified=ticket.escalation_notified,
        customer_impact=ticket.customer_impact,
        business_priority=ticket.business_priority,
        # New Workflow Fields
        workflow_step=ticket.workflow_step,
        next_action_required=ticket.next_action_required,
        due_date=ticket.due_date,
        is_urgent=ticket.is_urgent,
        is_vip=ticket.is_vip,
        customer_name=ticket.customer_name,
        customer_phone=ticket.customer_phone,
        customer_email=ticket.customer_email,
        # Equipment and Parts
        equipment_affected=ticket.equipment_affected,
        parts_needed=ticket.parts_needed,
        parts_ordered=ticket.parts_ordered,
        parts_received=ticket.parts_received,
        # Quality and Follow-up
        quality_score=ticket.quality_score,
        customer_satisfaction=ticket.customer_satisfaction,
        follow_up_required=ticket.follow_up_required,
        follow_up_date=ticket.follow_up_date,
        follow_up_notes=ticket.follow_up_notes
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def get_ticket(db: Session, ticket_id: str):
    """Get ticket with all related data eager loaded"""
    return db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech),
        joinedload(models.Ticket.claimed_user),
        joinedload(models.Ticket.approved_user),
        selectinload(models.Ticket.comments).joinedload(models.TicketComment.user),
        selectinload(models.Ticket.time_entries),
        selectinload(models.Ticket.attachments),
        selectinload(models.Ticket.tasks),
        selectinload(models.Ticket.audits).joinedload(models.TicketAudit.user)
    ).filter(models.Ticket.ticket_id == ticket_id).first()

def get_tickets(db: Session, skip: int = 0, limit: int = 100, 
                status: Optional[str] = None, 
                priority: Optional[str] = None,
                assigned_user_id: Optional[str] = None,
                site_id: Optional[str] = None,
                ticket_type: Optional[str] = None):
    """Get tickets with comprehensive filtering and eager loading"""
    query = db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    )
    
    # Apply filters
    if status:
        query = query.filter(models.Ticket.status == status)
    if priority:
        query = query.filter(models.Ticket.priority == priority)
    if assigned_user_id:
        query = query.filter(models.Ticket.assigned_user_id == assigned_user_id)
    if site_id:
        query = query.filter(models.Ticket.site_id == site_id)
    if ticket_type:
        query = query.filter(models.Ticket.type == ticket_type)
    
    return query.order_by(desc(models.Ticket.created_at)).offset(skip).limit(limit).all()

def update_ticket(db: Session, ticket_id: str, ticket: schemas.TicketUpdate):
    """Update ticket with optimized query"""
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    # Update fields dynamically
    for field, value in ticket.dict(exclude_unset=True).items():
        if hasattr(db_ticket, field) and value is not None:
            setattr(db_ticket, field, value)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def delete_ticket(db: Session, ticket_id: str):
    """Delete ticket with optimized cascade deletion"""
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    # Use cascade delete for better performance
    db.delete(db_ticket)
    db.commit()
    return db_ticket

# Shipment CRUD - Optimized
def create_shipment(db: Session, shipment: schemas.ShipmentCreate):
    """Create shipment with optimized query"""
    db_shipment = models.Shipment(
        shipment_id=generate_sequential_id(db, models.Shipment, 'shipment_id', 'SHIP', 6),
        site_id=shipment.site_id,
        ticket_id=shipment.ticket_id,
        item_id=shipment.item_id,
        what_is_being_shipped=shipment.what_is_being_shipped,
        shipping_preference=shipment.shipping_preference,
        charges_out=shipment.charges_out,
        charges_in=shipment.charges_in,
        tracking_number=shipment.tracking_number,
        return_tracking=shipment.return_tracking,
        date_shipped=shipment.date_shipped,
        date_returned=shipment.date_returned,
        notes=shipment.notes,
        source_ticket_type=shipment.source_ticket_type,
        shipping_priority=shipment.shipping_priority,
        parts_cost=shipment.parts_cost,
        total_cost=shipment.total_cost,
        status=shipment.status,
        remove_from_inventory=shipment.remove_from_inventory,
        date_created=datetime.now(timezone.utc)
    )
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def get_shipment(db: Session, shipment_id: str):
    """Get shipment with related data eager loaded"""
    return db.query(models.Shipment).options(
        joinedload(models.Shipment.site),
        joinedload(models.Shipment.ticket),
        joinedload(models.Shipment.item)
    ).filter(models.Shipment.shipment_id == shipment_id).first()

def get_shipments(db: Session, skip: int = 0, limit: int = 100, 
                  site_id: Optional[str] = None,
                  ticket_id: Optional[str] = None):
    """Get shipments with filtering and eager loading"""
    query = db.query(models.Shipment).options(
        joinedload(models.Shipment.site),
        joinedload(models.Shipment.ticket)
    )
    
    if site_id:
        query = query.filter(models.Shipment.site_id == site_id)
    if ticket_id:
        query = query.filter(models.Shipment.ticket_id == ticket_id)
    
    return query.order_by(desc(models.Shipment.date_created)).offset(skip).limit(limit).all()

def get_shipments_by_site(db: Session, site_id: str):
    """Get all shipments for a specific site with eager loading"""
    return db.query(models.Shipment).options(
        joinedload(models.Shipment.ticket)
    ).filter(models.Shipment.site_id == site_id).order_by(desc(models.Shipment.date_created)).all()

def update_shipment(db: Session, shipment_id: str, shipment: schemas.ShipmentCreate):
    """Update shipment with optimized query"""
    db_shipment = db.query(models.Shipment).filter(models.Shipment.shipment_id == shipment_id).first()
    if not db_shipment:
        return None
    
    # Update fields dynamically
    for field, value in shipment.dict(exclude_unset=True).items():
        if hasattr(db_shipment, field) and value is not None:
            setattr(db_shipment, field, value)
    
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def delete_shipment(db: Session, shipment_id: str):
    """Delete shipment with optimized query"""
    db_shipment = db.query(models.Shipment).filter(models.Shipment.shipment_id == shipment_id).first()
    if not db_shipment:
        return None
    
    db.delete(db_shipment)
    db.commit()
    return db_shipment

# Field Tech CRUD - Optimized
def create_field_tech(db: Session, tech: schemas.FieldTechCreate):
    """Create field tech with optimized query"""
    db_tech = models.FieldTech(
        field_tech_id=str(uuid.uuid4()),
        name=tech.name,
        phone=tech.phone,
        email=tech.email,
        region=tech.region,
        city=tech.city,
        state=tech.state,
        zip=tech.zip,
        notes=tech.notes
    )
    db.add(db_tech)
    db.commit()
    db.refresh(db_tech)
    return db_tech

def get_field_tech(db: Session, field_tech_id: str):
    """Get field tech with related tickets eager loaded"""
    return db.query(models.FieldTech).options(
        selectinload(models.FieldTech.onsite_tickets)
    ).filter(models.FieldTech.field_tech_id == field_tech_id).first()

def get_field_techs(db: Session, skip: int = 0, limit: int = 100, region: Optional[str] = None):
    """Get field techs with pagination and region filtering"""
    query = db.query(models.FieldTech)
    if region:
        query = query.filter(models.FieldTech.region == region)
    return query.offset(skip).limit(limit).all()

def update_field_tech(db: Session, field_tech_id: str, tech: schemas.FieldTechCreate):
    """Update field tech with optimized query"""
    db_tech = db.query(models.FieldTech).filter(models.FieldTech.field_tech_id == field_tech_id).first()
    if not db_tech:
        return None
    
    # Update fields dynamically
    for field, value in tech.dict(exclude_unset=True).items():
        if hasattr(db_tech, field) and value is not None:
            setattr(db_tech, field, value)
    
    db.commit()
    db.refresh(db_tech)
    return db_tech

def delete_field_tech(db: Session, field_tech_id: str):
    """Delete field tech (check for dependencies first)"""
    db_tech = db.query(models.FieldTech).filter(models.FieldTech.field_tech_id == field_tech_id).first()
    if not db_tech:
        return None
    
    # Check for dependencies
    ticket_count = db.query(models.Ticket).filter(models.Ticket.onsite_tech_id == field_tech_id).count()
    if ticket_count > 0:
        raise ValueError(f"Cannot delete field tech with {ticket_count} associated tickets")
    
    db.delete(db_tech)
    db.commit()
    return db_tech

# Task CRUD - Optimized
def create_task(db: Session, task: schemas.TaskCreate):
    """Create task with optimized query"""
    db_task = models.Task(
        task_id=generate_sequential_id(db, models.Task, 'task_id', 'TASK', 6),
        ticket_id=task.ticket_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        assigned_user_id=task.assigned_user_id,
        due_date=task.due_date,
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_task(db: Session, task_id: str):
    """Get task with related data eager loaded"""
    return db.query(models.Task).options(
        joinedload(models.Task.ticket),
        joinedload(models.Task.assigned_user)
    ).filter(models.Task.task_id == task_id).first()

def get_tasks(db: Session, skip: int = 0, limit: int = 100, 
              ticket_id: Optional[str] = None,
              assigned_user_id: Optional[str] = None,
              status: Optional[str] = None):
    """Get tasks with filtering and eager loading"""
    query = db.query(models.Task).options(
        joinedload(models.Task.ticket),
        joinedload(models.Task.assigned_user)
    )
    
    if ticket_id:
        query = query.filter(models.Task.ticket_id == ticket_id)
    if assigned_user_id:
        query = query.filter(models.Task.assigned_user_id == assigned_user_id)
    if status:
        query = query.filter(models.Task.status == status)
    
    return query.order_by(desc(models.Task.created_at)).offset(skip).limit(limit).all()

def update_task(db: Session, task_id: str, task: schemas.TaskCreate):
    """Update task with optimized query"""
    db_task = db.query(models.Task).filter(models.Task.task_id == task_id).first()
    if not db_task:
        return None
    
    # Update fields dynamically
    for field, value in task.dict(exclude_unset=True).items():
        if hasattr(db_task, field) and value is not None:
            setattr(db_task, field, value)
    
    db_task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: str):
    """Delete task with optimized query"""
    db_task = db.query(models.Task).filter(models.Task.task_id == task_id).first()
    if not db_task:
        return None
    
    db.delete(db_task)
    db.commit()
    return db_task

# Equipment CRUD - Optimized
def create_equipment(db: Session, equipment: schemas.EquipmentCreate):
    """Create equipment with optimized query"""
    db_equipment = models.Equipment(
        equipment_id=generate_sequential_id(db, models.Equipment, 'equipment_id', 'EQUIP', 6),
        site_id=equipment.site_id,
        type=equipment.type,
        make_model=equipment.make_model,
        serial_number=equipment.serial_number,
        install_date=equipment.install_date,
        notes=equipment.notes
    )
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def get_equipment(db: Session, equipment_id: str):
    """Get equipment with related site data eager loaded"""
    return db.query(models.Equipment).options(
        joinedload(models.Equipment.site)
    ).filter(models.Equipment.equipment_id == equipment_id).first()

def get_equipments(db: Session, skip: int = 0, limit: int = 100, 
                   site_id: Optional[str] = None,
                   equipment_type: Optional[str] = None):
    """Get equipment with filtering and eager loading"""
    query = db.query(models.Equipment).options(
        joinedload(models.Equipment.site)
    )
    
    if site_id:
        query = query.filter(models.Equipment.site_id == site_id)
    if equipment_type:
        query = query.filter(models.Equipment.type == equipment_type)
    
    return query.offset(skip).limit(limit).all()

def update_equipment(db: Session, equipment_id: str, equipment: schemas.EquipmentCreate):
    """Update equipment with optimized query"""
    db_equipment = db.query(models.Equipment).filter(models.Equipment.equipment_id == equipment_id).first()
    if not db_equipment:
        return None
    
    # Update fields dynamically
    for field, value in equipment.dict(exclude_unset=True).items():
        if hasattr(db_equipment, field) and value is not None:
            setattr(db_equipment, field, value)
    
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def delete_equipment(db: Session, equipment_id: str):
    """Delete equipment with optimized query"""
    db_equipment = db.query(models.Equipment).filter(models.Equipment.equipment_id == equipment_id).first()
    if not db_equipment:
        return None
    
    db.delete(db_equipment)
    db.commit()
    return db_equipment

# Inventory CRUD - Optimized
def create_inventory_item(db: Session, item: schemas.InventoryItemCreate):
    """Create inventory item with optimized query"""
    db_item = models.InventoryItem(
        item_id=generate_sequential_id(db, models.InventoryItem, 'item_id', 'INV', 6),
        name=item.name,
        sku=item.sku,
        description=item.description,
        quantity_on_hand=item.quantity_on_hand,
        cost=item.cost,
        location=item.location,
        barcode=item.barcode
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_inventory_item(db: Session, item_id: str):
    """Get inventory item with related transactions eager loaded"""
    return db.query(models.InventoryItem).options(
        selectinload(models.InventoryItem.transactions)
    ).filter(models.InventoryItem.item_id == item_id).first()

def get_inventory_items(db: Session, skip: int = 0, limit: int = 100, 
                        category: Optional[str] = None,
                        location: Optional[str] = None):
    """Get inventory items with filtering and eager loading"""
    query = db.query(models.InventoryItem)
    
    if category:
        query = query.filter(models.InventoryItem.category == category)
    if location:
        query = query.filter(models.InventoryItem.location == location)
    
    return query.offset(skip).limit(limit).all()

def update_inventory_item(db: Session, item_id: str, item: schemas.InventoryItemCreate):
    """Update inventory item with optimized query"""
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.item_id == item_id).first()
    if not db_item:
        return None
    
    # Update fields dynamically
    for field, value in item.dict(exclude_unset=True).items():
        if hasattr(db_item, field) and value is not None:
            setattr(db_item, field, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_inventory_item(db: Session, item_id: str):
    """Delete inventory item (check for dependencies first)"""
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.item_id == item_id).first()
    if not db_item:
        return None
    
    # Check for dependencies
    transaction_count = db.query(models.InventoryTransaction).filter(models.InventoryTransaction.item_id == item_id).count()
    if transaction_count > 0:
        raise ValueError(f"Cannot delete inventory item with {transaction_count} associated transactions")
    
    db.delete(db_item)
    db.commit()
    return db_item

def get_transactions_by_item(db: Session, item_id: str):
    """Get all transactions for an inventory item"""
    return db.query(models.InventoryTransaction).options(
        joinedload(models.InventoryTransaction.user),
        joinedload(models.InventoryTransaction.shipment),
        joinedload(models.InventoryTransaction.ticket)
    ).filter(models.InventoryTransaction.item_id == item_id).order_by(desc(models.InventoryTransaction.date)).all()

def get_inventory_item_by_barcode(db: Session, barcode: str):
    """Get inventory item by barcode"""
    return db.query(models.InventoryItem).filter(models.InventoryItem.barcode == barcode).first()

# Audit CRUD - Optimized
def create_ticket_audit(db: Session, audit: schemas.TicketAuditCreate):
    """Create audit log entry with optimized query"""
    db_audit = models.TicketAudit(
        audit_id=str(uuid.uuid4()),
        ticket_id=audit.ticket_id,
        user_id=audit.user_id,
        change_time=audit.change_time,
        field_changed=audit.field_changed,
        old_value=audit.old_value,
        new_value=audit.new_value
    )
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    return db_audit

def get_ticket_audit(db: Session, audit_id: str):
    """Get audit log entry with related data eager loaded"""
    return db.query(models.TicketAudit).options(
        joinedload(models.TicketAudit.user),
        joinedload(models.TicketAudit.ticket)
    ).filter(models.TicketAudit.audit_id == audit_id).first()

def get_ticket_audits(db: Session, skip: int = 0, limit: int = 100,
                      ticket_id: Optional[str] = None,
                      user_id: Optional[str] = None,
                      field_changed: Optional[str] = None):
    """Get audit logs with filtering and eager loading"""
    query = db.query(models.TicketAudit).options(
        joinedload(models.TicketAudit.user),
        joinedload(models.TicketAudit.ticket)
    )
    
    if ticket_id:
        query = query.filter(models.TicketAudit.ticket_id == ticket_id)
    if user_id:
        query = query.filter(models.TicketAudit.user_id == user_id)
    if field_changed:
        query = query.filter(models.TicketAudit.field_changed == field_changed)
    
    return query.order_by(desc(models.TicketAudit.change_time)).offset(skip).limit(limit).all()

# SLA Rule CRUD - Optimized
def create_sla_rule(db: Session, rule: schemas.SLARuleCreate):
    """Create SLA rule with optimized query"""
    db_rule = models.SLARule(
        rule_id=str(uuid.uuid4()),
        name=rule.name,
        description=rule.description,
        ticket_type=rule.ticket_type,
        customer_impact=rule.customer_impact,
        business_priority=rule.business_priority,
        sla_target_hours=rule.sla_target_hours,
        sla_breach_hours=rule.sla_breach_hours,
        escalation_levels=rule.escalation_levels,
        is_active=rule.is_active,
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def get_sla_rule(db: Session, rule_id: str):
    """Get SLA rule with optimized query"""
    return db.query(models.SLARule).filter(models.SLARule.rule_id == rule_id).first()

def get_sla_rules(db: Session, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None):
    """Get SLA rules with filtering and eager loading"""
    query = db.query(models.SLARule)
    if is_active is not None:
        query = query.filter(models.SLARule.is_active == is_active)
    return query.order_by(desc(models.SLARule.created_at)).offset(skip).limit(limit).all()

def update_sla_rule(db: Session, rule_id: str, rule: schemas.SLARuleUpdate):
    """Update SLA rule with optimized query"""
    db_rule = db.query(models.SLARule).filter(models.SLARule.rule_id == rule_id).first()
    if not db_rule:
        return None
    
    # Update fields dynamically
    for field, value in rule.dict(exclude_unset=True).items():
        if hasattr(db_rule, field) and value is not None:
            setattr(db_rule, field, value)
    
    db_rule.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def delete_sla_rule(db: Session, rule_id: str):
    """Delete SLA rule with optimized query"""
    db_rule = db.query(models.SLARule).filter(models.SLARule.rule_id == rule_id).first()
    if not db_rule:
        return None
    
    db.delete(db_rule)
    db.commit()
    return db_rule

def get_matching_sla_rule(db: Session, ticket_type, customer_impact, business_priority):
    """Get the most specific SLA rule that matches the ticket criteria - Optimized"""
    # Use a single query with proper ordering
    return db.query(models.SLARule).filter(
        models.SLARule.is_active == True,
        or_(
            and_(
                models.SLARule.ticket_type == ticket_type,
                models.SLARule.customer_impact == customer_impact,
                models.SLARule.business_priority == business_priority
            ),
            and_(
                models.SLARule.ticket_type == ticket_type,
                models.SLARule.customer_impact == customer_impact,
                models.SLARule.business_priority.is_(None)
            ),
            and_(
                models.SLARule.ticket_type == ticket_type,
                models.SLARule.customer_impact.is_(None),
                models.SLARule.business_priority.is_(None)
            )
        )
    ).order_by(
        desc(models.SLARule.business_priority.isnot(None)),
        desc(models.SLARule.customer_impact.isnot(None))
    ).first()

# Time Entry CRUD - Optimized
def create_time_entry(db: Session, time_entry_data: dict):
    """Create time entry with optimized query"""
    db_time_entry = models.TimeEntry(
        entry_id=str(uuid.uuid4()),
        ticket_id=time_entry_data['ticket_id'],
        user_id=time_entry_data['user_id'],
        start_time=time_entry_data['start_time'],
        end_time=time_entry_data.get('end_time'),
        description=time_entry_data.get('description'),
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_time_entry)
    db.commit()
    db.refresh(db_time_entry)
    return db_time_entry

def get_time_entry(db: Session, entry_id: str):
    """Get time entry with related data eager loaded"""
    return db.query(models.TimeEntry).options(
        joinedload(models.TimeEntry.ticket),
        joinedload(models.TimeEntry.user)
    ).filter(models.TimeEntry.entry_id == entry_id).first()

def get_time_entries_by_ticket(db: Session, ticket_id: str):
    """Get time entries for a ticket with eager loading"""
    return db.query(models.TimeEntry).options(
        joinedload(models.TimeEntry.user)
    ).filter(models.TimeEntry.ticket_id == ticket_id).order_by(desc(models.TimeEntry.created_at)).all()

def update_time_entry(db: Session, entry_id: str, time_entry_data: dict):
    """Update time entry with optimized query"""
    db_time_entry = db.query(models.TimeEntry).filter(models.TimeEntry.entry_id == entry_id).first()
    if not db_time_entry:
        return None
    
    # Update fields dynamically
    for field, value in time_entry_data.items():
        if hasattr(db_time_entry, field) and value is not None:
            setattr(db_time_entry, field, value)
    
    db.commit()
    db.refresh(db_time_entry)
    return db_time_entry

def delete_time_entry(db: Session, entry_id: str):
    """Delete time entry with optimized query"""
    db_time_entry = db.query(models.TimeEntry).filter(models.TimeEntry.entry_id == entry_id).first()
    if not db_time_entry:
        return None
    
    db.delete(db_time_entry)
    db.commit()
    return db_time_entry

# Ticket Comment CRUD - Optimized
def create_ticket_comment(db: Session, comment_data: dict):
    """Create ticket comment with optimized query"""
    db_comment = models.TicketComment(
        comment_id=str(uuid.uuid4()),
        ticket_id=comment_data['ticket_id'],
        user_id=comment_data['user_id'],
        comment=comment_data['comment'],
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_ticket_comment(db: Session, comment_id: str):
    """Get ticket comment with related data eager loaded"""
    return db.query(models.TicketComment).options(
        joinedload(models.TicketComment.ticket),
        joinedload(models.TicketComment.user)
    ).filter(models.TicketComment.comment_id == comment_id).first()

def get_comments_by_ticket(db: Session, ticket_id: str):
    """Get comments for a ticket with eager loading"""
    return db.query(models.TicketComment).options(
        joinedload(models.TicketComment.user)
    ).filter(models.TicketComment.ticket_id == ticket_id).order_by(desc(models.TicketComment.created_at)).all()

def update_ticket_comment(db: Session, comment_id: str, comment_data: dict):
    """Update ticket comment with optimized query"""
    db_comment = db.query(models.TicketComment).filter(models.TicketComment.comment_id == comment_id).first()
    if not db_comment:
        return None
    
    # Update fields dynamically
    for field, value in comment_data.items():
        if hasattr(db_comment, field) and value is not None:
            setattr(db_comment, field, value)
    
    db_comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def delete_ticket_comment(db: Session, comment_id: str):
    """Delete ticket comment with optimized query"""
    db_comment = db.query(models.TicketComment).filter(models.TicketComment.comment_id == comment_id).first()
    if not db_comment:
        return None
    
    db.delete(db_comment)
    db.commit()
    return db_comment

# Site Equipment CRUD - Optimized
def create_site_equipment(db: Session, equipment: schemas.SiteEquipmentCreate):
    """Create site equipment with optimized query"""
    db_equipment = models.SiteEquipment(
        equipment_id=str(uuid.uuid4()),
        site_id=equipment.site_id,
        name=equipment.name,
        type=equipment.type,
        make_model=equipment.make_model,
        serial_number=equipment.serial_number,
        install_date=equipment.install_date,
        status=equipment.status,
        notes=equipment.notes,
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def get_site_equipment(db: Session, equipment_id: str):
    """Get site equipment with related site data eager loaded"""
    return db.query(models.SiteEquipment).options(
        joinedload(models.SiteEquipment.site)
    ).filter(models.SiteEquipment.equipment_id == equipment_id).first()

def get_site_equipment_by_site(db: Session, site_id: str):
    """Get all equipment for a site with eager loading"""
    return db.query(models.SiteEquipment).options(
        joinedload(models.SiteEquipment.site)
    ).filter(models.SiteEquipment.site_id == site_id).order_by(desc(models.SiteEquipment.created_at)).all()

def update_site_equipment(db: Session, equipment_id: str, equipment: schemas.SiteEquipmentUpdate):
    """Update site equipment with optimized query"""
    db_equipment = db.query(models.SiteEquipment).filter(models.SiteEquipment.equipment_id == equipment_id).first()
    if not db_equipment:
        return None
    
    # Update fields dynamically
    for field, value in equipment.dict(exclude_unset=True).items():
        if hasattr(db_equipment, field) and value is not None:
            setattr(db_equipment, field, value)
    
    db_equipment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def delete_site_equipment(db: Session, equipment_id: str):
    """Delete site equipment with optimized query"""
    db_equipment = db.query(models.SiteEquipment).filter(models.SiteEquipment.equipment_id == equipment_id).first()
    if not db_equipment:
        return None
    
    db.delete(db_equipment)
    db.commit()
    return db_equipment

# Ticket Attachment CRUD - Optimized
def create_ticket_attachment(db: Session, attachment: schemas.TicketAttachmentCreate):
    """Create ticket attachment with optimized query"""
    db_attachment = models.TicketAttachment(
        attachment_id=str(uuid.uuid4()),
        ticket_id=attachment.ticket_id,
        filename=attachment.filename,
        file_path=attachment.file_path,
        file_size=attachment.file_size,
        mime_type=attachment.mime_type,
        uploaded_by=attachment.uploaded_by,
        uploaded_at=datetime.now(timezone.utc)
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment

def get_ticket_attachment(db: Session, attachment_id: str):
    """Get ticket attachment with related data eager loaded"""
    return db.query(models.TicketAttachment).options(
        joinedload(models.TicketAttachment.ticket),
        joinedload(models.TicketAttachment.uploader)
    ).filter(models.TicketAttachment.attachment_id == attachment_id).first()

def get_ticket_attachments(db: Session, ticket_id: str):
    """Get attachments for a ticket with eager loading"""
    return db.query(models.TicketAttachment).options(
        joinedload(models.TicketAttachment.uploader)
    ).filter(models.TicketAttachment.ticket_id == ticket_id).order_by(desc(models.TicketAttachment.uploaded_at)).all()

def update_ticket_attachment(db: Session, attachment_id: str, attachment: schemas.TicketAttachmentUpdate):
    """Update ticket attachment with optimized query"""
    db_attachment = db.query(models.TicketAttachment).filter(models.TicketAttachment.attachment_id == attachment_id).first()
    if not db_attachment:
        return None
    
    # Update fields dynamically
    for field, value in attachment.dict(exclude_unset=True).items():
        if hasattr(db_attachment, field) and value is not None:
            setattr(db_attachment, field, value)
    
    db.commit()
    db.refresh(db_attachment)
    return db_attachment

def delete_ticket_attachment(db: Session, attachment_id: str):
    """Delete ticket attachment with optimized query"""
    db_attachment = db.query(models.TicketAttachment).filter(models.TicketAttachment.attachment_id == attachment_id).first()
    if not db_attachment:
        return None
    
    db.delete(db_attachment)
    db.commit()
    return db_attachment

# Daily Operations Dashboard - Highly Optimized
def get_daily_tickets(db: Session, date: date = None, ticket_type: str = None, 
                     priority: str = None, status: str = None, assigned_user_id: str = None):
    """
    Get tickets for daily operations dashboard
    Shows:
    - Tickets scheduled for this date
    - Unscheduled tickets created today
    - Overdue tickets from previous days (not completed/approved)
    """
    query = db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech),
        selectinload(models.Ticket.comments).joinedload(models.TicketComment.user),
        selectinload(models.Ticket.time_entries),
        selectinload(models.Ticket.tasks)
    )
    
    # Filter by date: Show tickets scheduled for this date OR overdue from past
    if date:
        query = query.filter(
            or_(
                # Tickets scheduled for this date
                models.Ticket.date_scheduled == date,
                # Unscheduled tickets created today
                and_(
                    models.Ticket.date_created == date,
                    models.Ticket.date_scheduled.is_(None)
                ),
                # Overdue tickets from previous days (not completed/approved)
                and_(
                    or_(
                        models.Ticket.date_scheduled < date,
                        and_(
                            models.Ticket.date_created < date,
                            models.Ticket.date_scheduled.is_(None)
                        )
                    ),
                    models.Ticket.status.notin_(['completed', 'closed', 'approved'])
                )
            )
        )
    
    # Apply additional filters
    if ticket_type:
        query = query.filter(models.Ticket.type == ticket_type)
    if priority:
        query = query.filter(models.Ticket.priority == priority)
    if status:
        query = query.filter(models.Ticket.status == status)
    if assigned_user_id:
        query = query.filter(models.Ticket.assigned_user_id == assigned_user_id)
    
    # Order by: overdue first, then by scheduled date, then by creation
    return query.order_by(
        models.Ticket.date_scheduled.asc().nullsfirst(),
        desc(models.Ticket.created_at)
    ).all()

# Ticket Cost Management - Optimized
def update_ticket_costs(db: Session, ticket_id: str, cost_data: dict):
    """Update ticket cost information with optimized query"""
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    # Update cost fields (using billing_rate and total_cost from the model)
    if 'billing_rate' in cost_data:
        db_ticket.billing_rate = cost_data['billing_rate']
    if 'total_cost' in cost_data:
        db_ticket.total_cost = cost_data['total_cost']
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

# Search and Filtering - Optimized
def search_tickets(db: Session, search_term: str, skip: int = 0, limit: int = 100):
    """Search tickets with full-text search and eager loading"""
    query = db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    ).filter(
        or_(
            models.Ticket.notes.ilike(f'%{search_term}%'),
            models.Ticket.ticket_id.ilike(f'%{search_term}%'),
            models.Site.location.ilike(f'%{search_term}%'),
            models.Site.brand.ilike(f'%{search_term}%')
        )
    )
    
    return query.order_by(desc(models.Ticket.created_at)).offset(skip).limit(limit).all()

def get_tickets_by_status(db: Session, status: str, skip: int = 0, limit: int = 100):
    """Get tickets by status with eager loading"""
    return db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    ).filter(models.Ticket.status == status).order_by(desc(models.Ticket.created_at)).offset(skip).limit(limit).all()

def get_tickets_by_priority(db: Session, priority: str, skip: int = 0, limit: int = 100):
    """Get tickets by priority with eager loading"""
    return db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    ).filter(models.Ticket.priority == priority).order_by(desc(models.Ticket.created_at)).offset(skip).limit(limit).all()

def get_tickets_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 100):
    """Get tickets assigned to a user with eager loading"""
    return db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    ).filter(models.Ticket.assigned_user_id == user_id).order_by(desc(models.Ticket.created_at)).offset(skip).limit(limit).all()

def get_tickets_by_site(db: Session, site_id: str, skip: int = 0, limit: int = 100):
    """Get tickets for a specific site with eager loading"""
    return db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    ).filter(models.Ticket.site_id == site_id).order_by(desc(models.Ticket.created_at)).offset(skip).limit(limit).all()

# Statistics and Analytics - Optimized
def get_ticket_statistics(db: Session, start_date: date = None, end_date: date = None):
    """Get ticket statistics with optimized queries"""
    query = db.query(models.Ticket)
    
    if start_date:
        query = query.filter(models.Ticket.date_created >= start_date)
    if end_date:
        query = query.filter(models.Ticket.date_created <= end_date)
    
    # Get counts by status
    status_counts = {}
    for status in ['open', 'in_progress', 'pending', 'closed', 'cancelled']:
        status_counts[status] = query.filter(models.Ticket.status == status).count()
    
    # Get counts by priority
    priority_counts = {}
    for priority in ['low', 'medium', 'high', 'urgent']:
        priority_counts[priority] = query.filter(models.Ticket.priority == priority).count()
    
    # Get counts by type
    type_counts = {}
    for ticket_type in ['inhouse', 'onsite', 'projects', 'misc']:
        type_counts[ticket_type] = query.filter(models.Ticket.type == ticket_type).count()
    
    return {
        'status_counts': status_counts,
        'priority_counts': priority_counts,
        'type_counts': type_counts,
        'total_tickets': query.count()
    }

def get_user_statistics(db: Session, user_id: str, start_date: date = None, end_date: date = None):
    """Get user statistics with optimized queries"""
    query = db.query(models.Ticket).filter(models.Ticket.assigned_user_id == user_id)
    
    if start_date:
        query = query.filter(models.Ticket.date_created >= start_date)
    if end_date:
        query = query.filter(models.Ticket.date_created <= end_date)
    
    return {
        'total_tickets': query.count(),
        'closed_tickets': query.filter(models.Ticket.status == 'closed').count(),
        'open_tickets': query.filter(models.Ticket.status.in_(['open', 'in_progress', 'pending'])).count(),
        'average_resolution_time': db.query(models.Ticket).filter(
            models.Ticket.assigned_user_id == user_id,
            models.Ticket.resolution_time.isnot(None)
        ).with_entities(
            db.func.avg(models.Ticket.resolution_time)
        ).scalar() or 0
    }

# =============================================================================
# AUDIT CRUD OPERATIONS
# =============================================================================

def create_ticket_audit(db: Session, audit: schemas.TicketAuditCreate):
    """Create an audit log entry"""
    db_audit = models.TicketAudit(
        audit_id=str(uuid.uuid4()),
        ticket_id=audit.ticket_id,
        user_id=audit.user_id,
        change_time=audit.change_time or datetime.now(timezone.utc),
        field_changed=audit.field_changed,
        old_value=audit.old_value,
        new_value=audit.new_value
    )
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    return db_audit

def get_audit(db: Session, audit_id: str):
    """Get a specific audit log entry with user details"""
    return db.query(models.TicketAudit)\
        .options(joinedload(models.TicketAudit.user))\
        .filter(models.TicketAudit.audit_id == audit_id)\
        .first()

def get_audits(db: Session, skip: int = 0, limit: int = 100):
    """Get all audit log entries with user details, ordered by most recent"""
    return db.query(models.TicketAudit)\
        .options(joinedload(models.TicketAudit.user))\
        .order_by(desc(models.TicketAudit.change_time))\
        .offset(skip)\
        .limit(limit)\
        .all()

def get_ticket_audits(db: Session, ticket_id: str):
    """Get audit log entries for a specific ticket"""
    return db.query(models.TicketAudit)\
        .options(joinedload(models.TicketAudit.user))\
        .filter(models.TicketAudit.ticket_id == ticket_id)\
        .order_by(desc(models.TicketAudit.change_time))\
        .all()

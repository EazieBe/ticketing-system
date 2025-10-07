from sqlalchemy.orm import Session, joinedload
import models, schemas
import uuid
from datetime import date, datetime, timezone

# User CRUD

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
    return db.query(models.User).filter(models.User.user_id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email.ilike(email)).first()

def get_users(db, skip=0, limit=100):
    return db.query(models.User).offset(skip).limit(limit).all()

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
    
    # Never accept plaintext passwords here; password changes use dedicated endpoints
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: str):
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        return None
    
    db.delete(db_user)
    db.commit()
    return db_user

# Site CRUD

def create_site(db: Session, site: schemas.SiteCreate):
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
    return db.query(models.Site).filter(models.Site.site_id == site_id).first()

def get_sites(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Site).offset(skip).limit(limit).all()

def update_site(db: Session, site_id: str, site: schemas.SiteCreate):
    db_site = db.query(models.Site).filter(models.Site.site_id == site_id).first()
    if not db_site:
        return None
    
    # Update fields
    db_site.ip_address = site.ip_address
    db_site.location = site.location
    db_site.brand = site.brand
    db_site.main_number = site.main_number
    db_site.mp = site.mp
    db_site.service_address = site.service_address
    db_site.city = site.city
    db_site.state = site.state
    db_site.zip = site.zip
    db_site.region = site.region
    db_site.notes = site.notes
    db_site.equipment_notes = site.equipment_notes
    db_site.phone_system = site.phone_system
    db_site.phone_types = site.phone_types
    db_site.network_equipment = site.network_equipment
    db_site.additional_equipment = site.additional_equipment
    
    db.commit()
    db.refresh(db_site)
    return db_site

def delete_site(db: Session, site_id: str):
    db_site = db.query(models.Site).filter(models.Site.site_id == site_id).first()
    if not db_site:
        return None
    
    db.delete(db_site)
    db.commit()
    return db_site

def create_ticket(db: Session, ticket: schemas.TicketCreate):
    from timezone_utils import get_eastern_today
    db_ticket = models.Ticket(
        ticket_id=str(uuid.uuid4()),
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
        # SLA Management Fields
        sla_target_hours=ticket.sla_target_hours,
        sla_breach_hours=ticket.sla_breach_hours,
        first_response_time=ticket.first_response_time,
        resolution_time=ticket.resolution_time,
        escalation_level=ticket.escalation_level,
        escalation_notified=ticket.escalation_notified,
        customer_impact=ticket.customer_impact,
        business_priority=ticket.business_priority
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def get_ticket(db: Session, ticket_id: str):
    return db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    ).filter(models.Ticket.ticket_id == ticket_id).first()

def get_tickets(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    ).offset(skip).limit(limit).all()

def update_ticket(db: Session, ticket_id: str, ticket: schemas.TicketUpdate):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    # Update only provided fields
    if ticket.site_id is not None:
        db_ticket.site_id = ticket.site_id
    if ticket.inc_number is not None:
        db_ticket.inc_number = ticket.inc_number
    if ticket.so_number is not None:
        db_ticket.so_number = ticket.so_number
    if ticket.type is not None:
        db_ticket.type = ticket.type
    if ticket.status is not None:
        db_ticket.status = ticket.status
    if ticket.priority is not None:
        db_ticket.priority = ticket.priority
    if ticket.category is not None:
        db_ticket.category = ticket.category
    if ticket.assigned_user_id is not None:
        db_ticket.assigned_user_id = ticket.assigned_user_id
    if ticket.onsite_tech_id is not None:
        db_ticket.onsite_tech_id = ticket.onsite_tech_id
    if ticket.date_created is not None:
        db_ticket.date_created = ticket.date_created
    if ticket.date_scheduled is not None:
        db_ticket.date_scheduled = ticket.date_scheduled
    if ticket.date_closed is not None:
        db_ticket.date_closed = ticket.date_closed
    if ticket.time_spent is not None:
        db_ticket.time_spent = ticket.time_spent
    if ticket.notes is not None:
        db_ticket.notes = ticket.notes
    if ticket.color_flag is not None:
        db_ticket.color_flag = ticket.color_flag
    if ticket.special_flag is not None:
        db_ticket.special_flag = ticket.special_flag
    if ticket.last_updated_by is not None:
        db_ticket.last_updated_by = ticket.last_updated_by
    if ticket.last_updated_at is not None:
        db_ticket.last_updated_at = ticket.last_updated_at
    
    # Update SLA Management Fields
    if ticket.sla_target_hours is not None:
        db_ticket.sla_target_hours = ticket.sla_target_hours
    if ticket.sla_breach_hours is not None:
        db_ticket.sla_breach_hours = ticket.sla_breach_hours
    if ticket.first_response_time is not None:
        db_ticket.first_response_time = ticket.first_response_time
    if ticket.resolution_time is not None:
        db_ticket.resolution_time = ticket.resolution_time
    if ticket.escalation_level is not None:
        db_ticket.escalation_level = ticket.escalation_level
    if ticket.escalation_notified is not None:
        db_ticket.escalation_notified = ticket.escalation_notified
    if ticket.customer_impact is not None:
        db_ticket.customer_impact = ticket.customer_impact
    if ticket.business_priority is not None:
        db_ticket.business_priority = ticket.business_priority
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def delete_ticket(db: Session, ticket_id: str):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    # Delete related records first to avoid foreign key constraint violations
    # Delete ticket comments
    db.query(models.TicketComment).filter(models.TicketComment.ticket_id == ticket_id).delete()
    
    # Delete time entries
    db.query(models.TimeEntry).filter(models.TimeEntry.ticket_id == ticket_id).delete()
    
    # Delete ticket audits
    db.query(models.TicketAudit).filter(models.TicketAudit.ticket_id == ticket_id).delete()
    
    # Delete ticket attachments
    db.query(models.TicketAttachment).filter(models.TicketAttachment.ticket_id == ticket_id).delete()
    
    # Delete tasks related to this ticket
    db.query(models.Task).filter(models.Task.ticket_id == ticket_id).delete()
    
    # Delete inventory transactions
    db.query(models.InventoryTransaction).filter(models.InventoryTransaction.ticket_id == ticket_id).delete()
    
    # Now delete the ticket itself
    db.delete(db_ticket)
    db.commit()
    return db_ticket

# Shipments CRUD

def create_shipment(db: Session, shipment: schemas.ShipmentCreate):
    db_shipment = models.Shipment(
        shipment_id=str(uuid.uuid4()),
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
        remove_from_inventory=shipment.remove_from_inventory
    )
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def get_shipment(db: Session, shipment_id: str):
    return db.query(models.Shipment).filter(models.Shipment.shipment_id == shipment_id).first()

def get_shipments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Shipment).offset(skip).limit(limit).all()

def get_shipments_by_site(db: Session, site_id: str):
    """Get all shipments for a specific site"""
    return db.query(models.Shipment).filter(models.Shipment.site_id == site_id).all()

def update_shipment(db: Session, shipment_id: str, shipment: schemas.ShipmentCreate):
    db_shipment = db.query(models.Shipment).filter(models.Shipment.shipment_id == shipment_id).first()
    if not db_shipment:
        return None
    
    # Update fields
    db_shipment.site_id = shipment.site_id
    db_shipment.ticket_id = shipment.ticket_id
    db_shipment.item_id = shipment.item_id
    db_shipment.what_is_being_shipped = shipment.what_is_being_shipped
    db_shipment.shipping_preference = shipment.shipping_preference
    db_shipment.charges_out = shipment.charges_out
    db_shipment.charges_in = shipment.charges_in
    db_shipment.tracking_number = shipment.tracking_number
    db_shipment.return_tracking = shipment.return_tracking
    db_shipment.date_shipped = shipment.date_shipped
    db_shipment.date_returned = shipment.date_returned
    db_shipment.notes = shipment.notes
    db_shipment.source_ticket_type = shipment.source_ticket_type
    db_shipment.shipping_priority = shipment.shipping_priority
    db_shipment.parts_cost = shipment.parts_cost
    db_shipment.total_cost = shipment.total_cost
    db_shipment.status = shipment.status
    db_shipment.remove_from_inventory = shipment.remove_from_inventory
    
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def update_shipment_status(db: Session, shipment_id: str, status_update: schemas.ShipmentStatusUpdate, user_id: str):
    """Update shipment status and handle inventory removal if needed"""
    db_shipment = db.query(models.Shipment).filter(models.Shipment.shipment_id == shipment_id).first()
    if not db_shipment:
        return None
    
    # Store old status for audit
    old_status = db_shipment.status
    
    # Update status and tracking info
    db_shipment.status = status_update.status
    if status_update.tracking_number:
        db_shipment.tracking_number = status_update.tracking_number
    if status_update.return_tracking:
        db_shipment.return_tracking = status_update.return_tracking
    
    # If status is being changed to 'shipped' and date_shipped is not set, set it
    if status_update.status == 'shipped' and not db_shipment.date_shipped:
        db_shipment.date_shipped = datetime.now(timezone.utc)
    
    # Handle inventory removal if status is 'shipped' and remove_from_inventory is True
    if (status_update.status == 'shipped' and 
        db_shipment.remove_from_inventory and 
        db_shipment.item_id and 
        old_status != 'shipped'):
        
        # Get the inventory item
        inventory_item = db.query(models.InventoryItem).filter(
            models.InventoryItem.item_id == db_shipment.item_id
        ).first()
        
        if inventory_item and inventory_item.quantity_on_hand > 0:
            # Create inventory transaction
            transaction = models.InventoryTransaction(
                transaction_id=str(uuid.uuid4()),
                item_id=db_shipment.item_id,
                user_id=user_id,
                shipment_id=db_shipment.shipment_id,
                date=datetime.now(timezone.utc).date(),
                quantity=1,
                type=models.InventoryTransactionType.out,
                notes=f"Removed for shipment {db_shipment.shipment_id}"
            )
            db.add(transaction)
            
            # Update inventory quantity
            inventory_item.quantity_on_hand -= 1
    
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def delete_shipment(db: Session, shipment_id: str):
    db_shipment = db.query(models.Shipment).filter(models.Shipment.shipment_id == shipment_id).first()
    if not db_shipment:
        return None
    
    db.delete(db_shipment)
    db.commit()
    return db_shipment

# InventoryItem CRUD

def create_inventory_item(db: Session, item: schemas.InventoryItemCreate):
    db_item = models.InventoryItem(
        item_id=str(uuid.uuid4()),
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
    return db.query(models.InventoryItem).filter(models.InventoryItem.item_id == item_id).first()

def get_inventory_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.InventoryItem).offset(skip).limit(limit).all()

def update_inventory_item(db: Session, item_id: str, item: schemas.InventoryItemCreate):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.item_id == item_id).first()
    if not db_item:
        return None
    
    # Update fields
    db_item.name = item.name
    db_item.sku = item.sku
    db_item.description = item.description
    db_item.quantity_on_hand = item.quantity_on_hand
    db_item.cost = item.cost
    db_item.location = item.location
    db_item.barcode = item.barcode
    
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_inventory_item(db: Session, item_id: str):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.item_id == item_id).first()
    if not db_item:
        return None
    
    db.delete(db_item)
    db.commit()
    return db_item

# FieldTech CRUD

def create_field_tech(db: Session, tech: schemas.FieldTechCreate):
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
    return db.query(models.FieldTech).filter(models.FieldTech.field_tech_id == field_tech_id).first()

def get_field_techs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.FieldTech).offset(skip).limit(limit).all()

def update_field_tech(db: Session, field_tech_id: str, tech: schemas.FieldTechCreate):
    db_tech = db.query(models.FieldTech).filter(models.FieldTech.field_tech_id == field_tech_id).first()
    if not db_tech:
        return None
    
    # Update fields
    db_tech.name = tech.name
    db_tech.phone = tech.phone
    db_tech.email = tech.email
    db_tech.region = tech.region
    db_tech.city = tech.city
    db_tech.state = tech.state
    db_tech.zip = tech.zip
    db_tech.notes = tech.notes
    
    db.commit()
    db.refresh(db_tech)
    return db_tech

def delete_field_tech(db: Session, field_tech_id: str):
    db_tech = db.query(models.FieldTech).filter(models.FieldTech.field_tech_id == field_tech_id).first()
    if not db_tech:
        return None
    
    db.delete(db_tech)
    db.commit()
    return db_tech

# Task CRUD

def create_task(db: Session, task: schemas.TaskCreate):
    db_task = models.Task(
        task_id=str(uuid.uuid4()),
        ticket_id=task.ticket_id,
        assigned_user_id=task.assigned_user_id,
        description=task.description,
        status=task.status,
        due_date=task.due_date,
        created_at=task.created_at,
        updated_at=task.updated_at
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_task(db: Session, task_id: str):
    return db.query(models.Task).filter(models.Task.task_id == task_id).first()

def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Task).offset(skip).limit(limit).all()

def update_task(db: Session, task_id: str, task: schemas.TaskCreate):
    db_task = db.query(models.Task).filter(models.Task.task_id == task_id).first()
    if not db_task:
        return None
    
    # Update fields
    db_task.ticket_id = task.ticket_id
    db_task.assigned_user_id = task.assigned_user_id
    db_task.description = task.description
    db_task.status = task.status
    db_task.due_date = task.due_date
    db_task.created_at = task.created_at
    db_task.updated_at = task.updated_at
    
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: str):
    db_task = db.query(models.Task).filter(models.Task.task_id == task_id).first()
    if not db_task:
        return None
    
    db.delete(db_task)
    db.commit()
    return db_task

# Equipment CRUD

def create_equipment(db: Session, equipment: schemas.EquipmentCreate):
    db_equipment = models.Equipment(
        equipment_id=str(uuid.uuid4()),
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
    return db.query(models.Equipment).filter(models.Equipment.equipment_id == equipment_id).first()

def get_equipments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Equipment).offset(skip).limit(limit).all()

def update_equipment(db: Session, equipment_id: str, equipment: schemas.EquipmentCreate):
    db_equipment = db.query(models.Equipment).filter(models.Equipment.equipment_id == equipment_id).first()
    if not db_equipment:
        return None
    
    # Update fields
    db_equipment.site_id = equipment.site_id
    db_equipment.type = equipment.type
    db_equipment.make_model = equipment.make_model
    db_equipment.serial_number = equipment.serial_number
    db_equipment.install_date = equipment.install_date
    db_equipment.notes = equipment.notes
    
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def delete_equipment(db: Session, equipment_id: str):
    db_equipment = db.query(models.Equipment).filter(models.Equipment.equipment_id == equipment_id).first()
    if not db_equipment:
        return None
    
    db.delete(db_equipment)
    db.commit()
    return db_equipment

# TicketAudit CRUD

def create_ticket_audit(db: Session, audit: schemas.TicketAuditCreate):
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
    return db.query(models.TicketAudit).filter(models.TicketAudit.audit_id == audit_id).first()

def get_ticket_audits(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.TicketAudit).offset(skip).limit(limit).all()

# SLA Rule CRUD

def create_sla_rule(db: Session, rule: schemas.SLARuleCreate):
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
        is_active=rule.is_active
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def get_sla_rule(db: Session, rule_id: str):
    return db.query(models.SLARule).filter(models.SLARule.rule_id == rule_id).first()

def get_sla_rules(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.SLARule).offset(skip).limit(limit).all()

def update_sla_rule(db: Session, rule_id: str, rule: schemas.SLARuleUpdate):
    db_rule = db.query(models.SLARule).filter(models.SLARule.rule_id == rule_id).first()
    if not db_rule:
        return None
    
    # Update fields if provided
    if rule.name is not None:
        db_rule.name = rule.name
    if rule.description is not None:
        db_rule.description = rule.description
    if rule.ticket_type is not None:
        db_rule.ticket_type = rule.ticket_type
    if rule.customer_impact is not None:
        db_rule.customer_impact = rule.customer_impact
    if rule.business_priority is not None:
        db_rule.business_priority = rule.business_priority
    if rule.sla_target_hours is not None:
        db_rule.sla_target_hours = rule.sla_target_hours
    if rule.sla_breach_hours is not None:
        db_rule.sla_breach_hours = rule.sla_breach_hours
    if rule.escalation_levels is not None:
        db_rule.escalation_levels = rule.escalation_levels
    if rule.is_active is not None:
        db_rule.is_active = rule.is_active
    
    db.commit()
    db.refresh(db_rule)
    return db_rule

def delete_sla_rule(db: Session, rule_id: str):
    db_rule = db.query(models.SLARule).filter(models.SLARule.rule_id == rule_id).first()
    if not db_rule:
        return None
    
    db.delete(db_rule)
    db.commit()
    return db_rule

def get_matching_sla_rule(db: Session, ticket_type, customer_impact, business_priority):
    """Get the most specific SLA rule that matches the ticket criteria"""
    # First try to find an exact match
    rule = db.query(models.SLARule).filter(
        models.SLARule.ticket_type == ticket_type,
        models.SLARule.customer_impact == customer_impact,
        models.SLARule.business_priority == business_priority,
        models.SLARule.is_active == True
    ).first()
    
    if rule:
        return rule
    
    # Try partial matches (ticket_type + customer_impact)
    rule = db.query(models.SLARule).filter(
        models.SLARule.ticket_type == ticket_type,
        models.SLARule.customer_impact == customer_impact,
        models.SLARule.business_priority.is_(None),
        models.SLARule.is_active == True
    ).first()
    
    if rule:
        return rule
    
    # Try ticket_type only
    rule = db.query(models.SLARule).filter(
        models.SLARule.ticket_type == ticket_type,
        models.SLARule.customer_impact.is_(None),
        models.SLARule.business_priority.is_(None),
        models.SLARule.is_active == True
    ).first()
    
    if rule:
        return rule
    
    # Return default rule (no specific criteria)
    return db.query(models.SLARule).filter(
        models.SLARule.ticket_type.is_(None),
        models.SLARule.customer_impact.is_(None),
        models.SLARule.business_priority.is_(None),
        models.SLARule.is_active == True
    ).first() 

# Time Entry CRUD

def create_time_entry(db: Session, time_entry_data: dict):
    db_time_entry = models.TimeEntry(
        entry_id=str(uuid.uuid4()),
        ticket_id=time_entry_data["ticket_id"],
        user_id=time_entry_data["user_id"],
        start_time=time_entry_data.get("start_time"),
        end_time=time_entry_data.get("end_time"),
        duration_minutes=time_entry_data.get("duration_minutes", 0),
        description=time_entry_data.get("description", ""),
        is_billable=time_entry_data.get("is_billable", False),
        hourly_rate=time_entry_data.get("hourly_rate", 0.0),
        created_at=time_entry_data.get("created_at")
    )
    db.add(db_time_entry)
    db.commit()
    db.refresh(db_time_entry)
    return db_time_entry

def get_time_entry(db: Session, entry_id: str):
    return db.query(models.TimeEntry).filter(models.TimeEntry.entry_id == entry_id).first()

def get_time_entries_by_ticket(db: Session, ticket_id: str):
    return db.query(models.TimeEntry).filter(models.TimeEntry.ticket_id == ticket_id).order_by(models.TimeEntry.created_at.desc()).all()

def update_time_entry(db: Session, entry_id: str, time_entry_data: dict):
    db_time_entry = db.query(models.TimeEntry).filter(models.TimeEntry.entry_id == entry_id).first()
    if not db_time_entry:
        return None
    
    # Update fields if provided
    for field, value in time_entry_data.items():
        if hasattr(db_time_entry, field) and value is not None:
            setattr(db_time_entry, field, value)
    
    db.commit()
    db.refresh(db_time_entry)
    return db_time_entry

def delete_time_entry(db: Session, entry_id: str):
    db_time_entry = db.query(models.TimeEntry).filter(models.TimeEntry.entry_id == entry_id).first()
    if not db_time_entry:
        return None
    
    db.delete(db_time_entry)
    db.commit()
    return db_time_entry

# Ticket Comment CRUD

def create_ticket_comment(db: Session, comment_data: dict):
    db_comment = models.TicketComment(
        comment_id=str(uuid.uuid4()),
        ticket_id=comment_data["ticket_id"],
        user_id=comment_data["user_id"],
        comment=comment_data.get("comment", ""),
        is_internal=comment_data.get("is_internal", False),
        created_at=comment_data.get("created_at")
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_ticket_comment(db: Session, comment_id: str):
    return db.query(models.TicketComment).filter(models.TicketComment.comment_id == comment_id).first()

def get_comments_by_ticket(db: Session, ticket_id: str):
    return db.query(models.TicketComment).filter(models.TicketComment.ticket_id == ticket_id).options(joinedload(models.TicketComment.user)).order_by(models.TicketComment.created_at.desc()).all()

def update_ticket_comment(db: Session, comment_id: str, comment_data: dict):
    db_comment = db.query(models.TicketComment).filter(models.TicketComment.comment_id == comment_id).first()
    if not db_comment:
        return None
    
    # Update fields if provided
    for field, value in comment_data.items():
        if hasattr(db_comment, field) and value is not None:
            setattr(db_comment, field, value)
    
    db.commit()
    db.refresh(db_comment)
    return db_comment

def delete_ticket_comment(db: Session, comment_id: str):
    db_comment = db.query(models.TicketComment).filter(models.TicketComment.comment_id == comment_id).first()
    if not db_comment:
        return None
    
    db.delete(db_comment)
    db.commit()
    return db_comment

# Site Equipment CRUD

def create_site_equipment(db: Session, equipment: schemas.SiteEquipmentCreate):
    db_equipment = models.SiteEquipment(
        equipment_id=str(uuid.uuid4()),
        site_id=equipment.site_id,
        equipment_type=equipment.equipment_type,
        model=equipment.model,
        part_number=equipment.part_number,
        serial_number=equipment.serial_number,
        installation_date=equipment.installation_date,
        maintenance_notes=equipment.maintenance_notes,
        rack_location=equipment.rack_location,
        additional_details=equipment.additional_details
    )
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def get_site_equipment(db: Session, equipment_id: str):
    return db.query(models.SiteEquipment).filter(models.SiteEquipment.equipment_id == equipment_id).first()

def get_site_equipment_by_site(db: Session, site_id: str):
    return db.query(models.SiteEquipment).filter(models.SiteEquipment.site_id == site_id).all()

def update_site_equipment(db: Session, equipment_id: str, equipment: schemas.SiteEquipmentUpdate):
    db_equipment = db.query(models.SiteEquipment).filter(models.SiteEquipment.equipment_id == equipment_id).first()
    if not db_equipment:
        return None
    
    # Update fields if provided
    for field, value in equipment.dict(exclude_unset=True).items():
        if hasattr(db_equipment, field) and value is not None:
            setattr(db_equipment, field, value)
    
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def delete_site_equipment(db: Session, equipment_id: str):
    db_equipment = db.query(models.SiteEquipment).filter(models.SiteEquipment.equipment_id == equipment_id).first()
    if not db_equipment:
        return None
    
    db.delete(db_equipment)
    db.commit()
    return db_equipment

# Ticket Attachment CRUD

def create_ticket_attachment(db: Session, attachment: schemas.TicketAttachmentCreate):
    db_attachment = models.TicketAttachment(
        attachment_id=str(uuid.uuid4()),
        ticket_id=attachment.ticket_id,
        file_name=attachment.file_name,
        file_type=attachment.file_type,
        file_size=attachment.file_size,
        external_url=attachment.external_url,
        description=attachment.description
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment

def get_ticket_attachment(db: Session, attachment_id: str):
    return db.query(models.TicketAttachment).filter(models.TicketAttachment.attachment_id == attachment_id).first()

def get_ticket_attachments(db: Session, ticket_id: str):
    return db.query(models.TicketAttachment).filter(models.TicketAttachment.ticket_id == ticket_id).all()

def update_ticket_attachment(db: Session, attachment_id: str, attachment: schemas.TicketAttachmentUpdate):
    db_attachment = db.query(models.TicketAttachment).filter(models.TicketAttachment.attachment_id == attachment_id).first()
    if not db_attachment:
        return None
    
    # Update fields if provided
    for field, value in attachment.dict(exclude_unset=True).items():
        if hasattr(db_attachment, field) and value is not None:
            setattr(db_attachment, field, value)
    
    db.commit()
    db.refresh(db_attachment)
    return db_attachment

def delete_ticket_attachment(db: Session, attachment_id: str):
    db_attachment = db.query(models.TicketAttachment).filter(models.TicketAttachment.attachment_id == attachment_id).first()
    if not db_attachment:
        return None
    
    db.delete(db_attachment)
    db.commit()
    return db_attachment

# Enhanced Ticket Operations

def claim_ticket(db: Session, ticket_id: str, claimed_by: str):
    """Claim a ticket for in-house tech work"""
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    db_ticket.claimed_by = claimed_by
    db_ticket.claimed_at = datetime.now(timezone.utc)
    db_ticket.status = models.TicketStatus.in_progress
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def check_in_ticket(db: Session, ticket_id: str, onsite_tech_id: str):
    """Check in a field tech for onsite work"""
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    db_ticket.check_in_time = datetime.now(timezone.utc)
    db_ticket.onsite_tech_id = onsite_tech_id
    db_ticket.status = models.TicketStatus.checked_in
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def check_out_ticket(db: Session, ticket_id: str, check_out_data: dict):
    """Check out a field tech from onsite work"""
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    db_ticket.check_out_time = datetime.now(timezone.utc)
    
    # Calculate onsite duration
    if db_ticket.check_in_time and db_ticket.check_out_time:
        duration = db_ticket.check_out_time - db_ticket.check_in_time
        db_ticket.onsite_duration_minutes = int(duration.total_seconds() / 60)
    
    # Update other fields
    if check_out_data.get('time_spent'):
        db_ticket.time_spent = check_out_data['time_spent']
    if check_out_data.get('parts_used'):
        db_ticket.parts_needed = check_out_data['parts_used']
    if check_out_data.get('notes'):
        db_ticket.notes = check_out_data['notes']
    
    # Set status based on completion
    if check_out_data.get('is_completed', True):
        db_ticket.status = models.TicketStatus.completed
    else:
        db_ticket.status = models.TicketStatus.needs_parts
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def get_daily_tickets(db: Session, date: date = None, ticket_type: str = None, priority: str = None, status: str = None, assigned_user_id: str = None):
    """Get tickets for daily operations dashboard"""
    query = db.query(models.Ticket).options(
        joinedload(models.Ticket.site),
        joinedload(models.Ticket.assigned_user),
        joinedload(models.Ticket.onsite_tech)
    )
    
    if date:
        # Include tickets created on the date OR scheduled for the date
        from sqlalchemy import or_
        query = query.filter(or_(
            models.Ticket.date_created == date,
            models.Ticket.date_scheduled == date
        ))
    if ticket_type:
        query = query.filter(models.Ticket.type == ticket_type)
    if priority:
        query = query.filter(models.Ticket.priority == priority)
    if status:
        query = query.filter(models.Ticket.status == status)
    if assigned_user_id:
        query = query.filter(models.Ticket.assigned_user_id == assigned_user_id)
    
    return query.order_by(models.Ticket.priority.desc(), models.Ticket.date_created).all()

def update_ticket_costs(db: Session, ticket_id: str, cost_data: dict):
    """Update ticket cost information"""
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not db_ticket:
        return None
    
    # Update cost fields
    if cost_data.get('billing_rate') is not None:
        db_ticket.billing_rate = cost_data['billing_rate']
    if cost_data.get('total_cost') is not None:
        db_ticket.total_cost = cost_data['total_cost']
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket
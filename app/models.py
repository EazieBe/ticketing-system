from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from datetime import datetime

class UserRole(enum.Enum):
    tech = 'tech'
    dispatcher = 'dispatcher'
    billing = 'billing'
    admin = 'admin'

class ImpactLevel(enum.Enum):
    low = 'low'
    medium = 'medium'
    high = 'high'
    critical = 'critical'

class BusinessPriority(enum.Enum):
    low = 'low'
    medium = 'medium'
    high = 'high'
    urgent = 'urgent'

class User(Base):
    __tablename__ = 'users'
    user_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    phone = Column(String)
    region = Column(String)
    preferences = Column(Text)
    must_change_password = Column(Boolean, default=False)
    tickets = relationship('Ticket', back_populates='assigned_user', foreign_keys='Ticket.assigned_user_id')
    last_updated_tickets = relationship('Ticket', foreign_keys='Ticket.last_updated_by')
    tasks = relationship('Task', back_populates='assigned_user')
    audits = relationship('TicketAudit', back_populates='user')
    inventory_transactions = relationship('InventoryTransaction', back_populates='user')

class FieldTech(Base):
    __tablename__ = 'field_techs'
    field_tech_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    email = Column(String)
    region = Column(String)
    city = Column(String)
    state = Column(String)
    zip = Column(String)
    notes = Column(Text)
    onsite_tickets = relationship('Ticket', back_populates='onsite_tech')

class Site(Base):
    __tablename__ = 'sites'
    site_id = Column(String, primary_key=True, index=True)
    ip_address = Column(String)
    location = Column(String)
    brand = Column(String)
    main_number = Column(String)
    mp = Column(String)
    service_address = Column(String)
    city = Column(String)
    state = Column(String)
    zip = Column(String)
    region = Column(String)
    notes = Column(Text)
    # Equipment fields
    equipment_notes = Column(Text)
    phone_system = Column(String)
    phone_types = Column(String)
    network_equipment = Column(String)
    additional_equipment = Column(String)
    equipment = relationship('Equipment', back_populates='site')
    tickets = relationship('Ticket', back_populates='site')
    shipments = relationship('Shipment', back_populates='site')

class Equipment(Base):
    __tablename__ = 'equipment'
    equipment_id = Column(String, primary_key=True, index=True)
    site_id = Column(String, ForeignKey('sites.site_id'))
    type = Column(String)
    make_model = Column(String)
    serial_number = Column(String)
    install_date = Column(Date)
    notes = Column(Text)
    site = relationship('Site', back_populates='equipment')

class TicketType(enum.Enum):
    inhouse = 'inhouse'
    onsite = 'onsite'
    shipping = 'shipping'
    projects = 'projects'
    nro = 'nro'
    misc = 'misc'

class TicketStatus(enum.Enum):
    open = 'open'
    in_progress = 'in_progress'
    pending = 'pending'
    closed = 'closed'
    approved = 'approved'
    checked_in = 'checked_in'
    return_visit = 'return'
    shipped = 'shipped'
    delivered = 'delivered'
    planning = 'planning'
    review = 'review'
    completed = 'completed'
    archived = 'archived'

class Ticket(Base):
    __tablename__ = 'tickets'
    ticket_id = Column(String, primary_key=True, index=True)
    site_id = Column(String, ForeignKey('sites.site_id'))
    inc_number = Column(String)
    so_number = Column(String)
    type = Column(Enum(TicketType), nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.open)
    priority = Column(String)
    category = Column(String)
    assigned_user_id = Column(String, ForeignKey('users.user_id'))
    onsite_tech_id = Column(String, ForeignKey('field_techs.field_tech_id'))
    date_created = Column(Date, nullable=False)
    date_scheduled = Column(Date)
    date_closed = Column(Date)
    time_spent = Column(Integer)
    notes = Column(Text)
    color_flag = Column(String)
    special_flag = Column(String)
    last_updated_by = Column(String, ForeignKey('users.user_id'))
    last_updated_at = Column(DateTime)
    
    # SLA Management Fields
    sla_target_hours = Column(Integer, default=24)  # Target response time in hours
    sla_breach_hours = Column(Integer, default=48)  # Escalation time in hours
    first_response_time = Column(DateTime)  # When first response was made
    resolution_time = Column(DateTime)  # When ticket was resolved
    escalation_level = Column(Integer, default=0)  # Current escalation level
    escalation_notified = Column(Boolean, default=False)  # Whether escalation was notified
    customer_impact = Column(Enum(ImpactLevel), default=ImpactLevel.medium)
    business_priority = Column(Enum(BusinessPriority), default=BusinessPriority.medium)
    site = relationship('Site', back_populates='tickets')
    assigned_user = relationship('User', foreign_keys=[assigned_user_id], back_populates='tickets')
    last_updated_user = relationship('User', foreign_keys=[last_updated_by], back_populates='last_updated_tickets')
    onsite_tech = relationship('FieldTech', back_populates='onsite_tickets')
    audits = relationship('TicketAudit', back_populates='ticket')
    tasks = relationship('Task', back_populates='ticket')
    shipments = relationship('Shipment', back_populates='ticket')
    inventory_transactions = relationship('InventoryTransaction', back_populates='ticket')

class TicketAudit(Base):
    __tablename__ = 'ticket_audits'
    audit_id = Column(String, primary_key=True, index=True)
    ticket_id = Column(String, ForeignKey('tickets.ticket_id'))
    user_id = Column(String, ForeignKey('users.user_id'))
    change_time = Column(DateTime)
    field_changed = Column(String)
    old_value = Column(String)
    new_value = Column(String)
    ticket = relationship('Ticket', back_populates='audits')
    user = relationship('User', back_populates='audits')

class Shipment(Base):
    __tablename__ = 'shipments'
    shipment_id = Column(String, primary_key=True, index=True)
    site_id = Column(String, ForeignKey('sites.site_id'))
    ticket_id = Column(String, ForeignKey('tickets.ticket_id'))
    item_id = Column(String, ForeignKey('inventory_items.item_id'))
    what_is_being_shipped = Column(String, nullable=False)
    shipping_preference = Column(String)
    charges_out = Column(Float)
    charges_in = Column(Float)
    tracking_number = Column(String)
    return_tracking = Column(String)
    date_shipped = Column(Date)
    date_returned = Column(Date)
    notes = Column(Text)
    site = relationship('Site', back_populates='shipments')
    ticket = relationship('Ticket', back_populates='shipments')
    item = relationship('InventoryItem', back_populates='shipments')
    inventory_transactions = relationship('InventoryTransaction', back_populates='shipment')

class InventoryItem(Base):
    __tablename__ = 'inventory_items'
    item_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String)
    description = Column(Text)
    quantity_on_hand = Column(Integer, default=0)
    cost = Column(Float)
    location = Column(String)
    barcode = Column(String)
    shipments = relationship('Shipment', back_populates='item')
    inventory_transactions = relationship('InventoryTransaction', back_populates='item')

class InventoryTransactionType(enum.Enum):
    in_ = 'in'
    out = 'out'
    adjust = 'adjust'

class InventoryTransaction(Base):
    __tablename__ = 'inventory_transactions'
    transaction_id = Column(String, primary_key=True, index=True)
    item_id = Column(String, ForeignKey('inventory_items.item_id'))
    user_id = Column(String, ForeignKey('users.user_id'))
    shipment_id = Column(String, ForeignKey('shipments.shipment_id'))
    ticket_id = Column(String, ForeignKey('tickets.ticket_id'))
    date = Column(Date)
    quantity = Column(Integer)
    type = Column(Enum(InventoryTransactionType))
    notes = Column(Text)
    item = relationship('InventoryItem', back_populates='inventory_transactions')
    user = relationship('User', back_populates='inventory_transactions')
    shipment = relationship('Shipment', back_populates='inventory_transactions')
    ticket = relationship('Ticket', back_populates='inventory_transactions')

class TaskStatus(enum.Enum):
    open = 'open'
    in_progress = 'in_progress'
    completed = 'completed'

class Task(Base):
    __tablename__ = 'tasks'
    task_id = Column(String, primary_key=True, index=True)
    ticket_id = Column(String, ForeignKey('tickets.ticket_id'))
    assigned_user_id = Column(String, ForeignKey('users.user_id'))
    description = Column(Text, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.open)
    due_date = Column(Date)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    ticket = relationship('Ticket', back_populates='tasks')
    assigned_user = relationship('User', back_populates='tasks')

class SLARule(Base):
    __tablename__ = 'sla_rules'
    rule_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    ticket_type = Column(Enum(TicketType))
    customer_impact = Column(Enum(ImpactLevel))
    business_priority = Column(Enum(BusinessPriority))
    sla_target_hours = Column(Integer, default=24)
    sla_breach_hours = Column(Integer, default=48)
    escalation_levels = Column(Integer, default=3)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 
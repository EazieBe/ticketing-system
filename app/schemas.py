from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime
import enum

class UserRole(str, enum.Enum):
    tech = 'tech'
    dispatcher = 'dispatcher'
    billing = 'billing'
    admin = 'admin'

class ImpactLevel(str, enum.Enum):
    low = 'low'
    medium = 'medium'
    high = 'high'
    critical = 'critical'

class BusinessPriority(str, enum.Enum):
    low = 'low'
    medium = 'medium'
    high = 'high'
    urgent = 'urgent'

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    phone: Optional[str] = None
    region: Optional[str] = None
    preferences: Optional[str] = None
    must_change_password: Optional[bool] = False
    active: Optional[bool] = True

class UserCreate(UserBase):
    password: Optional[str] = None

class AdminUserCreate(UserBase):
    """Schema for admin-created users with proper password handling"""
    password: Optional[str] = None  # Will be ignored - temp password always generated

class UserOut(UserBase):
    user_id: str
    temp_password: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class FieldTechBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    region: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None

class FieldTechCreate(FieldTechBase):
    pass

class FieldTechOut(FieldTechBase):
    field_tech_id: str
    
    model_config = ConfigDict(from_attributes=True)

class SiteBase(BaseModel):
    site_id: str
    ip_address: Optional[str] = None
    location: Optional[str] = None
    brand: Optional[str] = None
    main_number: Optional[str] = None
    mp: Optional[str] = None
    service_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    region: Optional[str] = None
    notes: Optional[str] = None
    # Equipment fields
    equipment_notes: Optional[str] = None
    phone_system: Optional[str] = None
    phone_types: Optional[str] = None
    network_equipment: Optional[str] = None
    additional_equipment: Optional[str] = None

class SiteCreate(SiteBase):
    pass

class SiteOut(SiteBase):
    model_config = ConfigDict(from_attributes=True)

class EquipmentBase(BaseModel):
    type: str
    make_model: Optional[str] = None
    serial_number: Optional[str] = None
    install_date: Optional[date] = None
    notes: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    site_id: str

class EquipmentOut(EquipmentBase):
    equipment_id: str
    site_id: Optional[str] = None

class TicketType(str, enum.Enum):
    inhouse = 'inhouse'
    onsite = 'onsite'
    projects = 'projects'
    misc = 'misc'

class TicketStatus(str, enum.Enum):
    open = 'open'
    scheduled = 'scheduled'
    checked_in = 'checked_in'
    in_progress = 'in_progress'
    pending = 'pending'
    needs_parts = 'needs_parts'
    go_back_scheduled = 'go_back_scheduled'
    completed = 'completed'
    closed = 'closed'

class TicketPriority(str, enum.Enum):
    normal = 'normal'
    critical = 'critical'
    emergency = 'emergency'

class TicketBase(BaseModel):
    site_id: str
    inc_number: Optional[str] = None
    so_number: Optional[str] = None
    type: TicketType = TicketType.onsite
    status: Optional[TicketStatus] = TicketStatus.open
    priority: Optional[TicketPriority] = TicketPriority.normal
    category: Optional[str] = None
    assigned_user_id: Optional[str] = None
    onsite_tech_id: Optional[str] = None
    date_created: Optional[date] = None
    date_scheduled: Optional[date] = None
    date_closed: Optional[date] = None
    time_spent: Optional[int] = None
    notes: Optional[str] = None
    color_flag: Optional[str] = None
    special_flag: Optional[str] = None
    last_updated_by: Optional[str] = None
    last_updated_at: Optional[datetime] = None
    
    # New Ticket Type System Fields
    claimed_by: Optional[str] = None
    claimed_at: Optional[datetime] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    onsite_duration_minutes: Optional[int] = None
    billing_rate: Optional[float] = 0.0
    total_cost: Optional[float] = 0.0
    
    # Enhanced Workflow Fields
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_billable: Optional[bool] = True
    requires_approval: Optional[bool] = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Enhanced SLA Management Fields
    sla_target_hours: Optional[int] = 24
    sla_breach_hours: Optional[int] = 48
    first_response_time: Optional[datetime] = None
    resolution_time: Optional[datetime] = None
    escalation_level: Optional[int] = 0
    escalation_notified: Optional[bool] = False
    customer_impact: Optional[ImpactLevel] = ImpactLevel.medium
    business_priority: Optional[BusinessPriority] = BusinessPriority.medium
    
    # New Workflow Fields
    workflow_step: Optional[str] = 'created'
    next_action_required: Optional[str] = None
    due_date: Optional[datetime] = None
    is_urgent: Optional[bool] = False
    is_vip: Optional[bool] = False
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    
    # Equipment and Parts
    equipment_affected: Optional[str] = None
    parts_needed: Optional[str] = None
    parts_ordered: Optional[bool] = False
    parts_received: Optional[bool] = False
    
    # Quality and Follow-up
    quality_score: Optional[int] = None
    customer_satisfaction: Optional[int] = None
    follow_up_required: Optional[bool] = False
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    site_id: Optional[str] = None
    inc_number: Optional[str] = None
    so_number: Optional[str] = None
    type: Optional[TicketType] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    category: Optional[str] = None
    assigned_user_id: Optional[str] = None
    onsite_tech_id: Optional[str] = None
    date_created: Optional[date] = None
    date_scheduled: Optional[date] = None
    date_closed: Optional[date] = None
    time_spent: Optional[int] = None
    notes: Optional[str] = None
    color_flag: Optional[str] = None
    special_flag: Optional[str] = None
    last_updated_by: Optional[str] = None
    last_updated_at: Optional[datetime] = None
    
    # New Ticket Type System Fields
    claimed_by: Optional[str] = None
    claimed_at: Optional[datetime] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    onsite_duration_minutes: Optional[int] = None
    billing_rate: Optional[float] = None
    total_cost: Optional[float] = None
    
    # Enhanced Workflow Fields
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_billable: Optional[bool] = None
    requires_approval: Optional[bool] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Enhanced SLA Management Fields
    sla_target_hours: Optional[int] = None
    sla_breach_hours: Optional[int] = None
    first_response_time: Optional[datetime] = None
    resolution_time: Optional[datetime] = None
    escalation_level: Optional[int] = None
    escalation_notified: Optional[bool] = None
    customer_impact: Optional[ImpactLevel] = None
    business_priority: Optional[BusinessPriority] = None
    
    # New Workflow Fields
    workflow_step: Optional[str] = None
    next_action_required: Optional[str] = None
    due_date: Optional[datetime] = None
    is_urgent: Optional[bool] = None
    is_vip: Optional[bool] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    
    # Equipment and Parts
    equipment_affected: Optional[str] = None
    parts_needed: Optional[str] = None
    parts_ordered: Optional[bool] = None
    parts_received: Optional[bool] = None
    
    # Quality and Follow-up
    quality_score: Optional[int] = None
    customer_satisfaction: Optional[int] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None

class TicketOut(TicketBase):
    ticket_id: str
    created_at: Optional[datetime] = None  # Timestamp when ticket was created
    site: Optional['SiteOut'] = None
    assigned_user: Optional['UserOut'] = None
    onsite_tech: Optional['FieldTechOut'] = None
    
    model_config = ConfigDict(from_attributes=True)

class TicketAuditBase(BaseModel):
    ticket_id: Optional[str] = None
    user_id: Optional[str] = None
    change_time: datetime
    field_changed: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None

class TicketAuditCreate(TicketAuditBase):
    pass

class TicketAuditOut(TicketAuditBase):
    audit_id: str

class ShipmentBase(BaseModel):
    site_id: str
    ticket_id: Optional[str] = None
    item_id: Optional[str] = None
    what_is_being_shipped: str
    shipping_preference: Optional[str] = None
    charges_out: Optional[float] = None
    charges_in: Optional[float] = None
    tracking_number: Optional[str] = None
    return_tracking: Optional[str] = None
    date_shipped: Optional[datetime] = None
    date_returned: Optional[date] = None
    notes: Optional[str] = None
    
    # Enhanced Shipping Integration Fields
    source_ticket_type: Optional[str] = None
    shipping_priority: Optional[str] = 'normal'
    parts_cost: Optional[float] = 0.0
    total_cost: Optional[float] = 0.0
    status: Optional[str] = 'pending'
    remove_from_inventory: Optional[bool] = False

class ShipmentCreate(ShipmentBase):
    pass

class ShipmentOut(ShipmentBase):
    shipment_id: str
    date_created: Optional[datetime] = None

class ShipmentStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    return_tracking: Optional[str] = None

class InventoryItemBase(BaseModel):
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    quantity_on_hand: Optional[int] = 0
    cost: Optional[float] = None
    location: Optional[str] = None
    barcode: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemOut(InventoryItemBase):
    item_id: str

class InventoryTransactionType(str, enum.Enum):
    in_ = 'in'
    out = 'out'
    adjust = 'adjust'

class InventoryTransactionBase(BaseModel):
    item_id: str
    user_id: str
    shipment_id: Optional[str] = None
    ticket_id: Optional[str] = None
    date: date
    quantity: int
    type: InventoryTransactionType
    notes: Optional[str] = None

class InventoryTransactionCreate(InventoryTransactionBase):
    pass

class InventoryTransactionOut(InventoryTransactionBase):
    transaction_id: str

class TaskStatus(str, enum.Enum):
    open = 'open'
    in_progress = 'in_progress'
    completed = 'completed'

class TaskBase(BaseModel):
    ticket_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    description: str
    status: Optional[TaskStatus] = TaskStatus.open
    due_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskOut(TaskBase):
    task_id: str 

class TicketCommentBase(BaseModel):
    comment: str
    is_internal: Optional[bool] = False

class TicketCommentCreate(TicketCommentBase):
    pass

class TicketCommentUpdate(BaseModel):
    comment: Optional[str] = None
    is_internal: Optional[bool] = None

class TicketCommentOut(TicketCommentBase):
    comment_id: str
    ticket_id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user: Optional['UserOut'] = None
    
    model_config = ConfigDict(from_attributes=True)

class TimeEntryBase(BaseModel):
    ticket_id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None
    is_billable: Optional[bool] = True
    created_at: Optional[datetime] = None

class TimeEntryCreate(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None
    is_billable: Optional[bool] = True

class TimeEntryUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None
    is_billable: Optional[bool] = None
    hourly_rate: Optional[float] = None

class TimeEntryOut(TimeEntryBase):
    entry_id: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int  # seconds until access token expires
    must_change_password: Optional[bool] = False

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class StatusUpdate(BaseModel):
    status: TicketStatus

class TicketClaim(BaseModel):
    claimed_by: str

class TicketCheckIn(BaseModel):
    check_in_time: datetime
    onsite_tech_id: str

class TicketCheckOut(BaseModel):
    check_out_time: datetime
    time_spent: Optional[int] = None
    parts_used: Optional[str] = None
    notes: Optional[str] = None
    needs_shipping: Optional[bool] = False
    is_completed: Optional[bool] = True

class DailyTicketFilter(BaseModel):
    date: Optional[date] = None
    ticket_type: Optional[TicketType] = None
    priority: Optional[TicketPriority] = None
    status: Optional[TicketStatus] = None
    assigned_user_id: Optional[str] = None

class TicketCostUpdate(BaseModel):
    billing_rate: Optional[float] = None
    parts_cost: Optional[float] = None
    shipping_cost: Optional[float] = None
    total_cost: Optional[float] = None

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[UserRole] = None

class SLARuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    ticket_type: Optional[TicketType] = None
    customer_impact: Optional[ImpactLevel] = None
    business_priority: Optional[BusinessPriority] = None
    sla_target_hours: Optional[int] = 24
    sla_breach_hours: Optional[int] = 48
    escalation_levels: Optional[int] = 3
    is_active: Optional[bool] = True

class SLARuleCreate(SLARuleBase):
    pass

class SLARuleUpdate(SLARuleBase):
    name: Optional[str] = None

class SLARuleOut(SLARuleBase):
    rule_id: str
    created_at: datetime
    updated_at: datetime

# Site Equipment Schemas
class SiteEquipmentBase(BaseModel):
    site_id: str
    equipment_type: Optional[str] = None
    model: Optional[str] = None
    part_number: Optional[str] = None
    serial_number: Optional[str] = None
    installation_date: Optional[date] = None
    maintenance_notes: Optional[str] = None
    rack_location: Optional[str] = None
    additional_details: Optional[str] = None

class SiteEquipmentCreate(SiteEquipmentBase):
    pass

class SiteEquipmentUpdate(BaseModel):
    equipment_type: Optional[str] = None
    model: Optional[str] = None
    part_number: Optional[str] = None
    serial_number: Optional[str] = None
    installation_date: Optional[date] = None
    maintenance_notes: Optional[str] = None
    rack_location: Optional[str] = None
    additional_details: Optional[str] = None

class SiteEquipmentOut(SiteEquipmentBase):
    equipment_id: str
    created_at: datetime
    updated_at: datetime

# Ticket Attachment Schemas
class TicketAttachmentBase(BaseModel):
    ticket_id: str
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    external_url: Optional[str] = None
    description: Optional[str] = None

class TicketAttachmentCreate(TicketAttachmentBase):
    pass

class TicketAttachmentUpdate(BaseModel):
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    description: Optional[str] = None

class TicketAttachmentOut(TicketAttachmentBase):
    attachment_id: str
    uploaded_by: str
    uploaded_at: datetime 
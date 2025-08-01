from pydantic import BaseModel, EmailStr, Field
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

class UserCreate(UserBase):
    password: Optional[str] = None

class UserOut(UserBase):
    user_id: str
    temp_password: Optional[str] = None

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
    pass

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
    site_id: str

class TicketType(str, enum.Enum):
    inhouse = 'inhouse'
    onsite = 'onsite'
    shipping = 'shipping'
    projects = 'projects'
    nro = 'nro'
    misc = 'misc'

class TicketStatus(str, enum.Enum):
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

class TicketBase(BaseModel):
    site_id: str
    inc_number: Optional[str] = None
    so_number: Optional[str] = None
    type: TicketType
    status: Optional[TicketStatus] = TicketStatus.open
    priority: Optional[str] = None
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
    
    # SLA Management Fields
    sla_target_hours: Optional[int] = 24
    sla_breach_hours: Optional[int] = 48
    first_response_time: Optional[datetime] = None
    resolution_time: Optional[datetime] = None
    escalation_level: Optional[int] = 0
    escalation_notified: Optional[bool] = False
    customer_impact: Optional[ImpactLevel] = ImpactLevel.medium
    business_priority: Optional[BusinessPriority] = BusinessPriority.medium

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    site_id: Optional[str] = None
    inc_number: Optional[str] = None
    so_number: Optional[str] = None
    type: Optional[TicketType] = None
    status: Optional[TicketStatus] = None
    priority: Optional[str] = None
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
    # SLA Management Fields
    sla_target_hours: Optional[int] = None
    sla_breach_hours: Optional[int] = None
    first_response_time: Optional[datetime] = None
    resolution_time: Optional[datetime] = None
    escalation_level: Optional[int] = None
    escalation_notified: Optional[bool] = None
    customer_impact: Optional[ImpactLevel] = None
    business_priority: Optional[BusinessPriority] = None

class TicketOut(TicketBase):
    ticket_id: str

class TicketAuditBase(BaseModel):
    ticket_id: Optional[str] = None
    user_id: str
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
    date_shipped: Optional[date] = None
    date_returned: Optional[date] = None
    notes: Optional[str] = None

class ShipmentCreate(ShipmentBase):
    pass

class ShipmentOut(ShipmentBase):
    shipment_id: str

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

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[UserRole] = None 
"""Add performance indexes for frequently queried fields

Revision ID: add_performance_indexes
Revises: d9946355712c
Create Date: 2025-01-07 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = 'd9946355712c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add performance indexes for frequently queried fields."""
    
    # Ticket indexes
    op.create_index('idx_tickets_status', 'tickets', ['status'])
    op.create_index('idx_tickets_priority', 'tickets', ['priority'])
    op.create_index('idx_tickets_type', 'tickets', ['type'])
    op.create_index('idx_tickets_assigned_user', 'tickets', ['assigned_user_id'])
    op.create_index('idx_tickets_site', 'tickets', ['site_id'])
    op.create_index('idx_tickets_onsite_tech', 'tickets', ['onsite_tech_id'])
    op.create_index('idx_tickets_date_created', 'tickets', ['date_created'])
    op.create_index('idx_tickets_created_at', 'tickets', ['created_at'])
    op.create_index('idx_tickets_last_updated_at', 'tickets', ['last_updated_at'])
    op.create_index('idx_tickets_claimed_by', 'tickets', ['claimed_by'])
    op.create_index('idx_tickets_approved_by', 'tickets', ['approved_by'])
    op.create_index('idx_tickets_requires_approval', 'tickets', ['requires_approval'])
    op.create_index('idx_tickets_due_date', 'tickets', ['due_date'])
    op.create_index('idx_tickets_follow_up_date', 'tickets', ['follow_up_date'])
    
    # Composite indexes for common queries
    op.create_index('idx_tickets_status_priority', 'tickets', ['status', 'priority'])
    op.create_index('idx_tickets_site_status', 'tickets', ['site_id', 'status'])
    op.create_index('idx_tickets_user_status', 'tickets', ['assigned_user_id', 'status'])
    op.create_index('idx_tickets_type_status', 'tickets', ['type', 'status'])
    op.create_index('idx_tickets_date_status', 'tickets', ['date_created', 'status'])
    
    # User indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_region', 'users', ['region'])
    op.create_index('idx_users_active', 'users', ['active'])
    op.create_index('idx_users_role_active', 'users', ['role', 'active'])
    
    # Site indexes
    op.create_index('idx_sites_region', 'sites', ['region'])
    op.create_index('idx_sites_city', 'sites', ['city'])
    op.create_index('idx_sites_state', 'sites', ['state'])
    op.create_index('idx_sites_brand', 'sites', ['brand'])
    op.create_index('idx_sites_location', 'sites', ['location'])
    
    # Shipment indexes
    op.create_index('idx_shipments_site', 'shipments', ['site_id'])
    op.create_index('idx_shipments_ticket', 'shipments', ['ticket_id'])
    op.create_index('idx_shipments_item', 'shipments', ['item_id'])
    op.create_index('idx_shipments_date_created', 'shipments', ['date_created'])
    op.create_index('idx_shipments_date_shipped', 'shipments', ['date_shipped'])
    op.create_index('idx_shipments_tracking', 'shipments', ['tracking_number'])
    op.create_index('idx_shipments_priority', 'shipments', ['shipping_priority'])
    
    # Field Tech indexes
    op.create_index('idx_field_techs_region', 'field_techs', ['region'])
    op.create_index('idx_field_techs_city', 'field_techs', ['city'])
    op.create_index('idx_field_techs_state', 'field_techs', ['state'])
    op.create_index('idx_field_techs_email', 'field_techs', ['email'])
    
    # Task indexes
    op.create_index('idx_tasks_ticket', 'tasks', ['ticket_id'])
    op.create_index('idx_tasks_assigned_user', 'tasks', ['assigned_user_id'])
    op.create_index('idx_tasks_status', 'tasks', ['status'])
    op.create_index('idx_tasks_priority', 'tasks', ['priority'])
    op.create_index('idx_tasks_created_at', 'tasks', ['created_at'])
    op.create_index('idx_tasks_updated_at', 'tasks', ['updated_at'])
    op.create_index('idx_tasks_due_date', 'tasks', ['due_date'])
    
    # Equipment indexes
    op.create_index('idx_equipment_site', 'equipment', ['site_id'])
    op.create_index('idx_equipment_type', 'equipment', ['type'])
    op.create_index('idx_equipment_serial', 'equipment', ['serial_number'])
    op.create_index('idx_equipment_install_date', 'equipment', ['install_date'])
    
    # Inventory indexes
    op.create_index('idx_inventory_location', 'inventory_items', ['location'])
    op.create_index('idx_inventory_sku', 'inventory_items', ['sku'])
    op.create_index('idx_inventory_quantity', 'inventory_items', ['quantity_on_hand'])
    
    # Audit indexes
    op.create_index('idx_audit_ticket', 'ticket_audits', ['ticket_id'])
    op.create_index('idx_audit_user', 'ticket_audits', ['user_id'])
    op.create_index('idx_audit_change_time', 'ticket_audits', ['change_time'])
    op.create_index('idx_audit_field', 'ticket_audits', ['field_changed'])
    op.create_index('idx_audit_ticket_time', 'ticket_audits', ['ticket_id', 'change_time'])
    
    # SLA Rule indexes
    op.create_index('idx_sla_rules_active', 'sla_rules', ['is_active'])
    op.create_index('idx_sla_rules_type', 'sla_rules', ['ticket_type'])
    op.create_index('idx_sla_rules_impact', 'sla_rules', ['customer_impact'])
    op.create_index('idx_sla_rules_priority', 'sla_rules', ['business_priority'])
    op.create_index('idx_sla_rules_created', 'sla_rules', ['created_at'])
    
    # Time Entry indexes
    op.create_index('idx_time_entries_ticket', 'time_entries', ['ticket_id'])
    op.create_index('idx_time_entries_user', 'time_entries', ['user_id'])
    op.create_index('idx_time_entries_created', 'time_entries', ['created_at'])
    op.create_index('idx_time_entries_start', 'time_entries', ['start_time'])
    op.create_index('idx_time_entries_end', 'time_entries', ['end_time'])
    
    # Comment indexes
    op.create_index('idx_comments_ticket', 'ticket_comments', ['ticket_id'])
    op.create_index('idx_comments_user', 'ticket_comments', ['user_id'])
    op.create_index('idx_comments_created', 'ticket_comments', ['created_at'])
    op.create_index('idx_comments_updated', 'ticket_comments', ['updated_at'])
    
    # Site Equipment indexes
    op.create_index('idx_site_equipment_site', 'site_equipment', ['site_id'])
    op.create_index('idx_site_equipment_type', 'site_equipment', ['type'])
    op.create_index('idx_site_equipment_status', 'site_equipment', ['status'])
    op.create_index('idx_site_equipment_serial', 'site_equipment', ['serial_number'])
    op.create_index('idx_site_equipment_created', 'site_equipment', ['created_at'])
    
    # Attachment indexes
    op.create_index('idx_attachments_ticket', 'ticket_attachments', ['ticket_id'])
    op.create_index('idx_attachments_uploader', 'ticket_attachments', ['uploaded_by'])
    op.create_index('idx_attachments_uploaded', 'ticket_attachments', ['uploaded_at'])
    op.create_index('idx_attachments_file_type', 'ticket_attachments', ['file_type'])
    
    # Inventory Transaction indexes
    op.create_index('idx_inv_trans_item', 'inventory_transactions', ['item_id'])
    op.create_index('idx_inv_trans_ticket', 'inventory_transactions', ['ticket_id'])
    op.create_index('idx_inv_trans_user', 'inventory_transactions', ['user_id'])
    op.create_index('idx_inv_trans_type', 'inventory_transactions', ['type'])
    op.create_index('idx_inv_trans_date', 'inventory_transactions', ['date'])


def downgrade() -> None:
    """Remove performance indexes."""
    
    # Drop all indexes
    op.drop_index('idx_tickets_status')
    op.drop_index('idx_tickets_priority')
    op.drop_index('idx_tickets_type')
    op.drop_index('idx_tickets_assigned_user')
    op.drop_index('idx_tickets_site')
    op.drop_index('idx_tickets_onsite_tech')
    op.drop_index('idx_tickets_date_created')
    op.drop_index('idx_tickets_created_at')
    op.drop_index('idx_tickets_last_updated_at')
    op.drop_index('idx_tickets_claimed_by')
    op.drop_index('idx_tickets_approved_by')
    op.drop_index('idx_tickets_requires_approval')
    op.drop_index('idx_tickets_due_date')
    op.drop_index('idx_tickets_follow_up_date')
    
    # Drop composite indexes
    op.drop_index('idx_tickets_status_priority')
    op.drop_index('idx_tickets_site_status')
    op.drop_index('idx_tickets_user_status')
    op.drop_index('idx_tickets_type_status')
    op.drop_index('idx_tickets_date_status')
    
    # Drop user indexes
    op.drop_index('idx_users_email')
    op.drop_index('idx_users_role')
    op.drop_index('idx_users_region')
    op.drop_index('idx_users_active')
    op.drop_index('idx_users_role_active')
    
    # Drop site indexes
    op.drop_index('idx_sites_region')
    op.drop_index('idx_sites_city')
    op.drop_index('idx_sites_state')
    op.drop_index('idx_sites_brand')
    op.drop_index('idx_sites_location')
    
    # Drop shipment indexes
    op.drop_index('idx_shipments_site')
    op.drop_index('idx_shipments_ticket')
    op.drop_index('idx_shipments_item')
    op.drop_index('idx_shipments_date_created')
    op.drop_index('idx_shipments_date_shipped')
    op.drop_index('idx_shipments_tracking')
    op.drop_index('idx_shipments_priority')
    
    # Drop field tech indexes
    op.drop_index('idx_field_techs_region')
    op.drop_index('idx_field_techs_city')
    op.drop_index('idx_field_techs_state')
    op.drop_index('idx_field_techs_email')
    
    # Drop task indexes
    op.drop_index('idx_tasks_ticket')
    op.drop_index('idx_tasks_assigned_user')
    op.drop_index('idx_tasks_status')
    op.drop_index('idx_tasks_priority')
    op.drop_index('idx_tasks_created_at')
    op.drop_index('idx_tasks_updated_at')
    op.drop_index('idx_tasks_due_date')
    
    # Drop equipment indexes
    op.drop_index('idx_equipment_site')
    op.drop_index('idx_equipment_type')
    op.drop_index('idx_equipment_serial')
    op.drop_index('idx_equipment_install_date')
    
    # Drop inventory indexes
    op.drop_index('idx_inventory_location')
    op.drop_index('idx_inventory_sku')
    op.drop_index('idx_inventory_quantity')
    
    # Drop audit indexes
    op.drop_index('idx_audit_ticket')
    op.drop_index('idx_audit_user')
    op.drop_index('idx_audit_change_time')
    op.drop_index('idx_audit_field')
    op.drop_index('idx_audit_ticket_time')
    
    # Drop SLA rule indexes
    op.drop_index('idx_sla_rules_active')
    op.drop_index('idx_sla_rules_type')
    op.drop_index('idx_sla_rules_impact')
    op.drop_index('idx_sla_rules_priority')
    op.drop_index('idx_sla_rules_created')
    
    # Drop time entry indexes
    op.drop_index('idx_time_entries_ticket')
    op.drop_index('idx_time_entries_user')
    op.drop_index('idx_time_entries_created')
    op.drop_index('idx_time_entries_start')
    op.drop_index('idx_time_entries_end')
    
    # Drop comment indexes
    op.drop_index('idx_comments_ticket')
    op.drop_index('idx_comments_user')
    op.drop_index('idx_comments_created')
    op.drop_index('idx_comments_updated')
    
    # Drop site equipment indexes
    op.drop_index('idx_site_equipment_site')
    op.drop_index('idx_site_equipment_type')
    op.drop_index('idx_site_equipment_status')
    op.drop_index('idx_site_equipment_serial')
    op.drop_index('idx_site_equipment_created')
    
    # Drop attachment indexes
    op.drop_index('idx_attachments_ticket')
    op.drop_index('idx_attachments_uploader')
    op.drop_index('idx_attachments_uploaded')
    op.drop_index('idx_attachments_file_type')
    
    # Drop inventory transaction indexes
    op.drop_index('idx_inv_trans_item')
    op.drop_index('idx_inv_trans_ticket')
    op.drop_index('idx_inv_trans_user')
    op.drop_index('idx_inv_trans_type')
    op.drop_index('idx_inv_trans_date')

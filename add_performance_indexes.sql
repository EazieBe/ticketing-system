-- Performance Indexes for Shipment System
-- Run this script to add critical indexes for optimal performance

-- Shipment table indexes
CREATE INDEX IF NOT EXISTS idx_shipments_shipment_id ON shipments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipments_site_id ON shipments(site_id);
CREATE INDEX IF NOT EXISTS idx_shipments_ticket_id ON shipments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_date_created ON shipments(date_created);
CREATE INDEX IF NOT EXISTS idx_shipments_archived ON shipments(archived);

-- Shipment items indexes
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_item_id ON shipment_items(item_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_remove_from_inventory ON shipment_items(remove_from_inventory);

-- Inventory items indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_id ON inventory_items(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_quantity_on_hand ON inventory_items(quantity_on_hand);

-- Inventory transactions indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_shipment_item_id ON inventory_transactions(shipment_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(date);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);

-- Ticket audits indexes
CREATE INDEX IF NOT EXISTS idx_ticket_audits_ticket_id ON ticket_audits(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audits_user_id ON ticket_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audits_change_time ON ticket_audits(change_time);
CREATE INDEX IF NOT EXISTS idx_ticket_audits_field_changed ON ticket_audits(field_changed);

-- Users email case-insensitive lookup
CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users (lower(email));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shipments_site_status ON shipments(site_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_ticket_status ON shipments(ticket_id, status);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_remove ON shipment_items(shipment_id, remove_from_inventory);

-- Analyze tables to update statistics
ANALYZE shipments;
ANALYZE shipment_items;
ANALYZE inventory_items;
ANALYZE inventory_transactions;
ANALYZE ticket_audits;

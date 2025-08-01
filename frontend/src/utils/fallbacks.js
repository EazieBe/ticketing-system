// Utility functions for consistent fallback text across the application

export const getFallbackText = (value, fallback = 'Unknown') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value;
};

export const getFallbackUser = (user) => {
  if (!user) return 'Unknown User';
  return user.name || user.email || 'Unknown User';
};

export const getFallbackSite = (site) => {
  if (!site) return 'Unknown Site';
  return site.location || site.site_id || 'Unknown Site';
};

export const getFallbackTicket = (ticket) => {
  if (!ticket) return 'Unknown Ticket';
  return ticket.inc_number || ticket.ticket_id || 'Unknown Ticket';
};

export const getFallbackEquipment = (equipment) => {
  if (!equipment) return 'Unknown Equipment';
  return equipment.make_model || equipment.type || 'Unknown Equipment';
};

export const getFallbackShipment = (shipment) => {
  if (!shipment) return 'Unknown Shipment';
  return shipment.what_is_being_shipped || shipment.shipment_id || 'Unknown Shipment';
};

export const getFallbackInventory = (item) => {
  if (!item) return 'Unknown Item';
  return item.name || item.sku || 'Unknown Item';
};

export const getFallbackFieldTech = (tech) => {
  if (!tech) return 'Unknown Technician';
  return tech.name || tech.field_tech_id || 'Unknown Technician';
};

export const getFallbackTask = (task) => {
  if (!task) return 'Unknown Task';
  return task.description || task.task_id || 'Unknown Task';
};

export const getFallbackAudit = (audit) => {
  if (!audit) return 'Unknown Audit';
  return audit.field_changed || audit.audit_id || 'Unknown Audit';
};

// Format functions with fallbacks
export const formatPhone = (phone) => {
  if (!phone) return 'No Phone';
  return phone;
};

export const formatEmail = (email) => {
  if (!email) return 'No Email';
  return email;
};

export const formatAddress = (address, city, state, zip) => {
  const parts = [address, city, state, zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'No Address';
};

export const formatDate = (date) => {
  if (!date) return 'No Date';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return 'Invalid Date';
  }
};

export const formatDateTime = (dateTime) => {
  if (!dateTime) return 'No Date/Time';
  try {
    return new Date(dateTime).toLocaleString();
  } catch {
    return 'Invalid Date/Time';
  }
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  } catch {
    return '$0.00';
  }
};

export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  try {
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(1)}%`;
  } catch {
    return '0%';
  }
}; 
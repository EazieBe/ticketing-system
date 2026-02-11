/**
 * Single source of truth for status and priority chip styling across the app.
 * Use these everywhere so colors are identical on tickets, shipments, audit, dashboards, etc.
 */

// Token keys from useThemeTokens: statusInfoBg, statusWarningBg, statusErrorBg, statusSuccessBg, statusNeutralBg
// Variant = useReadableChip key: 'success' (green), 'warning' (orange), 'error' (red), 'primary' (blue), 'info', 'neutral'

/** Ticket/shipment priority → variant. Normal = green, Critical = orange, Emergency = red (same on every page). */
export const PRIORITY_VARIANT = {
  normal: 'success',
  low: 'success',
  high: 'warning',
  critical: 'warning',
  emergency: 'error',
};

/** Shipping priority → variant (same palette as ticket priority). */
export const SHIPPING_PRIORITY_VARIANT = {
  normal: 'success',
  urgent: 'warning',
  critical: 'error',
};

/** Ticket type → chip variant. Same colors everywhere: inhouse=green, onsite=blue, etc. */
export const TICKET_TYPE_VARIANT = {
  inhouse: 'success',
  onsite: 'primary',
  projects: 'info',
  project: 'info',
  shipping: 'warning',
  nro: 'neutral',
  misc: 'neutral',
};

export function getTicketTypeVariant(type) {
  const key = (type || '').toLowerCase();
  return TICKET_TYPE_VARIANT[key] || 'neutral';
}

export function getPriorityVariant(priority) {
  const key = (priority || 'normal').toLowerCase();
  return PRIORITY_VARIANT[key] || 'success';
}

export function getShippingPriorityVariant(priority) {
  const key = (priority || 'normal').toLowerCase();
  return SHIPPING_PRIORITY_VARIANT[key] || 'success';
}

/** Same palette as chips: for left borders / accents (e.g. card borderLeft). */
const PRIORITY_BORDER_HEX = { success: '#2e7d32', warning: '#e65100', error: '#c62828' };
export function getPriorityBorderColor(priority) {
  const variant = getPriorityVariant(priority);
  return PRIORITY_BORDER_HEX[variant] || PRIORITY_BORDER_HEX.success;
}

// --- Status styles (for StatusChip) ---

export const TICKET_STATUS_STYLE = {
  open: { bg: 'statusInfoBg', color: 'primary.main' },
  scheduled: { bg: 'statusInfoBg', color: 'secondary.main' },
  checked_in: { bg: 'statusWarningBg', color: 'warning.dark' },
  in_progress: { bg: 'statusWarningBg', color: 'warning.dark' },
  needs_parts: { bg: 'statusErrorBg', color: 'error.dark' },
  completed: { bg: 'statusSuccessBg', color: 'success.dark' },
  closed: { bg: 'statusNeutralBg', color: 'text.secondary' },
  approved: { bg: 'statusSuccessBg', color: 'success.dark' },
  archived: { bg: 'statusNeutralBg', color: 'text.secondary' },
};

export const SHIPMENT_STATUS_STYLE = {
  pending: { bg: 'statusWarningBg', color: 'warning.dark' },
  shipped: { bg: 'statusInfoBg', color: 'primary.main' },
  delivered: { bg: 'statusSuccessBg', color: 'success.dark' },
  returned: { bg: 'statusNeutralBg', color: 'text.secondary' },
  archived: { bg: 'statusNeutralBg', color: 'text.secondary' },
};

export function getTicketStatusStyle(status, tokens) {
  const key = (status || '').toLowerCase();
  const style = TICKET_STATUS_STYLE[key] || { bg: 'statusNeutralBg', color: 'text.secondary' };
  return {
    bg: tokens[style.bg] ?? tokens.statusNeutralBg,
    color: style.color,
  };
}

export function getShipmentStatusStyle(status, tokens) {
  const key = (status || '').toLowerCase();
  const style = SHIPMENT_STATUS_STYLE[key] || { bg: 'statusNeutralBg', color: 'text.secondary' };
  return {
    bg: tokens[style.bg] ?? tokens.statusNeutralBg,
    color: style.color,
  };
}

/** Format status for display (e.g. "in_progress" -> "in progress") */
export function formatStatusLabel(status) {
  if (status == null) return '—';
  return String(status).replace(/_/g, ' ');
}

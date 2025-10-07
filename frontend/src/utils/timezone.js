import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

// Timestamp field priority - always prefer created_at over date_created
const TIMESTAMP_FIELD_PRIORITY = {
  tickets: ['created_at', 'date_created'],
  shipments: ['date_created'],
  tasks: ['created_at'],
  comments: ['created_at'],
  time_entries: ['created_at'],
  sla_rules: ['created_at'],
  site_equipment: ['created_at']
};

/**
 * Convert UTC timestamp to local timezone
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @param {string} format - dayjs format string (default: 'MMM D, YYYY h:mm A')
 * @returns {string} Formatted timestamp in local timezone
 */
export const formatTimestamp = (timestamp, format = 'MMM D, YYYY h:mm A') => {
  if (!timestamp) return 'N/A';
  
  // Parse the timestamp and convert from UTC to local timezone
  return dayjs.utc(timestamp).local().format(format);
};

/**
 * Convert UTC timestamp to local timezone with relative time
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @param {string} format - dayjs format string (default: 'MMM D, YYYY h:mm A')
 * @returns {string} Formatted timestamp with relative time
 */
export const formatTimestampWithRelative = (timestamp, format = 'MMM D, YYYY h:mm A') => {
  if (!timestamp) return 'N/A';
  
  const localTime = dayjs.utc(timestamp).local();
  return `${localTime.format(format)} (${localTime.fromNow()})`;
};

/**
 * Convert UTC timestamp to local timezone for audit logs
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @returns {string} Formatted timestamp for audit logs
 */
export const formatAuditTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  return dayjs.utc(timestamp).local().format('MMM DD, YYYY HH:mm');
};

/**
 * Convert UTC timestamp to local timezone for detailed audit logs
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @returns {string} Formatted timestamp for detailed audit logs
 */
export const formatDetailedAuditTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  return dayjs.utc(timestamp).local().format('MMMM DD, YYYY HH:mm:ss');
};

/**
 * Convert UTC timestamp to local timezone for dashboard cards
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @returns {string} Formatted timestamp for dashboard cards
 */
export const formatDashboardTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const localTime = dayjs.utc(timestamp).local();
  return `${localTime.format('MMM D, YYYY h:mm A')} (${localTime.fromNow()})`;
};

/**
 * Convert UTC timestamp to local timezone for time tracker
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @returns {string} Formatted timestamp for time tracker
 */
export const formatTimeTrackerTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  return dayjs.utc(timestamp).local().format('MMM DD, YYYY HH:mm');
};

/**
 * Convert UTC timestamp to local timezone for time tracker end time
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @returns {string} Formatted end time for time tracker
 */
export const formatTimeTrackerEndTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  return dayjs.utc(timestamp).local().format('HH:mm');
};

/**
 * Get current timestamp in UTC format for sending to backend
 * @returns {string} Current timestamp in UTC ISO format
 */
export const getCurrentUTCTimestamp = () => {
  return dayjs.utc().toISOString();
};

/**
 * Convert local time to UTC for sending to backend
 * @param {string|Date} localTime - Local time
 * @returns {string} UTC timestamp in ISO format
 */
export const localToUTC = (localTime) => {
  return dayjs(localTime).utc().toISOString();
};

/**
 * Check if a timestamp is today
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @returns {boolean} True if timestamp is today
 */
export const isToday = (timestamp) => {
  if (!timestamp) return false;
  
  const localTime = dayjs.utc(timestamp).local();
  const today = dayjs();
  
  return localTime.isSame(today, 'day');
};

/**
 * Check if a timestamp is yesterday
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @returns {boolean} True if timestamp is yesterday
 */
export const isYesterday = (timestamp) => {
  if (!timestamp) return false;
  
  const localTime = dayjs.utc(timestamp).local();
  const yesterday = dayjs().subtract(1, 'day');
  
  return localTime.isSame(yesterday, 'day');
};

/**
 * Get relative time description (e.g., "2 hours ago", "in 3 days")
 * @param {string|Date} timestamp - UTC timestamp from backend
 * @returns {string} Relative time description
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  return dayjs.utc(timestamp).local().fromNow();
};

/**
 * Gets the best available timestamp field from an entity
 * @param {Object} entity - The entity object
 * @param {string} entityType - The type of entity (tickets, shipments, etc.)
 * @returns {string|null} - The best timestamp value or null
 */
export const getBestTimestamp = (entity, entityType = 'tickets') => {
  if (!entity) return null;
  
  const priorityFields = TIMESTAMP_FIELD_PRIORITY[entityType] || ['created_at', 'date_created'];
  
  for (const field of priorityFields) {
    if (entity[field]) {
      return entity[field];
    }
  }
  
  return null;
};

/**
 * Validates that a timestamp is properly formatted
 * @param {string|Date} timestamp - The timestamp to validate
 * @returns {boolean} - Whether the timestamp is valid
 */
export const isValidTimestamp = (timestamp) => {
  if (!timestamp) return false;
  
  const parsed = dayjs(timestamp);
  return parsed.isValid();
};

/**
 * Ensures a timestamp is in UTC format
 * @param {string|Date} timestamp - The timestamp to normalize
 * @returns {string|null} - UTC timestamp string or null if invalid
 */
export const normalizeToUTC = (timestamp) => {
  if (!isValidTimestamp(timestamp)) return null;
  
  return dayjs(timestamp).utc().toISOString();
};

/**
 * Enhanced timestamp formatter that automatically selects the best timestamp field
 * @param {Object} entity - The entity object
 * @param {string} entityType - The type of entity
 * @param {string} format - dayjs format string
 * @returns {string} Formatted timestamp or 'N/A'
 */
export const formatEntityTimestamp = (entity, entityType = 'tickets', format = 'MMM D, YYYY h:mm A') => {
  const timestamp = getBestTimestamp(entity, entityType);
  return formatTimestamp(timestamp, format);
};

/**
 * Enhanced timestamp formatter with relative time that automatically selects the best timestamp field
 * @param {Object} entity - The entity object
 * @param {string} entityType - The type of entity
 * @param {string} format - dayjs format string
 * @returns {string} Formatted timestamp with relative time or 'N/A'
 */
export const formatEntityTimestampWithRelative = (entity, entityType = 'tickets', format = 'MMM D, YYYY h:mm A') => {
  const timestamp = getBestTimestamp(entity, entityType);
  return formatTimestampWithRelative(timestamp, format);
};

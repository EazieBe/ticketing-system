import { useMemo } from 'react';
import dayjs from 'dayjs';
import { 
  getBestTimestamp, 
  isValidTimestamp, 
  normalizeToUTC,
  formatTimestamp,
  formatTimestampWithRelative,
  formatAuditTimestamp,
  formatDashboardTimestamp,
  formatTimeTrackerTimestamp
} from '../utils/timezone';

/**
 * Custom hook for consistent timestamp handling across components
 * @param {Object} entity - The entity object containing timestamp fields
 * @param {string} entityType - The type of entity (tickets, shipments, etc.)
 * @returns {Object} Timestamp utilities and formatted values
 */
export const useTimestamp = (entity, entityType = 'tickets') => {
  return useMemo(() => {
    const timestamp = getBestTimestamp(entity, entityType);
    const isValid = isValidTimestamp(timestamp);
    const utcTimestamp = normalizeToUTC(timestamp);
    
    return {
      // Raw timestamp data
      timestamp,
      isValid,
      utcTimestamp,
      
      // Formatted timestamps
      formatted: isValid ? formatTimestamp(timestamp) : 'N/A',
      formattedWithRelative: isValid ? formatTimestampWithRelative(timestamp) : 'N/A',
      formattedAudit: isValid ? formatAuditTimestamp(timestamp) : 'N/A',
      formattedDashboard: isValid ? formatDashboardTimestamp(timestamp) : 'N/A',
      formattedTimeTracker: isValid ? formatTimeTrackerTimestamp(timestamp) : 'N/A',
      
      // Utility functions
      format: (format) => isValid ? formatTimestamp(timestamp, format) : 'N/A',
      formatWithRelative: (format) => isValid ? formatTimestampWithRelative(timestamp, format) : 'N/A',
      
      // Validation helpers
      isToday: isValid && timestamp ? dayjs.utc(timestamp).local().isSame(dayjs(), 'day') : false,
      isYesterday: isValid && timestamp ? dayjs.utc(timestamp).local().isSame(dayjs().subtract(1, 'day'), 'day') : false,
      isThisWeek: isValid && timestamp ? dayjs.utc(timestamp).local().isSame(dayjs(), 'week') : false,
      isThisMonth: isValid && timestamp ? dayjs.utc(timestamp).local().isSame(dayjs(), 'month') : false,
      
      // Time calculations
      hoursAgo: isValid && timestamp ? dayjs().diff(dayjs.utc(timestamp).local(), 'hour') : null,
      daysAgo: isValid && timestamp ? dayjs().diff(dayjs.utc(timestamp).local(), 'day') : null,
      minutesAgo: isValid && timestamp ? dayjs().diff(dayjs.utc(timestamp).local(), 'minute') : null,
    };
  }, [entity, entityType]);
};

/**
 * Hook for handling multiple timestamps (e.g., created_at, updated_at)
 * @param {Object} entity - The entity object
 * @param {string} entityType - The type of entity
 * @returns {Object} Multiple timestamp utilities
 */
export const useMultipleTimestamps = (entity, entityType = 'tickets') => {
  return useMemo(() => {
    const timestamps = {};
    
    // Common timestamp fields to check
    const fields = ['created_at', 'updated_at', 'date_created', 'date_updated', 'last_updated_at'];
    
    fields.forEach(field => {
      if (entity && entity[field]) {
        // Create a simple timestamp object instead of calling the hook
        const timestamp = entity[field];
        timestamps[field] = {
          timestamp,
          isValid: isValidTimestamp(timestamp),
          utcTimestamp: normalizeToUTC(timestamp),
          formatted: isValidTimestamp(timestamp) ? formatTimestamp(timestamp) : 'N/A',
          formattedWithRelative: isValidTimestamp(timestamp) ? formatTimestampWithRelative(timestamp) : 'N/A',
          formattedAudit: isValidTimestamp(timestamp) ? formatAuditTimestamp(timestamp) : 'N/A',
          formattedDashboard: isValidTimestamp(timestamp) ? formatDashboardTimestamp(timestamp) : 'N/A',
          formattedTimeTracker: isValidTimestamp(timestamp) ? formatTimeTrackerTimestamp(timestamp) : 'N/A',
          isToday: isValidTimestamp(timestamp) && dayjs.utc(timestamp).local().isSame(dayjs(), 'day'),
          isYesterday: isValidTimestamp(timestamp) && dayjs.utc(timestamp).local().isSame(dayjs().subtract(1, 'day'), 'day'),
          isThisWeek: isValidTimestamp(timestamp) && dayjs.utc(timestamp).local().isSame(dayjs(), 'week'),
          isThisMonth: isValidTimestamp(timestamp) && dayjs.utc(timestamp).local().isSame(dayjs(), 'month'),
          hoursAgo: isValidTimestamp(timestamp) ? dayjs().diff(dayjs.utc(timestamp).local(), 'hour') : null,
          daysAgo: isValidTimestamp(timestamp) ? dayjs().diff(dayjs.utc(timestamp).local(), 'day') : null,
          minutesAgo: isValidTimestamp(timestamp) ? dayjs().diff(dayjs.utc(timestamp).local(), 'minute') : null,
        };
      }
    });
    
    return timestamps;
  }, [entity, entityType]);
};

/**
 * Hook for timestamp comparison and sorting
 * @param {Array} entities - Array of entities to compare
 * @param {string} entityType - The type of entities
 * @returns {Object} Sorting utilities
 */
export const useTimestampSorting = (entities = [], entityType = 'tickets') => {
  return useMemo(() => {
    const sortedByCreated = [...entities].sort((a, b) => {
      const aTimestamp = getBestTimestamp(a, entityType);
      const bTimestamp = getBestTimestamp(b, entityType);
      
      if (!aTimestamp && !bTimestamp) return 0;
      if (!aTimestamp) return 1;
      if (!bTimestamp) return -1;
      
      return new Date(bTimestamp) - new Date(aTimestamp);
    });
    
    const sortedByCreatedAsc = [...entities].sort((a, b) => {
      const aTimestamp = getBestTimestamp(a, entityType);
      const bTimestamp = getBestTimestamp(b, entityType);
      
      if (!aTimestamp && !bTimestamp) return 0;
      if (!aTimestamp) return -1;
      if (!bTimestamp) return 1;
      
      return new Date(aTimestamp) - new Date(bTimestamp);
    });
    
    return {
      sortedByCreated,
      sortedByCreatedAsc,
      sortByTimestamp: (entities, ascending = false) => {
        return [...entities].sort((a, b) => {
          const aTimestamp = getBestTimestamp(a, entityType);
          const bTimestamp = getBestTimestamp(b, entityType);
          
          if (!aTimestamp && !bTimestamp) return 0;
          if (!aTimestamp) return ascending ? -1 : 1;
          if (!bTimestamp) return ascending ? 1 : -1;
          
          const comparison = new Date(aTimestamp) - new Date(bTimestamp);
          return ascending ? comparison : -comparison;
        });
      }
    };
  }, [entities, entityType]);
};

import React from 'react';
import { Typography, Tooltip, Box } from '@mui/material';
import { useTimestamp } from '../hooks/useTimestamp';
import { AccessTime, Warning, Error } from '@mui/icons-material';

/**
 * Consistent timestamp display component with validation
 * @param {Object} props
 * @param {Object} props.entity - The entity object
 * @param {string} props.entityType - The type of entity (tickets, shipments, etc.)
 * @param {string} props.format - The display format ('relative', 'absolute', 'audit', 'dashboard', 'timeTracker')
 * @param {string} props.variant - Typography variant
 * @param {boolean} props.showIcon - Whether to show a clock icon
 * @param {boolean} props.showValidation - Whether to show validation warnings
 * @param {string} props.fallback - Fallback text when timestamp is invalid
 */
export const TimestampDisplay = ({
  entity,
  entityType = 'tickets',
  format = 'relative',
  variant = 'body2',
  showIcon = false,
  showValidation = false,
  fallback = 'N/A',
  ...props
}) => {
  const timestamp = useTimestamp(entity, entityType);
  
  const getFormattedValue = () => {
    switch (format) {
      case 'relative':
        return timestamp.formattedWithRelative;
      case 'absolute':
        return timestamp.formatted;
      case 'audit':
        return timestamp.formattedAudit;
      case 'dashboard':
        return timestamp.formattedDashboard;
      case 'timeTracker':
        return timestamp.formattedTimeTracker;
      default:
        return timestamp.formatted;
    }
  };
  
  const getTooltipText = () => {
    if (!timestamp.isValid) {
      return 'Invalid or missing timestamp';
    }
    
    const parts = [];
    parts.push(`UTC: ${timestamp.utcTimestamp}`);
    parts.push(`Local: ${timestamp.formatted}`);
    
    if (timestamp.hoursAgo !== null) {
      parts.push(`Age: ${timestamp.hoursAgo} hours ago`);
    }
    
    return parts.join('\n');
  };
  
  const getValidationIcon = () => {
    if (!showValidation) return null;
    
    if (!timestamp.isValid) {
      return <Error color="error" fontSize="small" />;
    }
    
    if (timestamp.hoursAgo > 24) {
      return <Warning color="warning" fontSize="small" />;
    }
    
    return null;
  };
  
  const displayValue = timestamp.isValid ? getFormattedValue() : fallback;
  
  return (
    <Tooltip title={getTooltipText()} arrow>
      <Box display="flex" alignItems="center" gap={0.5}>
        {showIcon && <AccessTime fontSize="small" color="action" />}
        {getValidationIcon()}
        <Typography 
          variant={variant} 
          color={timestamp.isValid ? 'text.primary' : 'text.secondary'}
          {...props}
        >
          {displayValue}
        </Typography>
      </Box>
    </Tooltip>
  );
};

/**
 * Timestamp comparison component for showing time differences
 * @param {Object} props
 * @param {Object} props.entity1 - First entity
 * @param {Object} props.entity2 - Second entity
 * @param {string} props.entityType - The type of entities
 * @param {string} props.variant - Typography variant
 */
export const TimestampComparison = ({
  entity1,
  entity2,
  entityType = 'tickets',
  variant = 'body2',
  ...props
}) => {
  const timestamp1 = useTimestamp(entity1, entityType);
  const timestamp2 = useTimestamp(entity2, entityType);
  
  if (!timestamp1.isValid || !timestamp2.isValid) {
    return (
      <Typography variant={variant} color="text.secondary" {...props}>
        Unable to compare timestamps
      </Typography>
    );
  }
  
  const diffHours = Math.abs(timestamp1.hoursAgo - timestamp2.hoursAgo);
  const diffDays = Math.floor(diffHours / 24);
  
  const getDiffText = () => {
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} difference`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} difference`;
    } else {
      return 'Same time';
    }
  };
  
  return (
    <Typography variant={variant} color="text.secondary" {...props}>
      {getDiffText()}
    </Typography>
  );
};

/**
 * Timestamp validation component for debugging
 * @param {Object} props
 * @param {Object} props.entity - The entity object
 * @param {string} props.entityType - The type of entity
 */
export const TimestampValidation = ({ entity, entityType = 'tickets' }) => {
  const timestamp = useTimestamp(entity, entityType);
  
  return (
    <Box>
      <Typography variant="caption" display="block">
        <strong>Timestamp Validation:</strong>
      </Typography>
      <Typography variant="caption" display="block">
        Valid: {timestamp.isValid ? '✅' : '❌'}
      </Typography>
      <Typography variant="caption" display="block">
        Raw: {timestamp.timestamp || 'null'}
      </Typography>
      <Typography variant="caption" display="block">
        UTC: {timestamp.utcTimestamp || 'null'}
      </Typography>
      <Typography variant="caption" display="block">
        Formatted: {timestamp.formatted}
      </Typography>
      {timestamp.hoursAgo !== null && (
        <Typography variant="caption" display="block">
          Age: {timestamp.hoursAgo} hours ago
        </Typography>
      )}
    </Box>
  );
};

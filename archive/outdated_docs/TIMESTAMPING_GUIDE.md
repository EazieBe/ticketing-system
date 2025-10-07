# Timestamping Strategy & Best Practices

## Overview

This document outlines the comprehensive timestamping strategy for the ticketing system to ensure data integrity, proper ordering, and consistent timezone handling across the entire application.

## Backend Timestamping Standards

### Database Schema

All entities should follow this timestamp pattern:

```sql
-- Primary timestamp (always use this for creation time)
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL

-- Update timestamp (for tracking modifications)
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL

-- Legacy date fields (deprecated, use created_at instead)
date_created DATE  -- Only for backward compatibility
```

### Entity-Specific Timestamps

#### Tickets
- `created_at` - When ticket was created (PRIMARY)
- `last_updated_at` - When ticket was last modified
- `claimed_at` - When ticket was claimed
- `check_in_time` - When field tech checked in
- `check_out_time` - When field tech checked out
- `start_time` - When work actually started
- `end_time` - When work was completed
- `first_response_time` - When first response was made
- `resolution_time` - When ticket was resolved
- `approved_at` - When ticket was approved
- `due_date` - When action is due

#### Comments
- `created_at` - When comment was created
- `updated_at` - When comment was last modified

#### Time Entries
- `created_at` - When time entry was created
- `start_time` - When time tracking started
- `end_time` - When time tracking ended

#### Shipments
- `date_created` - When shipment was created (PRIMARY)
- `date_shipped` - When shipment was shipped
- `date_returned` - When shipment was returned

## Frontend Timestamping Standards

### Timestamp Field Priority

Always use this priority order when displaying timestamps:

```javascript
const TIMESTAMP_FIELD_PRIORITY = {
  tickets: ['created_at', 'date_created'],
  shipments: ['date_created'],
  tasks: ['created_at'],
  comments: ['created_at'],
  time_entries: ['created_at'],
  sla_rules: ['created_at'],
  site_equipment: ['created_at']
};
```

### Component Usage

#### 1. Use the TimestampDisplay Component

```jsx
import { TimestampDisplay } from '../components/TimestampDisplay';

// Basic usage
<TimestampDisplay entity={ticket} entityType="tickets" />

// With specific format
<TimestampDisplay 
  entity={ticket} 
  entityType="tickets" 
  format="relative" 
  showIcon={true}
  showValidation={true}
/>
```

#### 2. Use the useTimestamp Hook

```jsx
import { useTimestamp } from '../hooks/useTimestamp';

const MyComponent = ({ ticket }) => {
  const timestamp = useTimestamp(ticket, 'tickets');
  
  return (
    <div>
      <p>Created: {timestamp.formattedWithRelative}</p>
      <p>Valid: {timestamp.isValid ? 'Yes' : 'No'}</p>
      <p>Hours ago: {timestamp.hoursAgo}</p>
    </div>
  );
};
```

#### 3. Use Enhanced Utility Functions

```jsx
import { formatEntityTimestamp, getBestTimestamp } from '../utils/timezone';

// Automatically selects best timestamp field
const formatted = formatEntityTimestamp(ticket, 'tickets');

// Get raw timestamp value
const timestamp = getBestTimestamp(ticket, 'tickets');
```

### Format Types

- `relative` - "Jan 7, 2025 2:30 PM (2 hours ago)"
- `absolute` - "Jan 7, 2025 2:30 PM"
- `audit` - "Jan 07, 2025 14:30"
- `dashboard` - "Jan 7, 2025 2:30 PM (2 hours ago)"
- `timeTracker` - "Jan 07, 2025 14:30"

## Migration Strategy

### Phase 1: Backend Standardization
1. Run the `standardize_timestamps` migration
2. Ensure all new entities use `created_at` field
3. Add database triggers for automatic `updated_at` updates

### Phase 2: Frontend Migration
1. Update all components to use `TimestampDisplay` or `useTimestamp`
2. Remove hardcoded timestamp field references
3. Add validation and error handling

### Phase 3: Legacy Cleanup
1. Gradually phase out `date_created` field usage
2. Update all API responses to prioritize `created_at`
3. Remove fallback patterns once data is consistent

## Validation & Error Handling

### Backend Validation

```python
from datetime import datetime, timezone
from pydantic import BaseModel, validator

class TimestampMixin(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @validator('created_at', 'updated_at')
    def validate_timestamps(cls, v):
        if v.tzinfo is None:
            raise ValueError('Timestamps must be timezone-aware')
        return v
```

### Frontend Validation

```javascript
import { isValidTimestamp, normalizeToUTC } from '../utils/timezone';

// Validate before sending to backend
const isValid = isValidTimestamp(userInput);
const utcTimestamp = normalizeToUTC(userInput);
```

## Testing Strategy

### Unit Tests

```javascript
import { getBestTimestamp, formatEntityTimestamp } from '../utils/timezone';

describe('Timestamp Utilities', () => {
  test('should prefer created_at over date_created', () => {
    const entity = {
      created_at: '2025-01-07T14:30:00Z',
      date_created: '2025-01-07'
    };
    
    const timestamp = getBestTimestamp(entity, 'tickets');
    expect(timestamp).toBe('2025-01-07T14:30:00Z');
  });
  
  test('should handle missing timestamps gracefully', () => {
    const entity = {};
    const formatted = formatEntityTimestamp(entity, 'tickets');
    expect(formatted).toBe('N/A');
  });
});
```

### Integration Tests

```javascript
describe('Timestamp Display', () => {
  test('should display correct timezone', () => {
    const ticket = {
      created_at: '2025-01-07T14:30:00Z'
    };
    
    render(<TimestampDisplay entity={ticket} entityType="tickets" />);
    
    // Should display in local timezone
    expect(screen.getByText(/Jan 7, 2025/)).toBeInTheDocument();
  });
});
```

## Monitoring & Alerts

### Backend Monitoring

- Monitor for missing or invalid timestamps
- Alert on timestamp inconsistencies
- Track timezone conversion errors

### Frontend Monitoring

- Log timestamp validation failures
- Monitor timezone conversion performance
- Track user timezone detection accuracy

## Common Pitfalls & Solutions

### 1. Timezone Confusion

**Problem**: Mixing UTC and local time
**Solution**: Always store in UTC, convert to local for display

### 2. Missing Timestamps

**Problem**: Some entities missing timestamp data
**Solution**: Use fallback patterns and validation

### 3. Inconsistent Field Usage

**Problem**: Some components use `date_created`, others use `created_at`
**Solution**: Use centralized utility functions

### 4. Performance Issues

**Problem**: Excessive timezone conversions
**Solution**: Cache converted timestamps, use efficient libraries

## Future Enhancements

1. **Automatic Timezone Detection**: Detect user's timezone automatically
2. **Timezone Preferences**: Allow users to set preferred timezone
3. **Timestamp Analytics**: Track timestamp patterns for insights
4. **Real-time Updates**: WebSocket timestamp synchronization
5. **Offline Support**: Handle timestamps when offline

## Conclusion

This timestamping strategy ensures:
- ✅ Data integrity and proper ordering
- ✅ Consistent timezone handling
- ✅ Backward compatibility
- ✅ Easy maintenance and updates
- ✅ Comprehensive validation
- ✅ Performance optimization

By following these standards, the ticketing system will maintain accurate, consistent, and reliable timestamp data across all components and features.

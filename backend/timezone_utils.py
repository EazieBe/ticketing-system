"""
Timezone utilities for the ticketing system
Ensures all times are in Eastern Time (America/New_York)
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# Eastern Time Zone
EASTERN_TZ = ZoneInfo("America/New_York")

def get_eastern_now():
    """
    Get current datetime in Eastern Time
    
    Returns:
        datetime: Current time in Eastern timezone
    """
    return datetime.now(EASTERN_TZ)

def get_eastern_today():
    """
    Get today's date in Eastern Time
    
    Returns:
        date: Today's date in Eastern timezone
    """
    return get_eastern_now().date()

def utc_to_eastern(dt):
    """
    Convert UTC datetime to Eastern Time
    
    Args:
        dt: datetime object in UTC
        
    Returns:
        datetime: datetime in Eastern timezone
    """
    if dt is None:
        return None
    
    # If datetime is naive (no timezone), assume UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    return dt.astimezone(EASTERN_TZ)

def eastern_to_utc(dt):
    """
    Convert Eastern Time datetime to UTC
    
    Args:
        dt: datetime object in Eastern timezone
        
    Returns:
        datetime: datetime in UTC
    """
    if dt is None:
        return None
    
    # If datetime is naive, assume Eastern
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=EASTERN_TZ)
    
    return dt.astimezone(timezone.utc)

def format_eastern_datetime(dt, format_string="%Y-%m-%d %I:%M %p %Z"):
    """
    Format a datetime in Eastern Time
    
    Args:
        dt: datetime object
        format_string: strftime format string
        
    Returns:
        str: Formatted datetime string
    """
    if dt is None:
        return None
    
    eastern_dt = utc_to_eastern(dt) if dt.tzinfo == timezone.utc else dt
    return eastern_dt.strftime(format_string)

def parse_eastern_datetime(date_string, format_string="%Y-%m-%d %H:%M:%S"):
    """
    Parse a date string as Eastern Time
    
    Args:
        date_string: String representation of datetime
        format_string: strftime format string
        
    Returns:
        datetime: datetime object in Eastern timezone
    """
    if not date_string:
        return None
    
    dt = datetime.strptime(date_string, format_string)
    return dt.replace(tzinfo=EASTERN_TZ)


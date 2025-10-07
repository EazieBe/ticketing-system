# Timezone Configuration Guide

## Overview
This ticketing system is configured to use **Eastern Time (America/New_York)** for all timestamps and dates. The system automatically syncs with NTP time servers to ensure accurate timekeeping.

---

## Setup Instructions

### 1. Configure Server Timezone and NTP Sync

Run the automated setup script:

```bash
sudo bash /home/eazie/ticketing-system/setup_timezone.sh
```

This script will:
- ✅ Set system timezone to America/New_York (Eastern Time)
- ✅ Enable NTP time synchronization
- ✅ Configure reliable US-based NTP servers
- ✅ Display current time configuration

### 2. Verify Configuration

Check timezone settings:
```bash
timedatectl
```

Expected output should show:
```
Time zone: America/New_York (EST, -0500)
System clock synchronized: yes
NTP service: active
```

### 3. Restart Application

After timezone setup, restart the backend:
```bash
cd /home/eazie/ticketing-system
pkill -f uvicorn
cd app && source ../venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## How It Works

### Backend Timezone Handling

The system uses a custom timezone utility (`timezone_utils.py`) that ensures all times are in Eastern Time:

**Key Functions:**
- `get_eastern_now()` - Current datetime in Eastern Time
- `get_eastern_today()` - Today's date in Eastern Time  
- `utc_to_eastern()` - Convert UTC to Eastern
- `eastern_to_utc()` - Convert Eastern to UTC

### Database Storage

**Dates:** Stored as DATE type (no timezone)
- `date_created` - Uses Eastern Time date when ticket is created
- `date_scheduled` - Scheduled date in Eastern Time
- `date_closed` - Closed date in Eastern Time

**Timestamps:** Stored as DATETIME type (with timezone awareness)
- `claimed_at` - When ticket was claimed
- `check_in_time` - Field tech check-in time
- `check_out_time` - Field tech check-out time
- `start_time` - Work start time
- `end_time` - Work end time
- And more...

### Frontend Display

The frontend automatically displays all times in the user's browser timezone, but the source of truth is always the **server's Eastern Time**.

---

## NTP Servers Configured

The system syncs with the following time servers (in priority order):

1. **Primary:** `time.nist.gov` (US National Institute of Standards and Technology)
2. **Secondary:** `0.north-america.pool.ntp.org`
3. **Secondary:** `1.north-america.pool.ntp.org`
4. **Fallback:** `time.cloudflare.com`
5. **Fallback:** `time.google.com`

---

## Manual Time Sync Commands

### Force immediate time sync:
```bash
sudo timedatectl set-ntp true
sudo systemctl restart systemd-timesyncd
```

### Check sync status:
```bash
timedatectl timesync-status
```

### View current time:
```bash
# Eastern Time
date

# UTC Time
date -u
```

---

## Important Notes

### Daylight Saving Time (DST)
The system automatically handles DST transitions:
- **EST (Eastern Standard Time):** UTC-5 (Nov-Mar)
- **EDT (Eastern Daylight Time):** UTC-4 (Mar-Nov)

No manual intervention needed for DST changes!

### Server Reboot
Timezone and NTP settings persist across reboots. No reconfiguration needed.

### Multiple Timezones
If your organization operates across multiple timezones:
- Backend always uses Eastern Time (source of truth)
- Frontend displays in user's local browser timezone
- Database stores actual Eastern Time
- API responses include timezone information

---

## Troubleshooting

### Time seems incorrect:
```bash
# Check if NTP is active
sudo systemctl status systemd-timesyncd

# Check if synchronized
timedatectl

# Force resync
sudo systemctl restart systemd-timesyncd
```

### Timezone not changing:
```bash
# Manually set timezone
sudo timedatectl set-timezone America/New_York

# Restart services
sudo systemctl restart systemd-timesyncd
```

### Application showing wrong time:
```bash
# Restart backend after timezone changes
pkill -f uvicorn
# Then start it again
```

---

## Testing

### Verify Eastern Time is being used:

```python
# In Python/Backend
from timezone_utils import get_eastern_now, get_eastern_today

print(f"Current Eastern Time: {get_eastern_now()}")
print(f"Today's Eastern Date: {get_eastern_today()}")
```

### Check ticket creation dates:
```bash
# In psql or database client
SELECT ticket_id, date_created, inc_number 
FROM tickets 
ORDER BY date_created DESC 
LIMIT 5;
```

Dates should reflect Eastern Time zone dates.

---

## Configuration Files

- **Timezone Setup:** `/home/eazie/ticketing-system/setup_timezone.sh`
- **Timezone Utils:** `/home/eazie/ticketing-system/app/timezone_utils.py`
- **NTP Config:** `/etc/systemd/timesyncd.conf`
- **System Timezone:** `/etc/timezone`

---

## Support

For issues or questions about timezone configuration:
1. Check system logs: `journalctl -u systemd-timesyncd`
2. Verify NTP sync status: `timedatectl timesync-status`
3. Check application logs for timezone-related errors

---

**Last Updated:** $(date)
**Timezone:** America/New_York (Eastern Time)
**NTP Sync:** Enabled with US-based servers


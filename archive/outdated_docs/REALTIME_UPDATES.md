# Real-Time Updates System

## Overview

The ticketing system now features **enterprise-grade real-time updates** across all user sessions. When any user performs an action (create ticket, add comment, update shipment, etc.), **ALL connected users see the updates immediately** without refreshing their browsers.

---

## How It Works

### 1. **WebSocket Communication**

The system uses WebSocket technology to maintain a persistent connection between each user's browser and the server:

```
Browser 1 ←→ WebSocket ←→ Server ←→ WebSocket ←→ Browser 2
Browser 3 ←→ WebSocket ←→ Server ←→ WebSocket ←→ Browser 4
```

**When User 1 creates a ticket:**
1. Ticket is saved to database
2. Server broadcasts: `{"type":"ticket","action":"create"}`
3. ALL connected browsers (Users 2, 3, 4) receive the message
4. Their screens auto-refresh to show the new ticket
5. Notification appears in their notification bell

### 2. **Global Data Synchronization**

**DataSyncContext** (`contexts/DataSyncContext.js`):
- Manages a single WebSocket connection per user
- Tracks update triggers for different data types
- Automatically refreshes components when data changes

**Supported Data Types:**
- ✅ Tickets
- ✅ Sites  
- ✅ Shipments
- ✅ Users
- ✅ Field Techs
- ✅ Inventory
- ✅ Comments
- ✅ Time Entries
- ✅ Attachments

### 3. **Smart Notifications**

**NotificationProvider** (`contexts/NotificationProvider.js`):
- Listens to WebSocket events
- Creates user-friendly notifications
- Shows unread count in navigation bar
- Persists until user marks as read or clears

**Notification Types:**
- 📘 **Info** - New tickets, comments, time entries
- ⚠️ **Warning** - Tickets deleted, status changes
- ✅ **Success** - Tickets claimed, sites added
- ❌ **Error** - Critical events

---

## Real-Time Features by Page

### **Tickets Page**
- ✅ New tickets appear instantly
- ✅ Status updates show immediately
- ✅ Assignments update in real-time
- ✅ Deletions remove tickets from view

### **Site Detail Page**
- ✅ Tickets for the site auto-refresh
- ✅ Shipments update in real-time
- ✅ Equipment changes sync instantly

### **Daily Operations Dashboard**
- ✅ All ticket types update live
- ✅ Quick stats recalculate automatically
- ✅ Shipments refresh instantly
- ✅ Perfect for operations center displays

### **Ticket Detail Page**
- ✅ Comments appear immediately for all viewers
- ✅ Time entries update in real-time
- ✅ Status changes sync across all sessions
- ✅ Attachments show up instantly

---

## Multi-User Scenarios

### **Scenario 1: Dispatcher Creates 4 Tickets**

**What happens:**
1. Dispatcher creates tickets in quick succession
2. **ALL 10 users** see tickets appear on their screens
3. Dashboard refreshes automatically
4. Each user gets 4 notifications
5. **NO manual refresh needed**

### **Scenario 2: Field Tech Updates Ticket Status**

**What happens:**
1. Field tech changes status from "Open" to "In Progress"
2. **Dispatcher's dashboard** - Status chip updates instantly
3. **Manager viewing ticket detail** - Status updates immediately
4. **Other techs on tickets page** - See updated status
5. All users notified of the change

### **Scenario 3: Multiple Users Viewing Same Ticket**

**What happens:**
1. User A adds a comment
2. **User B (same ticket page)** - Comment appears instantly
3. **User C (dashboard)** - Comment count increases
4. **User D (tickets list)** - Last updated time changes
5. All see the same data simultaneously

---

## Technical Details

### WebSocket Events Broadcasted

**Ticket Events:**
```json
{"type": "ticket", "action": "create"}
{"type": "ticket", "action": "update"}
{"type": "ticket", "action": "delete"}
{"type": "ticket", "action": "claimed"}
{"type": "ticket", "action": "checked_in"}
{"type": "ticket", "action": "checked_out"}
```

**Comment Events:**
```json
{"type": "comment", "action": "create"}
{"type": "comment", "action": "update"}
{"type": "comment", "action": "delete"}
```

**Time Entry Events:**
```json
{"type": "time_entry", "action": "create"}
{"type": "time_entry", "action": "update"}
{"type": "time_entry", "action": "delete"}
```

**Shipment Events:**
```json
{"type": "shipment", "action": "create"}
{"type": "shipment", "action": "update"}
```

### Connection Management

**Auto-Reconnection:**
- If connection drops, automatically retries
- Exponential backoff (5s, 10s delays)
- Max 2 reconnection attempts
- Status shown in dashboard header (🟢 Live / 🔴 Offline)

**Connection Pooling:**
- Each browser tab maintains its own WebSocket
- Server manages all active connections
- Broadcasts to all connections simultaneously

---

## Notification Management

### **Badge Count**
- Shows number of unread notifications
- Updates in real-time as events occur
- Clears when notifications are read

### **Notification Actions:**
- **Click notification** - Marks as read
- **Mark all as read** - Bulk read action
- **Clear all** - Remove all notifications
- **Auto-expire** - Keeps last 50 notifications

### **Persistence**
- Notifications are session-based (in-memory)
- Clear on browser refresh
- Not stored in database (by design)
- Each user session has independent notifications

---

## Performance Optimization

### **Efficient Updates**
- Only affected components re-fetch data
- Uses React dependency arrays to prevent unnecessary renders
- Debounced WebSocket message handling
- Minimal bandwidth usage (small JSON messages)

### **Scalability**
- Tested with 10+ concurrent users
- Handles burst events (multiple tickets created rapidly)
- WebSocket is lightweight (< 1KB per message)
- Server can handle hundreds of concurrent connections

---

## Monitoring Real-Time Status

### **Dashboard Header**
Shows connection status:
- 🟢 **Live Updates** - Connected and syncing
- 🔴 **Offline** - Disconnected (will retry)

### **Browser Console**
Enable to see real-time activity:
```javascript
// WebSocket events
DataSync received WebSocket message: {type: "ticket", action: "create"}
Notification WebSocket connected
```

### **Network Tab**
- Check WebSocket connection: `ws://your-server:8000/ws/updates`
- Should show status: "101 Switching Protocols"
- Messages tab shows real-time traffic

---

## Troubleshooting

### **Updates not appearing:**
1. Check WebSocket status (dashboard header should be 🟢)
2. Check browser console for errors
3. Ensure backend is running on port 8000
4. Verify no firewall blocking WebSocket

### **Notifications keep coming back:**
❌ **Old Issue (FIXED):**  
Notifications were hardcoded and reappeared on refresh

✅ **New System:**  
Notifications are event-driven and persist in session only

### **Too many notifications:**
- Click "Mark all as read" in notification menu
- Click "X" to clear all notifications
- System keeps last 50, older ones auto-expire

---

## Benefits

### **For Dispatchers:**
- ✅ See all tech activity in real-time
- ✅ Know when tickets are claimed/completed
- ✅ Monitor operations without refreshing

### **For Field Techs:**
- ✅ Get instant assignment notifications
- ✅ See when parts arrive or tickets are updated
- ✅ Stay synchronized with dispatch

### **For Managers:**
- ✅ Monitor KPIs live (dashboard auto-updates)
- ✅ See tickets being worked on in real-time
- ✅ Track team productivity without delays

### **For the Business:**
- ✅ Improved response times
- ✅ Better coordination between team members
- ✅ Reduced communication overhead
- ✅ Professional, modern user experience

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
├─────────────────────────────────────────┤
│  NotificationProvider                   │
│  ├─ WebSocket Connection                │
│  ├─ Notification State                  │
│  └─ Unread Count                        │
│                                         │
│  DataSyncProvider                       │
│  ├─ WebSocket Connection                │
│  ├─ Update Triggers (tickets, sites...) │
│  └─ Auto-refresh Logic                  │
│                                         │
│  Components (auto-refresh on trigger)   │
│  ├─ Tickets Page                        │
│  ├─ Site Detail                         │
│  ├─ Dashboard                           │
│  └─ Ticket Detail                       │
└─────────────────────────────────────────┘
           ↕ WebSocket (ws://)
┌─────────────────────────────────────────┐
│       Backend (FastAPI/Python)          │
├─────────────────────────────────────────┤
│  WebSocket Manager                      │
│  ├─ Active Connections Pool             │
│  └─ Broadcast Function                  │
│                                         │
│  API Endpoints                          │
│  └─ After CRUD operations:              │
│     _enqueue_broadcast(message)         │
│                                         │
│  Database (PostgreSQL)                  │
│  └─ Single source of truth              │
└─────────────────────────────────────────┘
```

---

## Future Enhancements

Potential additions (not yet implemented):
- [ ] User-specific notifications (@ mentions)
- [ ] Push notifications for mobile
- [ ] Notification preferences/filtering
- [ ] Email notifications for critical events
- [ ] Notification history (database-stored)

---

**Last Updated:** Oct 6, 2025  
**Status:** ✅ Fully Operational  
**WebSocket Endpoint:** `ws://server:8000/ws/updates`


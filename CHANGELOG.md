# Changelog

All notable changes to the Ticketing System project.

## [Latest] - 2025-10-14

### ✨ New Features
- **Live Timer**: Real-time countdown for onsite tickets (updates every second while tech is checked in)
- **Claim Button**: Auto-assigns ticket to user who claims it
- **Column Visibility Toggle**: All list pages now have customizable column visibility (Sites, Tickets, Users, Tasks, Shipments, Inventory, Field Techs)
- **Admin Delete**: Admins can now delete tickets with confirmation dialog

### 🎨 UI/UX Improvements
- **Compact Redesign**: Complete overhaul of all pages and forms for high-density data display
- **Simplified Ticket Form**: Removed unnecessary fields (customer tab, category, color flags, urgent/VIP toggles)
- **Tighter Spacing**: Reduced whitespace throughout application to minimize scrolling
- **Live Dashboard**: Date/time updates every second with visual indicator
- **Better Tables**: Improved list views with better spacing and customizable columns

### 🐛 Bug Fixes
- Fixed timezone issues with check-in/check-out times (now timezone-aware)
- Fixed validation errors (422) caused by empty strings in optional fields
- Fixed infinite loop network errors on list pages
- Fixed `useParams` destructuring issues (ticket_id vs ticketId)
- Fixed comment posting (comment vs comment_text field mismatch)
- Fixed HTTP method mismatches (PATCH vs PUT on edit endpoints)
- Enhanced error handling for 422 and ECONNABORTED errors
- Increased API timeout from 10s to 30s for complex operations

### 🔧 Backend Improvements
- Auto-assignment when ticket is claimed
- Improved check-in/check-out logic with proper timezone handling
- Database schema updates for timezone-aware datetime columns
- Enhanced CORS configuration
- Merged Alembic migration heads

### 📦 Technical Changes
- Data cleaning utility to remove empty strings before API submission
- Improved toast error handling (ensures all messages are strings)
- Better WebSocket connection management
- Fixed dependency arrays in useEffect hooks to prevent infinite loops
- Enhanced error messages for validation failures

---

## Previous Updates

See Git commit history for detailed changelog of earlier versions.

### Key Components
- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Frontend**: React + Material-UI
- **Real-time**: WebSockets for live updates
- **Auth**: JWT-based authentication


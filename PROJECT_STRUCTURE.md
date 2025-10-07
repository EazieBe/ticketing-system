# Project Structure

## 🎯 **Current Clean Project Structure**

### **Root Directory** (Clean & Minimal)
```
ticketing-system/
├── app/                    # Backend FastAPI application
├── frontend/               # React frontend application
├── venv/                   # Python virtual environment
├── logs/                   # Current application logs
├── archive/                # Archived old files
├── .env                    # Environment configuration
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── README.md               # Main project documentation
├── requirements.txt        # Python dependencies
├── pyproject.toml          # Python project configuration
├── start_app.sh            # Application startup script
├── stop_app.sh             # Application shutdown script
└── CURRENT_BUILD_VERIFICATION.md  # Build verification
```

### **Backend (`/app/`)**
```
app/
├── main.py                 # Current optimized FastAPI app
├── crud.py                 # Current optimized CRUD operations
├── database.py             # Database configuration
├── models.py               # Database models
├── schemas.py              # Pydantic schemas
├── timezone_utils.py       # Timezone utilities
├── routers/                # Modular API endpoints
│   ├── tickets.py
│   ├── users.py
│   ├── sites.py
│   ├── shipments.py
│   ├── fieldtechs.py
│   ├── tasks.py
│   ├── equipment.py
│   ├── inventory.py
│   ├── sla.py
│   ├── audit.py
│   └── logging.py
├── utils/                  # Utility functions
│   ├── main_utils.py
│   ├── performance.py
│   ├── logging_config.py
│   └── response.py
└── alembic/                # Database migrations
    └── versions/
```

### **Frontend (`/frontend/`)**
```
frontend/
├── src/
│   ├── components/         # React components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── App.js              # Main React app
├── build/                  # Production build
├── public/                 # Static assets
└── package.json            # Node.js dependencies
```

### **Archive (`/archive/`)**
```
archive/
├── old_files/              # Old application files
├── old_scripts/            # Unused scripts
├── old_logs/               # Historical logs
├── outdated_docs/          # Outdated documentation
└── README.md               # Archive documentation
```

## 🚀 **Key Features**

### **Optimized Backend:**
- ✅ Modular router architecture (11 separate modules)
- ✅ N+1 query fixes with eager loading
- ✅ Performance monitoring and metrics
- ✅ Structured logging with error tracking
- ✅ Standardized API responses

### **Optimized Frontend:**
- ✅ Error boundaries for graceful error handling
- ✅ Performance monitoring with Web Vitals
- ✅ Intelligent caching system
- ✅ Optimized API and WebSocket hooks
- ✅ Memory leak prevention

### **Production Ready:**
- ✅ Clean, organized file structure
- ✅ No unnecessary files or scripts
- ✅ Proper separation of concerns
- ✅ Comprehensive error handling
- ✅ Performance optimizations

## 📋 **Quick Commands**

### **Start Application:**
```bash
./start_app.sh
```

### **Stop Application:**
```bash
./stop_app.sh
```

### **Access Application:**
- **Frontend**: http://192.168.43.50:3000
- **Backend API**: http://192.168.43.50:8000
- **API Docs**: http://192.168.43.50:8000/docs

## 🧹 **Cleanup Summary**

**Removed Files:**
- ❌ Outdated documentation (8 files)
- ❌ Old log files (2 files)
- ❌ Unused scripts (7 files)
- ❌ Docker/systemd files (not applicable)
- ❌ PM2 configuration (not used)

**Result:**
- ✅ Clean, minimal root directory
- ✅ Only current, active files
- ✅ All old files properly archived
- ✅ Production-ready structure

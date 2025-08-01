# 🎫 Modern Ticketing System

A comprehensive, full-stack ticketing system built with FastAPI and React, designed for IT service management, field operations, and customer support.

## ✨ Features

### 🎯 Core Functionality
- **Ticket Management**: Create, edit, assign, and track tickets with full lifecycle management
- **Site Management**: Manage customer locations with detailed equipment and contact information
- **User Management**: Role-based access control (Admin, Tech, Dispatcher, Billing)
- **Shipment Tracking**: Track equipment shipments with charges and return tracking
- **Inventory Management**: Manage equipment inventory and transactions
- **Field Tech Management**: Assign and track field technicians
- **Task Management**: Create and track internal tasks and projects
- **Equipment Tracking**: Monitor equipment across sites

### 🔧 Technical Features
- **Real-time Updates**: Live updates across all components without page refresh
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Mode**: User preference support
- **Auto-restart**: Services automatically restart on server reboot
- **Authentication**: JWT-based authentication with password management
- **Audit Logging**: Complete audit trail for all system changes

### 📊 Analytics & Reporting
- **Performance Dashboard**: Real-time KPIs and metrics
- **SLA Management**: Service Level Agreement tracking and alerts
- **Escalation Management**: Automatic escalation for SLA breaches
- **Business Intelligence**: Executive dashboards and reporting

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.8+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with OAuth2
- **API**: RESTful API with automatic documentation
- **Validation**: Pydantic schemas for data validation

### Frontend (React)
- **Framework**: React 18 with functional components
- **UI Library**: Material-UI (MUI) for modern interface
- **State Management**: React Context API
- **Routing**: React Router for navigation
- **HTTP Client**: Axios for API communication

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-github-repo-url>
   cd ticketing-system
   ```

2. **Backend Setup**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Set up database
   # (Database setup instructions in docs/)
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Start Services**
   ```bash
   # Backend (from project root)
   source venv/bin/activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   
   # Frontend (from frontend directory)
   serve -s build -l 3000 --single
   ```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:
```env
DATABASE_URL=postgresql://user:password@localhost/ticketing_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Database Setup
1. Create PostgreSQL database
2. Run Alembic migrations: `alembic upgrade head`
3. Seed initial data: `python seed_data.py`

## 📁 Project Structure

```
ticketing-system/
├── app/                    # Backend FastAPI application
│   ├── main.py            # Main application entry point
│   ├── models.py          # SQLAlchemy database models
│   ├── schemas.py         # Pydantic schemas
│   ├── crud.py            # Database CRUD operations
│   ├── database.py        # Database configuration
│   └── alembic/           # Database migrations
├── frontend/              # React frontend application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── build/             # Production build
├── venv/                  # Python virtual environment
├── logs/                  # Application logs
├── requirements.txt       # Python dependencies
├── ecosystem.config.js    # PM2 configuration
├── startup.sh            # Startup script
└── README.md             # This file
```

## 🛠️ Development

### Running in Development Mode
```bash
# Backend with auto-reload
uvicorn app.main:app --reload

# Frontend with hot reload
cd frontend
npm start
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head
```

### Testing
```bash
# Backend tests
pytest

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Production Setup
1. **Build frontend**: `npm run build`
2. **Set up systemd services**: Copy `.service` files to `/etc/systemd/system/`
3. **Enable services**: `sudo systemctl enable ticketing-backend ticketing-frontend`
4. **Start services**: `sudo systemctl start ticketing-backend ticketing-frontend`

### Alternative: PM2
```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password hashing
- **Role-based Access**: Granular permissions system
- **Audit Logging**: Complete system activity tracking
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Cross-origin resource sharing security

## 📈 Performance

- **Database Optimization**: Efficient queries with proper indexing
- **Caching**: Redis caching for frequently accessed data
- **Connection Pooling**: Database connection optimization
- **Frontend Optimization**: Code splitting and lazy loading
- **CDN Ready**: Static asset optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/docs` when running the backend

## 🔄 Version History

- **v1.0.0**: Initial release with core ticketing functionality
- **v1.1.0**: Added SLA management and escalation features
- **v1.2.0**: Implemented real-time updates and improved UI
- **v1.3.0**: Added auto-restart and production deployment features

---

**Built with ❤️ using FastAPI and React** 
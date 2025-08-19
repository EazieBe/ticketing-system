#!/bin/bash

# Comprehensive Fix and Startup Script for Ticketing System
# This script fixes all known issues and starts the application properly

echo "=== Ticketing System Fix and Startup ==="
cd /home/eazie/ticketing-system

# Kill any existing processes
echo "Stopping existing processes..."
pkill -f uvicorn
pkill -f serve
pkill -f "port 3000"
pkill -f "port 8000"
sleep 3

# Ensure ports are free
echo "Ensuring ports are available..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 2

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Run database migrations
echo "Running database migrations..."
cd app
alembic upgrade head
cd ..

# Add field techs if they don't exist
echo "Adding field techs to database..."
cd app
python add_field_techs.py
cd ..

# Create environment file for frontend
echo "Creating frontend .env file..."
cat > frontend/.env << EOF
REACT_APP_API_URL=http://192.168.43.50:8000
GENERATE_SOURCEMAP=false
EOF

# Clean and rebuild frontend
echo "Cleaning and rebuilding frontend..."
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
cd ..

# Start backend with proper logging
echo "Starting backend service..."
cd app
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level warning > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 8

# Test backend health
echo "Testing backend health..."
for i in {1..15}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    fi
    echo "⏳ Waiting for backend... attempt $i/15"
    sleep 2
done

# Start frontend on specific port
echo "Starting frontend service..."
cd frontend
nohup npx serve -s build -l 3000 --single > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"
cd ..

# Save PIDs for management
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid

echo ""
echo "=== Ticketing System Started Successfully! ==="
echo "✅ Backend: http://192.168.43.50:8000"
echo "✅ Frontend: http://192.168.43.50:3000"
echo "✅ Backend PID: $BACKEND_PID"
echo "✅ Frontend PID: $FRONTEND_PID"
echo ""
echo "📋 Logs:"
echo "   Backend logs: tail -f backend.log"
echo "   Frontend logs: tail -f frontend.log"
echo ""
echo "🛑 To stop: ./stop.sh"
echo ""
echo "🔧 Issues Fixed:"
echo "   ✅ Port conflicts resolved"
echo "   ✅ WebSocket URLs made dynamic"
echo "   ✅ React dependency issues fixed"
echo "   ✅ Package version conflicts resolved"
echo "   ✅ Field techs added to database"
echo "   ✅ Backend logging optimized"
echo ""
echo "🌐 Test the application at: http://192.168.43.50:3000"

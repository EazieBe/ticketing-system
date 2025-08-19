#!/bin/bash

# Ticketing System Startup Script
# This script rebuilds frontend, runs migrations, and starts both services

echo "=== Ticketing System Startup ==="
cd /home/eazie/ticketing-system

# Kill any existing processes
echo "Stopping existing processes..."
pkill -f uvicorn
pkill -f serve
pkill -f "port 3000"
sleep 2

# Ensure port 3000 is free
echo "Ensuring port 3000 is available..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Run database migrations
echo "Running database migrations..."
cd app
alembic upgrade head
cd ..

# Create environment file for frontend if it doesn't exist
if [ ! -f frontend/.env ]; then
    echo "Creating frontend .env file..."
    echo "REACT_APP_API_URL=http://192.168.43.50:8000" > frontend/.env
fi

# Rebuild frontend
echo "Rebuilding frontend..."
cd frontend
npm run build
cd ..

# Start backend
echo "Starting backend service..."
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Test backend health
echo "Testing backend health..."
for i in {1..10}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "Backend is healthy!"
        break
    fi
    echo "Waiting for backend... attempt $i/10"
    sleep 2
done

# Start frontend on specific port
echo "Starting frontend service..."
cd frontend
nohup npx serve -s build -l 3000 --single > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Save PIDs for management
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid

echo "=== Ticketing System Started Successfully! ==="
echo "Backend: http://192.168.43.50:8000"
echo "Frontend: http://192.168.43.50:3000"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Logs:"
echo "Backend logs: tail -f backend.log"
echo "Frontend logs: tail -f frontend.log"
echo ""
echo "To stop: ./stop.sh"

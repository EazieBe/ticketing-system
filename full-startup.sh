#!/bin/bash

# Ticketing System Full Startup Script
# This script rebuilds frontend, runs migrations, and starts both services

echo "=== Ticketing System Full Startup ==="
cd /home/eazie/ticketing-system

# Kill any existing processes
echo "Killing existing processes..."
pkill -f uvicorn
pkill -f serve
sleep 2

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

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

# Start frontend
echo "Starting frontend service..."
cd frontend
nohup serve -s build -l 3000 --single > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Save PIDs
echo $BACKEND_PID > /tmp/ticketing-backend.pid
echo $FRONTEND_PID > /tmp/ticketing-frontend.pid

echo "=== Ticketing System Started Successfully! ==="
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Logs: backend.log and frontend.log" 
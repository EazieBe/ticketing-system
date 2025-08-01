#!/bin/bash

# Ticketing System Startup Script
# This script starts both backend and frontend services

cd /home/eazie/ticketing-system

# Start backend
echo "Starting backend service..."
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend service..."
cd frontend
nohup serve -s build -l 3000 --single > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Save PIDs for later use
echo $BACKEND_PID > /tmp/ticketing-backend.pid
echo $FRONTEND_PID > /tmp/ticketing-frontend.pid

echo "Ticketing system started successfully!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000" 
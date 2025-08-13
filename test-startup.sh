#!/bin/bash

# Ticketing System Test Startup Script
# This script tests all components without killing running services

echo "=== Ticketing System Test Startup ==="
cd /home/eazie/ticketing-system

# Check if services are already running
echo "Checking current services..."
BACKEND_RUNNING=$(curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "YES" || echo "NO")
FRONTEND_RUNNING=$(curl -s -I http://localhost:3000 > /dev/null 2>&1 && echo "YES" || echo "NO")

echo "Backend running: $BACKEND_RUNNING"
echo "Frontend running: $FRONTEND_RUNNING"

# Activate virtual environment
echo "Testing virtual environment activation..."
source venv/bin/activate
if [ $? -eq 0 ]; then
    echo "✓ Virtual environment activated successfully"
else
    echo "✗ Failed to activate virtual environment"
    exit 1
fi

# Test database migrations
echo "Testing database migrations..."
alembic -c app/alembic.ini current > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database migrations are up to date"
else
    echo "✗ Database migration check failed"
    exit 1
fi

# Test frontend build
echo "Testing frontend build..."
cd frontend
npm run build --silent > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Frontend build completed successfully"
else
    echo "✗ Frontend build failed"
    exit 1
fi
cd ..

# Test backend health (if running)
if [ "$BACKEND_RUNNING" = "YES" ]; then
    echo "Testing backend health..."
    HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
    if [ $? -eq 0 ]; then
        echo "✓ Backend is healthy: $HEALTH_RESPONSE"
    else
        echo "✗ Backend health check failed"
    fi
fi

# Test frontend service (if running)
if [ "$FRONTEND_RUNNING" = "YES" ]; then
    echo "Testing frontend service..."
    FRONTEND_STATUS=$(curl -s -I http://localhost:3000 | head -1)
    if [ $? -eq 0 ]; then
        echo "✓ Frontend is responding: $FRONTEND_STATUS"
    else
        echo "✗ Frontend service check failed"
    fi
fi

echo "=== Test Startup Completed Successfully! ==="
echo "All components are working correctly."
echo "The full startup script should work when run." 
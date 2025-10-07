#!/bin/bash

# Ticketing System Stop Script
# This script properly shuts down both backend and frontend servers

set -e  # Exit on any error

echo "🛑 Stopping Ticketing System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local process_name=$2
    
    print_status "Stopping $process_name on port $port..."
    
    # Find processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        print_status "Found processes using port $port: $pids"
        
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                print_status "Stopping process $pid..."
                kill $pid
                
                # Wait for graceful shutdown
                local wait_count=0
                while kill -0 $pid 2>/dev/null && [ $wait_count -lt 10 ]; do
                    sleep 1
                    wait_count=$((wait_count + 1))
                done
                
                # Force kill if still running
                if kill -0 $pid 2>/dev/null; then
                    print_warning "Force killing process $pid..."
                    kill -9 $pid 2>/dev/null || true
                fi
                
                print_success "Stopped process $pid"
            fi
        done
        
        # Wait a moment for processes to fully terminate
        sleep 2
        
        # Verify port is free
        if lsof -ti:$port >/dev/null 2>&1; then
            print_warning "Port $port still in use, force killing remaining processes..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
        
        print_success "$process_name stopped"
    else
        print_status "$process_name is not running"
    fi
}

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Working directory: $SCRIPT_DIR"

# Stop servers using PID files if they exist
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_status "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        sleep 2
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_warning "Force killing backend server..."
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi
        print_success "Backend server stopped"
    else
        print_status "Backend server is not running"
    fi
    rm -f .backend.pid
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_status "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 2
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_warning "Force killing frontend server..."
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        print_success "Frontend server stopped"
    else
        print_status "Frontend server is not running"
    fi
    rm -f .frontend.pid
fi

# Also kill any processes on our target ports (in case PID files are missing)
kill_port 8000 "Backend"
kill_port 3000 "Frontend"

# Clean up any remaining temporary files
rm -f .backend.pid .frontend.pid

print_success "🎉 Ticketing System stopped successfully!"
echo ""
echo "📱 To restart the application, run: ./start_app.sh"

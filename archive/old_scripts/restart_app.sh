#!/bin/bash

# Ticketing System Restart Script
# This script stops the app and then starts it again

set -e  # Exit on any error

echo "🔄 Restarting Ticketing System..."

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Working directory: $SCRIPT_DIR"

# Stop the application
print_status "Stopping current application..."
./stop_app.sh

# Wait a moment for cleanup
sleep 3

# Start the application
print_status "Starting application..."
./start_app.sh

print_success "🎉 Ticketing System restarted successfully!"

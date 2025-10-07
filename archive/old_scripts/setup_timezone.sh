#!/bin/bash
# Setup Eastern Time Zone and NTP Time Sync
# This script configures the server to use Eastern Time (America/New_York)
# and syncs with NTP time servers

echo "=========================================="
echo "Setting up Eastern Time Zone and NTP Sync"
echo "=========================================="
echo ""

# Check if running as root/sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo: sudo bash setup_timezone.sh"
    exit 1
fi

# Display current timezone and time
echo "Current timezone configuration:"
timedatectl
echo ""

# Set timezone to Eastern Time (America/New_York)
echo "Setting timezone to America/New_York (Eastern Time)..."
timedatectl set-timezone America/New_York

if [ $? -eq 0 ]; then
    echo "✓ Timezone set successfully"
else
    echo "✗ Failed to set timezone"
    exit 1
fi

echo ""

# Install NTP if not already installed
echo "Checking for NTP/systemd-timesyncd..."
if ! systemctl is-active --quiet systemd-timesyncd; then
    echo "Starting systemd-timesyncd service..."
    systemctl start systemd-timesyncd
    systemctl enable systemd-timesyncd
fi

# Enable NTP synchronization
echo "Enabling NTP synchronization..."
timedatectl set-ntp true

if [ $? -eq 0 ]; then
    echo "✓ NTP synchronization enabled"
else
    echo "✗ Failed to enable NTP"
    exit 1
fi

echo ""

# Configure NTP servers (optional - use reliable US time servers)
echo "Configuring NTP servers..."
cat > /etc/systemd/timesyncd.conf << EOF
[Time]
NTP=time.nist.gov 0.north-america.pool.ntp.org 1.north-america.pool.ntp.org
FallbackNTP=time.cloudflare.com time.google.com
EOF

# Restart timesyncd to apply changes
echo "Restarting time synchronization service..."
systemctl restart systemd-timesyncd

echo ""

# Wait a moment for sync
sleep 2

# Display new configuration
echo "=========================================="
echo "New timezone configuration:"
echo "=========================================="
timedatectl
echo ""

# Show time sync status
echo "=========================================="
echo "Time synchronization status:"
echo "=========================================="
timedatectl timesync-status 2>/dev/null || systemctl status systemd-timesyncd --no-pager | head -20
echo ""

# Display current time in various formats
echo "=========================================="
echo "Current time information:"
echo "=========================================="
echo "Date and Time: $(date)"
echo "UTC Time:      $(date -u)"
echo "Timezone:      $(timedatectl | grep "Time zone" | awk '{print $3}')"
echo ""

echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Important notes:"
echo "1. All system times are now in Eastern Time (EST/EDT)"
echo "2. The system will automatically sync with NTP servers"
echo "3. Python's datetime will use this timezone by default"
echo "4. Restart your application for changes to take full effect"
echo ""
echo "To manually sync time immediately, run: sudo timedatectl set-ntp true"
echo ""


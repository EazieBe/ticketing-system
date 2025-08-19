#!/bin/bash

echo "Setting up automatic startup for Ticketing System..."

# Copy service files to systemd directory
echo "Installing systemd services..."
sudo cp ticketing-backend.service /etc/systemd/system/
sudo cp ticketing-frontend.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable services to start on boot
echo "Enabling services to start on boot..."
sudo systemctl enable ticketing-backend
sudo systemctl enable ticketing-frontend

echo "Automatic startup configured successfully!"
echo ""
echo "To start services now:"
echo "sudo systemctl start ticketing-backend"
echo "sudo systemctl start ticketing-frontend"
echo ""
echo "To check status:"
echo "sudo systemctl status ticketing-backend"
echo "sudo systemctl status ticketing-frontend"
echo ""
echo "To view logs:"
echo "sudo journalctl -u ticketing-backend -f"
echo "sudo journalctl -u ticketing-frontend -f"
echo ""
echo "Services will now start automatically on reboot!"


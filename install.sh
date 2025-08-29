#!/bin/bash

# SNCB Insights Installation Script for Linux VPS
# Usage: ./install.sh [user@]hostname [ssh-options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[+]${NC} $1"
}

error() {
    echo -e "${RED}[-]${NC} $1" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if hostname is provided
if [ $# -eq 0 ]; then
    error "Usage: $0 [user@]hostname [ssh-options]"
fi

HOSTNAME=$1
shift
SSH_OPTS="$@"

# Project configuration
APP_NAME=$(cat package.json | jq -r '.name')
APP_VERSION=$(cat package.json | jq -r '.version')
BINARY_NAME="${APP_NAME}-${APP_VERSION}-linux-x64"
LOCAL_BINARY="target/${BINARY_NAME}"
REMOTE_DIR="/opt/sncb"
SYSTEMD_SERVICE="/etc/systemd/system/sncb-insights.service"
CRON_FILE="/etc/cron.d/sncb-insights"

log "Starting SNCB Insights installation on ${HOSTNAME}"

# Check if local binary exists
if [ ! -f "$LOCAL_BINARY" ]; then
    error "Binary not found: $LOCAL_BINARY. Please run build.sh first."
fi

log "Found binary: $LOCAL_BINARY"

# Test SSH connection
log "Testing SSH connection to ${HOSTNAME}..."
if ! ssh $SSH_OPTS "$HOSTNAME" "echo 'SSH connection successful'" >/dev/null 2>&1; then
    error "Cannot connect to ${HOSTNAME}. Please check your SSH configuration."
fi

log "SSH connection successful"

# Create installation script for remote execution
INSTALL_SCRIPT=$(cat << 'EOF'
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[+]${NC} $1"
}

error() {
    echo -e "${RED}[-]${NC} $1" >&2
    exit 1
}

log "Starting remote installation..."

# Create sncb user if it doesn't exist
if ! id "sncb" &>/dev/null; then
    log "Creating sncb system user..."
    sudo useradd --system --no-create-home --shell /usr/sbin/nologin sncb
else
    log "User 'sncb' already exists"
fi

# Create application directory
log "Creating application directory: /opt/sncb"
sudo mkdir -p /opt/sncb
sudo chown sncb:sncb /opt/sncb
sudo chmod 755 /opt/sncb

# Set up the binary
log "Setting up binary..."
sudo mv /tmp/sncb-insights-binary /opt/sncb/sncb-insights
sudo chown sncb:sncb /opt/sncb/sncb-insights
sudo chmod 755 /opt/sncb/sncb-insights

# Create systemd service file
log "Creating systemd service..."
sudo tee /etc/systemd/system/sncb-insights.service > /dev/null << 'SYSTEMD_EOF'
[Unit]
Description=SNCB Insights Service
After=network.target

[Service]
Type=simple
User=sncb
Group=sncb
WorkingDirectory=/opt/sncb
ExecStart=/opt/sncb/sncb-insights --server
Restart=always
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

# Create systemd override directory for port configuration
log "Configuring service port..."
sudo mkdir -p /etc/systemd/system/sncb-insights.service.d
sudo tee /etc/systemd/system/sncb-insights.service.d/port.conf > /dev/null << 'PORT_EOF'
[Service]
Environment=PORT=9003
PORT_EOF

# Create cron job for wake command
log "Setting up cron job for wake command..."
sudo tee /etc/cron.d/sncb-insights > /dev/null << 'CRON_EOF'
# SNCB Insights wake command - runs every hour
0 * * * * sncb /opt/sncb/sncb-insights --wake >/dev/null 2>&1
CRON_EOF

sudo chmod 644 /etc/cron.d/sncb-insights

# Reload systemd and enable service
log "Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable sncb-insights.service

# Start the service
log "Starting SNCB Insights service..."
sudo systemctl start sncb-insights.service

# Check service status
if sudo systemctl is-active --quiet sncb-insights.service; then
    log "Service started successfully!"
else
    error "Failed to start service. Check logs with: sudo journalctl -u sncb-insights.service"
fi

# Show service status
log "Service status:"
sudo systemctl status sncb-insights.service --no-pager -l

log "Installation completed successfully!"
log "Service is running on port 9003"
log "Wake command will run every hour via cron"
log "Check logs with: sudo journalctl -u sncb-insights.service -f"
log "Check service status with: sudo systemctl status sncb-insights.service"

EOF
)

# Upload binary to remote server
log "Uploading binary to ${HOSTNAME}..."
scp $SSH_OPTS "$LOCAL_BINARY" "$HOSTNAME:/tmp/sncb-insights-binary"

log "Binary uploaded successfully"

# Execute installation script on remote server
log "Executing installation on remote server..."
ssh $SSH_OPTS "$HOSTNAME" "bash -s" <<< "$INSTALL_SCRIPT"

log "Installation completed!"
log ""
log "Summary:"
log "  - Service: sncb-insights.service (running on port 9003)"
log "  - User: sncb (system account)"
log "  - Directory: /opt/sncb"
log "  - Cron: Wake command runs every hour"
log "  - Logs: sudo journalctl -u sncb-insights.service -f"
log ""
log "Service management commands:"
log "  sudo systemctl status sncb-insights.service"
log "  sudo systemctl stop sncb-insights.service"
log "  sudo systemctl start sncb-insights.service"
log "  sudo systemctl restart sncb-insights.service"
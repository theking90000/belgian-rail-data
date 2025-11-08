#!/bin/bash

# Belgian Rail Data Installation Script for Linux VPS
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
REMOTE_DIR="/opt/belgian-rail-data"
SYSTEMD_SERVICE="/etc/systemd/system/belgian-rail-data.service"
CRON_FILE="/etc/cron.d/belgian-rail-data"

log "Starting Belgian Rail Data installation on ${HOSTNAME}"

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

# Create belgian-rail-data user if it doesn't exist
if ! id "belgian-rail-data" &>/dev/null; then
    log "Creating belgian-rail-data system user..."
    sudo useradd --system --no-create-home --shell /usr/sbin/nologin belgian-rail-data
else
    log "User 'belgian-rail-data' already exists"
fi

# Create application directory
log "Creating application directory: /opt/belgian-rail-data"
sudo mkdir -p /opt/belgian-rail-data
sudo chown belgian-rail-data:belgian-rail-data /opt/belgian-rail-data
sudo chmod 755 /opt/belgian-rail-data

# Set up the binary
log "Setting up binary..."
sudo mv /tmp/belgian-rail-data-binary /opt/belgian-rail-data/belgian-rail-data
sudo chown belgian-rail-data:belgian-rail-data /opt/belgian-rail-data/belgian-rail-data
sudo chmod 755 /opt/belgian-rail-data/belgian-rail-data

# Create systemd service file
log "Creating systemd service..."
sudo tee /etc/systemd/system/belgian-rail-data.service > /dev/null << 'SYSTEMD_EOF'
[Unit]
Description=Belgian Rail Data Service
After=network.target

[Service]
Type=simple
User=belgian-rail-data
Group=belgian-rail-data
WorkingDirectory=/opt/belgian-rail-data
ExecStart=/opt/belgian-rail-data/belgian-rail-data --server --port 9004
Restart=always
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

sudo tee /etc/cron.d/belgian-rail-data > /dev/null << 'CRON_EOF'
# Belgian Rail Data wake command - runs every hour
0 * * * * belgian-rail-data cd /opt/belgian-rail-data && /opt/belgian-rail-data/belgian-rail-data --wake >/dev/null 2>&1
CRON_EOF

sudo chmod 644 /etc/cron.d/belgian-rail-data

# Reload systemd and enable service
log "Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable belgian-rail-data.service

# Start the service
log "Starting Belgian Rail Data service..."
sudo systemctl start belgian-rail-data.service

# Check service status
if sudo systemctl is-active --quiet belgian-rail-data.service; then
    log "Service started successfully!"
else
    error "Failed to start service. Check logs with: sudo journalctl -u belgian-rail-data.service"
fi

# Show service status
log "Service status:"
sudo systemctl status belgian-rail-data.service --no-pager -l

log "Installation completed successfully!"
log "Service is running on port 9003"
log "Wake command will run every hour via cron"
log "Check logs with: sudo journalctl -u belgian-rail-data.service -f"
log "Check service status with: sudo systemctl status belgian-rail-data.service"

EOF
)

# Upload binary to remote server
log "Uploading binary to ${HOSTNAME}..."
scp $SSH_OPTS "$LOCAL_BINARY" "$HOSTNAME:/tmp/belgian-rail-data-binary"

log "Binary uploaded successfully"

# Execute installation script on remote server
log "Executing installation on remote server..."
ssh $SSH_OPTS "$HOSTNAME" "bash -s" <<< "$INSTALL_SCRIPT"

log "Installation completed!"
log ""
log "Summary:"
log "  - Service: belgian-rail-data.service (running on port 9004)"
log "  - User: belgian-rail-data (system account)"
log "  - Directory: /opt/belgian-rail-data"
log "  - Cron: Wake command runs every hour"
log "  - Logs: sudo journalctl -u belgian-rail-data.service -f"
log ""
log "Service management commands:"
log "  sudo systemctl status belgian-rail-data.service"
log "  sudo systemctl stop belgian-rail-data.service"
log "  sudo systemctl start belgian-rail-data.service"
log "  sudo systemctl restart belgian-rail-data.service"
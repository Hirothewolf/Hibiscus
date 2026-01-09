#!/bin/bash
#
# Hibiscus 🌺 - Linux/macOS Installer
# This script installs Node.js (if needed) and sets up the application
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="Hibiscus"
MIN_NODE_VERSION=16

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}   🌺 $APP_NAME Installer${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_VERSION" -ge "$MIN_NODE_VERSION" ]; then
            print_success "Node.js v$(node -v) found"
            return 0
        else
            print_warning "Node.js version $(node -v) is too old (minimum: v$MIN_NODE_VERSION)"
            return 1
        fi
    else
        print_warning "Node.js not found"
        return 1
    fi
}

install_node() {
    print_info "Installing Node.js..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            # Debian/Ubuntu
            print_info "Detected Debian/Ubuntu - using apt..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            # Fedora
            print_info "Detected Fedora - using dnf..."
            sudo dnf install -y nodejs npm
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            print_info "Detected CentOS/RHEL - using yum..."
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs
        elif command -v pacman &> /dev/null; then
            # Arch Linux
            print_info "Detected Arch Linux - using pacman..."
            sudo pacman -S --noconfirm nodejs npm
        else
            print_error "Could not detect package manager. Please install Node.js manually."
            print_info "Visit: https://nodejs.org/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            print_info "Using Homebrew to install Node.js..."
            brew install node
        else
            print_error "Homebrew not found. Please install Node.js manually."
            print_info "Visit: https://nodejs.org/"
            exit 1
        fi
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    print_success "Node.js installed successfully"
}

create_run_script() {
    print_info "Creating run script..."
    
    cat > "$SCRIPT_DIR/run.sh" << 'RUNSCRIPT'
#!/bin/bash
#
# ArtPollinations Studio - Run Script
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/app"

echo ""
echo "🎨 Starting ArtPollinations Studio..."
echo ""

# Start server
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Open browser
URL="http://localhost:3333"
if command -v xdg-open &> /dev/null; then
    xdg-open "$URL" 2>/dev/null
elif command -v open &> /dev/null; then
    open "$URL"
elif command -v start &> /dev/null; then
    start "$URL"
else
    echo "Please open $URL in your browser"
fi

echo "Server running at $URL"
echo "Press Ctrl+C to stop"
echo ""

# Wait for server process
wait $SERVER_PID
RUNSCRIPT

    chmod +x "$SCRIPT_DIR/run.sh"
    print_success "Run script created: run.sh"
}

create_desktop_entry() {
    print_info "Creating desktop entry..."
    
    DESKTOP_FILE="$HOME/.local/share/applications/hibiscus.desktop"
    mkdir -p "$(dirname "$DESKTOP_FILE")"
    
    cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=Hibiscus
Comment=AI Image & Video Generation Studio
Exec=$SCRIPT_DIR/run.sh
Icon=$SCRIPT_DIR/app/icon.png
Terminal=true
Type=Application
Categories=Graphics;
EOF

    print_success "Desktop entry created"
}

main() {
    print_banner
    
    print_info "Installation directory: $SCRIPT_DIR"
    echo ""
    
    # Check/install Node.js
    if ! check_node; then
        echo ""
        read -p "Would you like to install Node.js? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_node
        else
            print_error "Node.js is required. Installation aborted."
            exit 1
        fi
    fi
    
    # Create run script
    create_run_script
    
    # Create desktop entry (Linux only)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        read -p "Create desktop shortcut? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_desktop_entry
        fi
    fi
    
    # Create gallery directory
    mkdir -p "$SCRIPT_DIR/app/gallery"
    print_success "Gallery directory created"
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✓ Installation Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo "To start the application, run:"
    echo -e "  ${BLUE}./run.sh${NC}"
    echo ""
    echo "Or double-click 'run.sh' in your file manager."
    echo ""
}

main "$@"

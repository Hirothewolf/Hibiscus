#!/bin/bash
#
# Hibiscus 🌺 - Build Script for Linux/macOS
# This creates distributable packages
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Building Hibiscus 🌺${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found! Please install from https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Node.js found: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm not found!${NC}"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} npm found: $(npm -v)"

# Create gallery folder
mkdir -p app/gallery
echo -e "${GREEN}[OK]${NC} Gallery directory ready"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install
echo -e "${GREEN}[OK]${NC} Dependencies installed"

# Build based on OS
echo ""
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Building for Linux..."
    npm run build:linux
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Building for macOS..."
    npm run build:mac
else
    echo "Building for current platform..."
    npm run build
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ Build Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Output files are in the 'dist' folder"
echo ""

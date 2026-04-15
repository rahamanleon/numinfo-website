#!/bin/bash
# Start picobot Messenger channel
# Run this script to start the Facebook Messenger bot

echo "╔═══════════════════════════════════════╗"
echo "║     picobot Messenger Starter         ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MESSENGER_DIR="/data/data/com.termux/files/home/.picoclaw/channels/messenger"
cd "$MESSENGER_DIR"

# Check Node.js version
echo -e "${BLUE}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Install with: pkg install nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${YELLOW}⚠ Node.js version too old (need v20+)${NC}"
    exit 1
fi

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check for env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating from template..."
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
    echo -e "${YELLOW}⚠ Please edit .env with your settings${NC}"
fi

# Check for appstate
if [ ! -f "appstate.json" ]; then
    echo -e "${RED}✗ appstate.json not found!${NC}"
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "  SETUP REQUIRED: Facebook AppState"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "1. Login to Facebook in browser"
    echo "2. Install 'C3C FbState' extension"
    echo "3. Export cookies as JSON"
    echo "4. Save to: messenger/appstate.json"
    echo ""
    echo "Expected format:"
    echo '[{"key":"c_user","value":"...","domain":".facebook.com"}]'
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ All checks passed${NC}"
echo ""

# Show config
echo "=========================================="
echo "  Configuration"
echo "=========================================="
grep -E "^(ADMIN_UID|MODE|WHITE_MODE|THREAD_MODE)" .env 2>/dev/null || echo "Using defaults"
echo ""
echo "=========================================="

# Start the bot
echo -e "${GREEN}Starting Messenger bot...${NC}"
echo ""

if [ "$1" == "dev" ]; then
    npm run dev
else
    npm start
fi

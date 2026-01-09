#!/bin/bash
#
# Hibiscus 🌺 - Run Script
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/app"

echo ""
echo "🌺 ═══════════════════════════════════════════════════"
echo "   Hibiscus - AI Art Studio"
echo "═════════════════════════════════════════════════════"
echo ""

# Create gallery folder if not exists
mkdir -p gallery

# Start server
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Open browser
URL="http://localhost:3333"
echo "🌐 Opening browser at $URL"

if command -v xdg-open &> /dev/null; then
    xdg-open "$URL" 2>/dev/null
elif command -v open &> /dev/null; then
    open "$URL"
elif command -v start &> /dev/null; then
    start "$URL"
else
    echo "Please open $URL in your browser"
fi

echo ""
echo "Server running at $URL"
echo "Press Ctrl+C to stop"
echo ""

# Handle shutdown
trap "echo ''; echo '👋 Shutting down...'; kill $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for server process
wait $SERVER_PID

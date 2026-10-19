#!/bin/bash
# Zamzam Foods — Disable macOS Automatic Backend Startup

PLIST_FILE="$HOME/Library/LaunchAgents/com.zamzamfoods.backend.plist"

echo "=================================================="
echo "  Zamzam Foods — Disable Auto-Start on macOS Boot"
echo "=================================================="
echo ""

if [ -f "$PLIST_FILE" ]; then
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
    rm -f "$PLIST_FILE"
    echo "✓ Auto-start disabled. LaunchAgent removed."
else
    echo "Auto-start is already disabled."
fi
echo "=================================================="

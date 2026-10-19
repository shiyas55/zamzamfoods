#!/bin/bash
# Zamzam Foods — macOS Automatic Backend Startup on Boot/Login

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON_EXEC="$PROJECT_DIR/.venv/bin/python"
MANAGE_PY="$PROJECT_DIR/backend/manage.py"
PLIST_FILE="$HOME/Library/LaunchAgents/com.zamzamfoods.backend.plist"

echo "=================================================="
echo "  Zamzam Foods — Enable Auto-Start on macOS Boot"
echo "=================================================="
echo ""

if [ ! -f "$PYTHON_EXEC" ]; then
    echo "ERROR: Virtual environment not found at $PYTHON_EXEC"
    exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

# Unload previous service if already loaded
launchctl unload "$PLIST_FILE" 2>/dev/null || true

cat <<EOF > "$PLIST_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.zamzamfoods.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PYTHON_EXEC</string>
        <string>$MANAGE_PY</string>
        <string>runserver</string>
        <string>127.0.0.1:8000</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$PROJECT_DIR/backend/backend_stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$PROJECT_DIR/backend/backend_stderr.log</string>
</dict>
</plist>
EOF

# Load and start the service
launchctl load "$PLIST_FILE"

echo "✓ Created LaunchAgent at: $PLIST_FILE"
echo "✓ Service com.zamzamfoods.backend registered and started!"
echo ""
echo "Zamzam Foods Backend will now AUTOMATICALLY start in the background"
echo "every time your Mac turns on or logs in."
echo ""
echo "To disable auto-start anytime, run: ./disable_autostart_mac.sh"
echo "=================================================="

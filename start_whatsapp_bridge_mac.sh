#!/usr/bin/env bash
cd "$(dirname "$0")/whatsapp-bridge"

echo "=============================================================================="
echo "            ZAMZAM FOODS - WHATSAPP AUTOMATION BRIDGE (macOS)"
echo "=============================================================================="
echo ""
echo "Starting WhatsApp Bridge on http://localhost:3005 ..."
echo ""

node server.js

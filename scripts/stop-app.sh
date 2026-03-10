#!/bin/bash

# Configuration
PROJECT_DIR="/Users/hemanshikaa/Documents/SalesCalc"
LOG_DIR="$PROJECT_DIR/logs"

echo "🛑 Stopping SalesCalc Unified Server..."

# 1. Stop Unified Server
if [ -f "$LOG_DIR/server.pid" ]; then
    PID=$(cat "$LOG_DIR/server.pid")
    echo "Stopping Server (PID: $PID)..."
    kill $PID && rm "$LOG_DIR/server.pid"
    echo "✅ Server stopped."
else
    # Fallback if PID file missing
    PID=$(lsof -t -i:3000)
    if [ ! -z "$PID" ]; then
        kill $PID
        echo "✅ Server stopped (found by port)."
    else
        echo "ℹ️ Server was not running."
    fi
fi

# 2. Cleanup Legacy processes (if any)
PID8000=$(lsof -t -i:8000)
if [ ! -z "$PID8000" ]; then
    echo "🧹 Cleaning up legacy frontend on port 8000..."
    kill $PID8000
fi

echo "👋 All processes stopped."

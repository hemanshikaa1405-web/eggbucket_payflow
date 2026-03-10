#!/bin/bash

# Configuration
PROJECT_DIR="/Users/hemanshikaa/Documents/SalesCalc"
LOG_DIR="$PROJECT_DIR/logs"
PORT=3000

echo "🚀 Starting SalesCalc Unified Server..."

cd "$PROJECT_DIR"

# 1. Stop python server if running on port 8000 (cleanup)
PID8000=$(lsof -t -i:8000)
if [ ! -z "$PID8000" ]; then
    echo "🧹 Cleaning up legacy frontend on port 8000..."
    kill $PID8000
fi

# 2. Start Unified Express Server
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Server already running on port $PORT. Restarting..."
    ./scripts/stop-app.sh
fi

echo "📦 Starting Server..."
nohup npm start > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$LOG_DIR/server.pid"
echo "✅ Server started (PID: $SERVER_PID)"

echo "✨ SalesCalc is active!"
echo "🔗 URL: http://localhost:$PORT"
echo "📄 Logs available in $LOG_DIR"

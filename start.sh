#!/bin/bash
set -euo pipefail

echo "[Swap Optimizer] Starting the path-finder service..."

# Logs
mkdir -p logs
LOG_FILE="logs/run_$(date +'%Y%m%d_%H%M%S').log"
exec > >(tee -a "$LOG_FILE") 2>&1

PID_FILE="orchestrator.pid"

# Check .env exists
if [ ! -f .env ]; then
    echo "[ERROR] Missing .env file. Please run setup.sh first."
    exit 1
fi

# Prevent double start
if [ -f "$PID_FILE" ]; then
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "[ERROR] Orchestrator already running with PID $(cat "$PID_FILE")."
        exit 1
    else
        echo "[WARN] Removing stale PID file."
        rm -f "$PID_FILE"
    fi
fi

# Build and start orchestrator
npm run build || { echo "[ERROR] npm run build failed"; exit 1; }
npm start &
APP_PID=$!
echo $APP_PID > "$PID_FILE"
echo "[INFO] Orchestrator started with PID $APP_PID"

# Cleanup on exit
cleanup() {
    echo "[INFO] Cleaning up..."
    rm -f "$PID_FILE"
}
trap cleanup EXIT

# Wait for orchestrator process
wait $APP_PID
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "[ERROR] Orchestrator crashed with exit code $EXIT_CODE"
    exit $EXIT_CODE
else
    echo "[INFO] Orchestrator stopped gracefully."
fi

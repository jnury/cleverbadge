#!/bin/bash

# Stop Test Environment
# Stops and cleans up PostgreSQL container, backend, and frontend started by start-test.sh

CONTAINER_NAME="cleverbadge-test-postgres"
BACKEND_PID_FILE="/tmp/cleverbadge-test-backend.pid"
FRONTEND_PID_FILE="/tmp/cleverbadge-test-frontend.pid"
LOG_DIR="/tmp/cleverbadge-test-logs"

echo "========================================"
echo "🛑 STOPPING TEST ENVIRONMENT"
echo "========================================"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Stop frontend
if [ -f "$FRONTEND_PID_FILE" ]; then
  FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
  if kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "🎨 Stopping frontend (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
    sleep 1
    # Force kill if still running
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
      kill -9 "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo "  ✓ Frontend stopped"
  else
    echo "  Frontend not running"
  fi
  rm -f "$FRONTEND_PID_FILE"
else
  echo "  No frontend PID file found"
fi

# Stop backend
if [ -f "$BACKEND_PID_FILE" ]; then
  BACKEND_PID=$(cat "$BACKEND_PID_FILE")
  if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "🔧 Stopping backend (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
    sleep 1
    # Force kill if still running
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
      kill -9 "$BACKEND_PID" 2>/dev/null || true
    fi
    echo "  ✓ Backend stopped"
  else
    echo "  Backend not running"
  fi
  rm -f "$BACKEND_PID_FILE"
else
  echo "  No backend PID file found"
fi

# Stop PostgreSQL container
if docker ps -a | grep -q "$CONTAINER_NAME"; then
  echo "🐳 Stopping PostgreSQL container..."
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
  echo "  ✓ PostgreSQL container removed"
else
  echo "  No PostgreSQL container found"
fi

# Clean up logs (optional - keep for debugging)
if [ -d "$LOG_DIR" ]; then
  echo "📋 Log files available at: $LOG_DIR"
  echo "   (Run 'rm -rf $LOG_DIR' to clean up)"
fi

echo ""
echo "========================================"
echo "✅ TEST ENVIRONMENT STOPPED"
echo "========================================"
echo ""

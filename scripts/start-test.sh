#!/bin/bash
set -e

# Start Test Environment
# Starts PostgreSQL, backend (port 3001), and frontend (port 5174) for E2E testing
# This runs in parallel with the dev environment (ports 3000/5173)
#
# Automatically cleans up any previous test environment before starting

CONTAINER_NAME="cleverbadge-test-postgres"
BACKEND_PID_FILE="/tmp/cleverbadge-test-backend.pid"
FRONTEND_PID_FILE="/tmp/cleverbadge-test-frontend.pid"
LOG_DIR="/tmp/cleverbadge-test-logs"

# Test environment ports (different from dev)
export TEST_BACKEND_PORT=3001
export TEST_FRONTEND_PORT=5174
export TEST_POSTGRES_PORT=5433

echo "========================================"
echo "🚀 STARTING TEST ENVIRONMENT"
echo "========================================"
echo ""
echo "Ports:"
echo "  PostgreSQL: $TEST_POSTGRES_PORT"
echo "  Backend:    $TEST_BACKEND_PORT"
echo "  Frontend:   $TEST_FRONTEND_PORT"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Create log directory
mkdir -p "$LOG_DIR"

# ============================================
# CLEANUP PREVIOUS INSTANCES
# ============================================
echo "🧹 Cleaning up previous instances..."

# Stop frontend from PID file
if [ -f "$FRONTEND_PID_FILE" ]; then
  FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
  if kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    sleep 1
    kill -9 "$FRONTEND_PID" 2>/dev/null || true
  fi
  rm -f "$FRONTEND_PID_FILE"
fi

# Stop backend from PID file
if [ -f "$BACKEND_PID_FILE" ]; then
  BACKEND_PID=$(cat "$BACKEND_PID_FILE")
  if kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    sleep 1
    kill -9 "$BACKEND_PID" 2>/dev/null || true
  fi
  rm -f "$BACKEND_PID_FILE"
fi

# Stop PostgreSQL container if exists
if docker ps -a | grep -q "$CONTAINER_NAME"; then
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

# Kill any processes still holding the ports (fallback)
kill_port_process() {
  local port=$1
  local pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill $pid 2>/dev/null || true
    sleep 1
    kill -9 $pid 2>/dev/null || true
  fi
}

kill_port_process $TEST_POSTGRES_PORT
kill_port_process $TEST_BACKEND_PORT
kill_port_process $TEST_FRONTEND_PORT

echo "  ✓ Cleanup complete"
echo ""

# Start PostgreSQL container
echo "🐳 Starting PostgreSQL container on port $TEST_POSTGRES_PORT..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cleverbadge \
  -p $TEST_POSTGRES_PORT:5432 \
  postgres:14 >/dev/null

echo "  Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
    echo "  ✓ PostgreSQL is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "  ❌ PostgreSQL failed to start within 30 seconds"
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
    exit 1
  fi
  sleep 1
done
echo ""

# Setup database users
echo "🔧 Setting up test database users..."

# Create admin user for schema operations
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "CREATE USER cleverbadge_admin WITH PASSWORD 'testpass';" >/dev/null
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;" >/dev/null
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "GRANT ALL ON SCHEMA public TO cleverbadge_admin;" >/dev/null

# Create test user for runtime operations
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "CREATE USER cleverbadge_test WITH PASSWORD 'testpass';" >/dev/null
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "GRANT CONNECT ON DATABASE cleverbadge TO cleverbadge_test;" >/dev/null

echo "  ✓ Database users created"
echo ""

# Set environment variables
export DATABASE_URL="postgresql://cleverbadge_test:testpass@localhost:$TEST_POSTGRES_PORT/cleverbadge"
export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:testpass@localhost:$TEST_POSTGRES_PORT/cleverbadge"
export NODE_ENV=testing
export JWT_SECRET=test-secret-key-for-e2e
export PORT=$TEST_BACKEND_PORT
export VITE_API_URL="http://localhost:$TEST_BACKEND_PORT"

# Run database migrations
echo "📦 Running database migrations..."
cd backend
npm run reset-test-schema 2>&1 | tail -5
cd ..
echo "  ✓ Database schema ready"
echo ""

# Start backend
echo "🔧 Starting backend on port $TEST_BACKEND_PORT..."
cd backend
PORT=$TEST_BACKEND_PORT \
DATABASE_URL="$DATABASE_URL" \
NODE_ENV=testing \
JWT_SECRET="$JWT_SECRET" \
node index.js > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$BACKEND_PID_FILE"
cd ..

# Wait for backend to be ready
echo "  Waiting for backend to be ready..."
for i in {1..30}; do
  if curl -s "http://localhost:$TEST_BACKEND_PORT/health" >/dev/null 2>&1; then
    echo "  ✓ Backend is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "  ❌ Backend failed to start within 30 seconds"
    echo "  Check logs: $LOG_DIR/backend.log"
    ./scripts/stop-test.sh
    exit 1
  fi
  sleep 1
done
echo ""

# Start frontend
echo "🎨 Starting frontend on port $TEST_FRONTEND_PORT..."
cd frontend
PORT=$TEST_FRONTEND_PORT \
VITE_API_URL="http://localhost:$TEST_BACKEND_PORT" \
npx vite > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$FRONTEND_PID_FILE"
cd ..

# Wait for frontend to be ready
echo "  Waiting for frontend to be ready..."
for i in {1..30}; do
  if curl -s "http://localhost:$TEST_FRONTEND_PORT" >/dev/null 2>&1; then
    echo "  ✓ Frontend is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "  ❌ Frontend failed to start within 30 seconds"
    echo "  Check logs: $LOG_DIR/frontend.log"
    ./scripts/stop-test.sh
    exit 1
  fi
  sleep 1
done
echo ""

echo "========================================"
echo "✅ TEST ENVIRONMENT READY"
echo "========================================"
echo ""
echo "Services:"
echo "  PostgreSQL: localhost:$TEST_POSTGRES_PORT"
echo "  Backend:    http://localhost:$TEST_BACKEND_PORT"
echo "  Frontend:   http://localhost:$TEST_FRONTEND_PORT"
echo ""
echo "Logs:"
echo "  Backend:  $LOG_DIR/backend.log"
echo "  Frontend: $LOG_DIR/frontend.log"
echo ""
echo "Run E2E tests:"
echo "  cd frontend && PLAYWRIGHT_REUSE_SERVER=1 TEST_BACKEND_PORT=$TEST_BACKEND_PORT TEST_FRONTEND_PORT=$TEST_FRONTEND_PORT npm run test:e2e"
echo ""
echo "Stop environment:"
echo "  ./scripts/stop-test.sh"
echo ""

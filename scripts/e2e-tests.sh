#!/bin/bash
set -e

# E2E Tests - Replicates GitHub Actions CI environment
# This script matches the e2e-tests job in .github/workflows/ci.yml
# Manages full PostgreSQL container lifecycle: start → setup → test → cleanup
#
# Uses different ports to allow parallel execution with dev environment:
#   PostgreSQL: 5433 (dev uses 5432)
#   Backend:    3001 (dev uses 3000)
#   Frontend:   5174 (dev uses 5173)

CONTAINER_NAME="cleverbadge-test-postgres"
TEST_FAILED=0

# Test environment ports (different from dev)
export TEST_BACKEND_PORT=3001
export TEST_FRONTEND_PORT=5174
export TEST_POSTGRES_PORT=5433

echo "========================================"
echo "🌐 E2E TESTS (CI Environment)"
echo "========================================"
echo ""
echo "Ports: PostgreSQL=$TEST_POSTGRES_PORT, Backend=$TEST_BACKEND_PORT, Frontend=$TEST_FRONTEND_PORT"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Cleanup function to ensure container is removed
cleanup() {
  echo ""
  echo "🧹 Cleaning up..."
  if docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo "  Stopping and removing PostgreSQL container..."
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo "  ✓ Container removed"
  fi

  if [ $TEST_FAILED -eq 1 ]; then
    echo ""
    echo "❌ TESTS FAILED"
    exit 1
  fi
}

# Register cleanup function to run on script exit
trap cleanup EXIT

# Check if port 5433 is already in use
if lsof -Pi :$TEST_POSTGRES_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "❌ Error: Port $TEST_POSTGRES_PORT is already in use"
  echo "Please stop any containers using this port:"
  echo "  docker stop <container-name>"
  exit 1
fi

# Start PostgreSQL container on port 5433 (to avoid conflict with local dev on 5432)
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
    exit 1
  fi
  sleep 1
done
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci --silent
cd ..
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm ci --silent
echo ""

# Install Playwright browsers (matching CI workflow lines 149-151)
echo "📦 Installing Playwright browsers..."
npx playwright install --with-deps chromium >/dev/null 2>&1
echo "  ✓ Playwright browsers installed"
echo ""

# Setup test database users (matching CI workflow lines 153-164)
echo "🔧 Setting up test database users..."
export PGPASSWORD=postgres

# Create admin user for schema operations
echo "  Creating cleverbadge_admin user..."
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "CREATE USER cleverbadge_admin WITH PASSWORD 'testpass';" >/dev/null
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;" >/dev/null
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "GRANT ALL ON SCHEMA public TO cleverbadge_admin;" >/dev/null

# Create test user for runtime operations (E2E tests use test user with testing schema)
echo "  Creating cleverbadge_test user..."
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "CREATE USER cleverbadge_test WITH PASSWORD 'testpass';" >/dev/null
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "GRANT CONNECT ON DATABASE cleverbadge TO cleverbadge_test;" >/dev/null

echo "  ✓ Database users created"
echo ""

# Run E2E tests (matching CI workflow lines 188-196)
echo "🚀 Running E2E tests..."
export VITE_API_URL=http://localhost:$TEST_BACKEND_PORT
export DATABASE_URL=postgresql://cleverbadge_test:testpass@localhost:$TEST_POSTGRES_PORT/cleverbadge
export DATABASE_ADMIN_URL=postgresql://cleverbadge_admin:testpass@localhost:$TEST_POSTGRES_PORT/cleverbadge
export NODE_ENV=testing
export JWT_SECRET=test-secret-key-for-ci-e2e
export PORT=$TEST_BACKEND_PORT

if npm run test:e2e; then
  echo ""
  echo "========================================"
  echo "✅ E2E TESTS PASSED"
  echo "========================================"
  echo "Test results available in frontend/test-results/"
else
  TEST_FAILED=1
  echo ""
  echo "========================================"
  echo "❌ E2E TESTS FAILED"
  echo "========================================"
  echo "Test results available in frontend/test-results/"
fi

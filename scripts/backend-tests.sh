#!/bin/bash
set -e

# Backend Tests - Replicates GitHub Actions CI environment
# This script matches the backend-tests job in .github/workflows/ci.yml
# Manages full PostgreSQL container lifecycle: start → setup → test → cleanup

CONTAINER_NAME="cleverbadge-test-postgres"
TEST_FAILED=0

echo "========================================"
echo "🧪 BACKEND TESTS (CI Environment)"
echo "========================================"
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
if lsof -Pi :5433 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "❌ Error: Port 5433 is already in use"
  echo "Please stop any containers using this port:"
  echo "  docker stop <container-name>"
  exit 1
fi

# Start PostgreSQL container on port 5433 (to avoid conflict with local dev on 5432)
echo "🐳 Starting PostgreSQL container on port 5433..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cleverbadge \
  -p 5433:5432 \
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
echo ""

# Create test database user (matching CI workflow lines 53-59)
echo "🔧 Creating test database user..."
export PGPASSWORD=postgres
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "CREATE USER cleverbadge_admin WITH PASSWORD 'testpass';" >/dev/null
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;" >/dev/null
docker exec "$CONTAINER_NAME" psql -U postgres -d cleverbadge -c "GRANT ALL ON SCHEMA public TO cleverbadge_admin;" >/dev/null
echo "  ✓ Database user created"
echo ""

# Run backend tests (matching CI workflow lines 61-66)
echo "🚀 Running backend tests with coverage..."
export TEST_DATABASE_URL=postgresql://cleverbadge_admin:testpass@localhost:5433/cleverbadge
export DATABASE_URL=$TEST_DATABASE_URL
export NODE_ENV=test
export PORT=3005

if npm run test:coverage; then
  echo ""
  echo "========================================"
  echo "✅ BACKEND TESTS PASSED"
  echo "========================================"
  echo "Coverage report available in backend/coverage/"
else
  TEST_FAILED=1
  echo ""
  echo "========================================"
  echo "❌ BACKEND TESTS FAILED"
  echo "========================================"
fi

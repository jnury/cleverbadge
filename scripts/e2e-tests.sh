#!/bin/bash
set -e

# E2E Tests - Runs full E2E test suite
# Uses start-test.sh and stop-test.sh to manage the test environment
#
# Uses different ports to allow parallel execution with dev environment:
#   PostgreSQL: 5433 (dev uses 5432)
#   Backend:    3001 (dev uses 3000)
#   Frontend:   5174 (dev uses 5173)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST_FAILED=0

# Test environment ports (different from dev)
export TEST_BACKEND_PORT=3001
export TEST_FRONTEND_PORT=5174
export TEST_POSTGRES_PORT=5433

# Run E2E tests
echo ""
echo "🚀 Running E2E tests..."
cd frontend
export VITE_API_URL=http://localhost:$TEST_BACKEND_PORT
export PLAYWRIGHT_REUSE_SERVER=1

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

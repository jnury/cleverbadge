#!/bin/bash
set -e

# Frontend Tests - Replicates GitHub Actions CI environment
# This script matches the frontend-tests job in .github/workflows/ci.yml

echo "========================================"
echo "🎨 FRONTEND TESTS (CI Environment)"
echo "========================================"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm ci
echo ""

# Run frontend unit tests (matching CI workflow lines 96-98)
echo "🚀 Running frontend unit tests with coverage..."
npm run test:coverage

echo ""
echo "========================================"
echo "✅ FRONTEND TESTS COMPLETE"
echo "========================================"
echo "Coverage report available in frontend/coverage/"

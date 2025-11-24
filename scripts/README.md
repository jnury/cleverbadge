# Local Testing Scripts

These scripts replicate the **exact environment** used by GitHub Actions CI. Each script is **fully self-contained** - it starts a PostgreSQL container, runs tests, and cleans up automatically.

## Prerequisites

**Only one requirement**: Install Colima and Docker CLI

```bash
brew install colima docker docker-compose
colima start
```

That's it! The scripts handle everything else.

**Note**: Test scripts use port **5433** for PostgreSQL (not 5432) to avoid conflicts with your local development database.

## Usage

Each script is completely independent and handles its own setup and cleanup:

### 1. Backend Tests

```bash
./scripts/backend-tests.sh
```

**What it does**:
1. Starts PostgreSQL container
2. Creates `cleverbadge_admin` database user
3. Installs backend dependencies
4. Runs backend tests with coverage
5. **Automatically stops and removes the container**

**Output**: Coverage report in `backend/coverage/`

---

### 2. Frontend Tests

```bash
./scripts/frontend-tests.sh
```

**What it does**:
1. Installs frontend dependencies
2. Runs frontend component tests with coverage

**Output**: Coverage report in `frontend/coverage/`

**Note**: No database needed for frontend tests.

---

### 3. E2E Tests

```bash
./scripts/e2e-tests.sh
```

**What it does**:
1. Starts PostgreSQL container
2. Creates `cleverbadge_admin` and `cleverbadge_test` database users
3. Installs backend and frontend dependencies
4. Installs Playwright browsers (chromium)
5. Runs E2E tests with Playwright
6. **Automatically stops and removes the container**

**Output**: Test results in `frontend/test-results/`

---

## Running All Tests (Sequential)

To run all tests in the same order as GitHub Actions:

```bash
./scripts/backend-tests.sh && \
./scripts/frontend-tests.sh && \
./scripts/e2e-tests.sh
```

Each script will:
- Start fresh with a new PostgreSQL container (backend and E2E)
- Run tests
- Clean up after itself
- Stop execution if tests fail

---

## Key Features

### Fully Automated
- No manual container management required
- Scripts start and stop PostgreSQL automatically
- Clean state for every test run

### Exact CI Replication
- Same PostgreSQL version (postgres:14)
- Same database users and permissions
- Same environment variables
- Same test commands

### Safe and Clean
- Checks if port 5432 is already in use
- Uses trap to ensure cleanup even on failures
- Unique container names to avoid conflicts
- Proper exit codes for CI integration

---

## Environment Variables

Scripts automatically set these environment variables to match GitHub Actions:

**Backend Tests:**
- `TEST_DATABASE_URL=postgresql://cleverbadge_admin:testpass@localhost:5433/cleverbadge`
- `NODE_ENV=test`

**E2E Tests:**
- `DATABASE_URL=postgresql://cleverbadge_test:testpass@localhost:5433/cleverbadge`
- `DATABASE_ADMIN_URL=postgresql://cleverbadge_admin:testpass@localhost:5433/cleverbadge`
- `NODE_ENV=testing`
- `JWT_SECRET=test-secret-key-for-ci-e2e`
- `VITE_API_URL=http://localhost:3000`

**Note**: Tests use port **5433** to avoid conflicts with local development database on port 5432.

---

## Troubleshooting

### "Port 5433 already in use"

Test scripts use port 5433 to avoid conflicts with your local development database. If you see this error, stop any containers using port 5433:

```bash
docker ps  # Find the container name
docker stop <container-name>
```

**Your local PostgreSQL on port 5432 can stay running** - it won't interfere with tests.

### "Docker command not found"

Make sure Colima is running:

```bash
colima start
```

### Scripts hang or timeout

Increase Colima resources:

```bash
colima stop
colima start --cpu 4 --memory 8
```

### E2E tests fail with browser errors

Playwright browsers might not be installed:

```bash
cd frontend
npx playwright install --with-deps chromium
```

The E2E script will install them automatically, but you can run this manually if needed.

---

## Comparison with GitHub Actions

These scripts replicate the following CI workflow jobs:

| Script | CI Job | Workflow File |
|--------|--------|---------------|
| `backend-tests.sh` | `backend-tests` | `.github/workflows/ci.yml:19-74` |
| `frontend-tests.sh` | `frontend-tests` | `.github/workflows/ci.yml:76-106` |
| `e2e-tests.sh` | `e2e-tests` | `.github/workflows/ci.yml:108-181` |

**Key difference**: GitHub Actions uses PostgreSQL service containers, while these scripts use `docker run` with Colima. The end result is identical.

---

## How It Works

Each script uses a bash `trap` to ensure cleanup happens even if:
- Tests fail
- You press Ctrl+C
- An error occurs during setup

Example cleanup flow:
```bash
# Script runs
./scripts/backend-tests.sh

# PostgreSQL container starts
# Tests run...
# PASS or FAIL

# Cleanup ALWAYS happens:
# - Container stopped
# - Container removed
# - Proper exit code returned
```

This guarantees a clean state for the next test run.

---

## Advanced Usage

### Run tests in parallel (if you have enough resources)

```bash
# Run backend and frontend tests simultaneously
./scripts/backend-tests.sh & ./scripts/frontend-tests.sh & wait
```

**Note**: Don't run E2E and backend tests in parallel - they both use port 5433.

### Keep container running for debugging

Edit the script and comment out the cleanup trap:

```bash
# trap cleanup EXIT  # Comment this line
```

Then you can inspect the database after tests:

```bash
docker exec -it cleverbadge-test-postgres psql -U postgres -d cleverbadge
```

---

## What Gets Cleaned Up

After each test run:
- ✅ PostgreSQL container stopped and removed
- ✅ No lingering Docker volumes
- ✅ Port 5432 released

**NOT cleaned up** (by design):
- `node_modules/` directories
- Coverage reports (`backend/coverage/`, `frontend/coverage/`)
- Test results (`frontend/test-results/`)
- Playwright browser installations

These are preserved for faster subsequent runs.

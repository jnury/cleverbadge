# Development

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git

## Local Setup

### 1. Create Database and Users

```bash
psql postgres
```

```sql
-- Create database
CREATE DATABASE cleverbadge;

-- Create admin user (migrations only)
CREATE USER cleverbadge_admin WITH PASSWORD 'admin_local_password';

-- Create runtime user (application)
CREATE USER cleverbadge_dev WITH PASSWORD 'dev_local_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;
\c cleverbadge

-- Create schema
CREATE SCHEMA IF NOT EXISTS development;

-- Admin: full access
GRANT ALL PRIVILEGES ON SCHEMA development TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA development TO cleverbadge_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT ALL ON TABLES TO cleverbadge_admin;

-- Runtime: data only
GRANT USAGE ON SCHEMA development TO cleverbadge_dev;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_dev;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT USAGE ON SEQUENCES TO cleverbadge_dev;

\q
```

### 2. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure Environment

**backend/.env:**
```env
DATABASE_URL="postgresql://cleverbadge_dev:dev_local_password@localhost:5432/cleverbadge"
NODE_ENV="development"
PORT=3000
JWT_SECRET="local_dev_secret"
```

**frontend/.env:**
```env
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

### 4. Run Migrations

```bash
cd backend
export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:admin_local_password@localhost:5432/cleverbadge"
npm run migrate
unset DATABASE_ADMIN_URL
```

### 5. Create Admin User

```bash
npm run create-admin
# Default: admin / CleverPassword
```

### 6. Start Servers

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

## Environment Variables

### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Runtime DB connection | `postgresql://cleverbadge_dev:...` |
| `NODE_ENV` | Environment (determines schema) | `development` |
| `JWT_SECRET` | JWT signing secret | 64+ random characters |
| `PORT` | Server port | `3000` |

### Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend URL | `http://localhost:3000` |
| `VITE_ENV` | Environment name | `development` |

## Testing

### Unit Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### E2E Tests

```bash
# Uses ports 5433/3001/5174 to run parallel with dev
./scripts/start-test.sh      # Start test environment
./scripts/e2e-tests.sh       # Run all E2E tests
./scripts/stop-test.sh       # Clean up
```

**Test credentials:** admin / admin123

## Database Migrations

```bash
cd backend
export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:PASSWORD@host:5432/cleverbadge"
npm run migrate
unset DATABASE_ADMIN_URL
```

**Important:** Always use `cleverbadge_admin` for migrations, never runtime users.

## Deployment (Render.com)

### Environment Strategy
- Single PostgreSQL database with separate schemas per environment
- `NODE_ENV` determines schema automatically
- Runtime users have data-only permissions

### Services
1. **Backend**: Node.js web service
2. **Frontend**: Static site
3. **Database**: PostgreSQL (shared, schema-isolated)

### Deploy Steps
1. Push to GitHub
2. Render auto-deploys from branch
3. Run migrations via Render shell (with admin user)
4. Verify health endpoint: `curl https://api.cleverbadge.com/health`

### Health Endpoint

```json
{
  "status": "ok",
  "timestamp": "2025-01-23T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

# Deployment Guide

Complete guide for deploying Clever Badge to Render.com with multi-environment support.

## Overview

Clever Badge uses a multi-environment deployment strategy where:
- **Single PostgreSQL database** hosts all environments using separate schemas
- **Multiple backend services** (one per environment)
- **Multiple frontend services** (one per environment)
- Each environment is isolated via PostgreSQL schemas

## Environment Strategy

### Environments

1. **Development** (`development` schema)
   - For local development only
   - Not deployed to Render
   - Uses local PostgreSQL instance

2. **Testing** (`testing` schema)
   - Automated testing and CI/CD
   - Deployed to Render
   - Domain: `testing-api.cleverbadge.com`, `testing.cleverbadge.com`

3. **Staging** (`staging` schema)
   - Pre-production testing
   - Deployed to Render
   - Domain: `staging-api.cleverbadge.com`, `staging.cleverbadge.com`

4. **Production** (`production` schema)
   - Live application
   - Deployed to Render
   - Domain: `api.cleverbadge.com`, `cleverbadge.com`

### Schema Isolation

Each environment uses its own PostgreSQL schema:

```sql
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS testing;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS production;
```

This allows:
- All environments to share one database instance on Render (cost savings)
- Complete data isolation between environments
- Easy cleanup (drop schema to reset environment)

## Database Setup on Render

### 1. Create PostgreSQL Database

In Render dashboard:
1. Create new PostgreSQL database: `cleverbadge-db`
2. Plan: Free (or paid for production)
3. Note the internal connection string

### 2. Create Database Users

**CRITICAL SECURITY:** Each environment uses a dedicated database user with restricted permissions.

Connect to database via Render shell or local psql **as superuser**:

```bash
# Get connection string from Render dashboard
psql <RENDER_DATABASE_URL>
```

Create admin user and environment users:

```sql
-- 1. Create admin user (for migrations and schema changes ONLY)
CREATE USER cleverbadge_admin WITH PASSWORD 'STRONG_ADMIN_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;

-- 2. Create environment-specific runtime users
CREATE USER cleverbadge_dev WITH PASSWORD 'STRONG_DEV_PASSWORD_HERE';
CREATE USER cleverbadge_test WITH PASSWORD 'STRONG_TEST_PASSWORD_HERE';
CREATE USER cleverbadge_staging WITH PASSWORD 'STRONG_STAGING_PASSWORD_HERE';
CREATE USER cleverbadge_prod WITH PASSWORD 'STRONG_PROD_PASSWORD_HERE';

-- 3. Verify users created
\du
```

### 3. Initialize Schemas and Permissions

**Still connected as superuser**, create schemas and grant permissions:

```sql
-- Create all environment schemas
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS testing;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS production;

-- Grant admin user full access to all schemas
GRANT ALL PRIVILEGES ON SCHEMA development TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON SCHEMA testing TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON SCHEMA staging TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON SCHEMA production TO cleverbadge_admin;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA development TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA testing TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA staging TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA production TO cleverbadge_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT ALL ON TABLES TO cleverbadge_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA testing GRANT ALL ON TABLES TO cleverbadge_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT ALL ON TABLES TO cleverbadge_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA production GRANT ALL ON TABLES TO cleverbadge_admin;

-- Grant environment users USAGE on their schema ONLY
GRANT USAGE ON SCHEMA development TO cleverbadge_dev;
GRANT USAGE ON SCHEMA testing TO cleverbadge_test;
GRANT USAGE ON SCHEMA staging TO cleverbadge_staging;
GRANT USAGE ON SCHEMA production TO cleverbadge_prod;

-- Grant READ/WRITE on tables (no CREATE/DROP/ALTER rights)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA development TO cleverbadge_dev;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA testing TO cleverbadge_test;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA staging TO cleverbadge_staging;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA production TO cleverbadge_prod;

-- Ensure future tables get same permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA testing GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_test;
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_staging;
ALTER DEFAULT PRIVILEGES IN SCHEMA production GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_prod;

-- Grant sequence usage (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA development TO cleverbadge_dev;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA testing TO cleverbadge_test;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA staging TO cleverbadge_staging;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA production TO cleverbadge_prod;

ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT USAGE ON SEQUENCES TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA testing GRANT USAGE ON SEQUENCES TO cleverbadge_test;
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT USAGE ON SEQUENCES TO cleverbadge_staging;
ALTER DEFAULT PRIVILEGES IN SCHEMA production GRANT USAGE ON SEQUENCES TO cleverbadge_prod;

-- Verify schemas exist
\dn
```

**Important Notes:**
- **Admin user** (`cleverbadge_admin`): Full access, used ONLY for migrations
- **Runtime users** (`cleverbadge_*`): Data operations only, NO schema modifications
- Runtime users CANNOT create/drop/alter tables - this prevents accidental schema changes
- Each runtime user can ONLY access its designated schema

## Backend Deployment

### Environment Variables

For each backend service, set these environment variables in Render dashboard:

**CRITICAL - Runtime Database Connection:**
- `DATABASE_URL`: **Environment-specific user** connection string (NOT the admin user!)
  - Production: `postgresql://cleverbadge_prod:PASSWORD@host:5432/cleverbadge`
  - Staging: `postgresql://cleverbadge_staging:PASSWORD@host:5432/cleverbadge`
  - Testing: `postgresql://cleverbadge_test:PASSWORD@host:5432/cleverbadge`
  - Development: `postgresql://cleverbadge_dev:PASSWORD@host:5432/cleverbadge`

**Migrations Only (NOT in runtime env vars):**
- `DATABASE_ADMIN_URL`: Admin user connection string for `npm run db:push`
  - Format: `postgresql://cleverbadge_admin:ADMIN_PASSWORD@host:5432/cleverbadge`
  - **NEVER set this as runtime environment variable**
  - Use ONLY when running migrations manually via Render shell

**Common to all environments:**
- `JWT_SECRET`: Generate a secure random string (same for all envs or unique per env)
- `PORT`: `3000` (default)

**Environment-specific:**
- `NODE_ENV`: `testing`, `staging`, or `production` (also determines database schema automatically)

### Example: Production Backend

```yaml
# In render.yaml
- type: web
  name: cleverbadge-backend-production
  branch: main
  runtime: node
  plan: free
  rootDir: backend
  buildCommand: npm install
  startCommand: node index.js
  domains:
    - api.cleverbadge.com
  envVars:
    - key: DATABASE_URL
      sync: false  # Set manually with cleverbadge_prod user!
    - key: NODE_ENV
      value: production
    - key: JWT_SECRET
      sync: false  # Set manually in dashboard
```

**IMPORTANT:**
- Do NOT use `fromDatabase` for `DATABASE_URL` as it uses the superuser
- Manually set connection string with environment-specific user
- `NODE_ENV` automatically determines database schema (production → production schema)

### Deployment Steps

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Deploy production"
   git push origin main
   ```

2. **Create web service in Render**
   - Connect GitHub repository
   - Use settings from render.yaml
   - Or manually configure

3. **Set environment variables in Render dashboard**
   - `DATABASE_URL`: `postgresql://cleverbadge_prod:PASSWORD@host:5432/cleverbadge`
     - **CRITICAL:** Use `cleverbadge_prod` user, NOT admin or superuser
   - `NODE_ENV`: `production` (this also sets database schema to "production")
   - `JWT_SECRET`: Generate secure random string

4. **Deploy**
   - Render auto-deploys on push to branch
   - Or manual deploy from dashboard
   - Application runs with `cleverbadge_prod` user (data access only)

5. **Run migrations (MANUAL, ONE-TIME)**
   ```bash
   # Connect to Render shell
   # Set admin database URL and environment temporarily
   export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:ADMIN_PASSWORD@host:5432/cleverbadge"
   export NODE_ENV="production"

   # Run migrations
   npm run db:push

   # Verify schema created
   psql $DATABASE_ADMIN_URL -c "\dt production.*"
   ```

   **IMPORTANT:**
   - Use `cleverbadge_admin` user for migrations ONLY
   - Set `NODE_ENV` to match target environment (determines schema)
   - Run migrations from Render shell or local machine
   - DO NOT add `DATABASE_ADMIN_URL` to service environment variables

6. **Create admin application user**
   ```bash
   # Via Render shell, using runtime user
   npm run create-admin
   ```

## Frontend Deployment

### Environment Variables

For each frontend service, set in Render dashboard:

- `VITE_API_URL`: Backend URL for this environment
- `VITE_ENV`: `testing`, `staging`, or `production`

### Example: Production Frontend

```yaml
# In render.yaml
- type: web
  name: cleverbadge-frontend-production
  branch: main
  runtime: static
  rootDir: frontend
  buildCommand: npm ci && npm run build
  staticPublishPath: ./dist
  domains:
    - cleverbadge.com
    - www.cleverbadge.com
  envVars:
    - key: VITE_API_URL
      value: https://api.cleverbadge.com
    - key: VITE_ENV
      value: production
  routes:
    - type: rewrite
      source: /*
      destination: /index.html
  headers:
    - path: /*
      name: X-Frame-Options
      value: DENY
    - path: /*
      name: X-Content-Type-Options
      value: nosniff
```

### Deployment Steps

1. **Push code to GitHub** (same as backend)

2. **Create static site in Render**
   - Connect GitHub repository
   - Use settings from render.yaml

3. **Set environment variables**
   - `VITE_API_URL`: Point to correct backend
   - `VITE_ENV`: Set environment name

4. **Deploy**
   - Auto-deploys on push
   - Build injects version from package.json

## Multi-Environment render.yaml

Here's how to configure multiple environments:

```yaml
services:
  # Production Backend
  - type: web
    name: cleverbadge-backend-production
    branch: main
    runtime: node
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: node index.js
    domains:
      - api.cleverbadge.com
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: cleverbadge-db
          property: connectionString
      - key: DB_SCHEMA
        value: production
      - key: NODE_ENV
        value: production

  # Staging Backend
  - type: web
    name: cleverbadge-backend-staging
    branch: staging
    runtime: node
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: node index.js
    domains:
      - staging-api.cleverbadge.com
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: cleverbadge-db
          property: connectionString
      - key: DB_SCHEMA
        value: staging
      - key: NODE_ENV
        value: staging

  # Testing Backend
  - type: web
    name: cleverbadge-backend-testing
    branch: develop
    runtime: node
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: node index.js
    domains:
      - testing-api.cleverbadge.com
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: cleverbadge-db
          property: connectionString
      - key: DB_SCHEMA
        value: testing
      - key: NODE_ENV
        value: testing

  # Production Frontend
  - type: web
    name: cleverbadge-frontend-production
    branch: main
    runtime: static
    rootDir: frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    domains:
      - cleverbadge.com
      - www.cleverbadge.com
    envVars:
      - key: VITE_API_URL
        value: https://api.cleverbadge.com
      - key: VITE_ENV
        value: production

  # Staging Frontend
  - type: web
    name: cleverbadge-frontend-staging
    branch: staging
    runtime: static
    rootDir: frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    domains:
      - staging.cleverbadge.com
    envVars:
      - key: VITE_API_URL
        value: https://staging-api.cleverbadge.com
      - key: VITE_ENV
        value: staging

  # Testing Frontend
  - type: web
    name: cleverbadge-frontend-testing
    branch: develop
    runtime: static
    rootDir: frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    domains:
      - testing.cleverbadge.com
    envVars:
      - key: VITE_API_URL
        value: https://testing-api.cleverbadge.com
      - key: VITE_ENV
        value: testing

# Shared Database
databases:
  - name: cleverbadge-db
    databaseName: cleverbadge
    user: cleverbadge
    plan: free
```

## Git Branching Strategy

To support multiple environments:

- **`main` branch**: Production deployments
- **`staging` branch**: Staging deployments
- **`develop` branch**: Testing deployments
- **Feature branches**: Merge to develop → staging → main

Workflow:
1. Develop feature on feature branch
2. Merge to `develop` → auto-deploy to testing environment
3. Test in testing environment
4. Merge to `staging` → auto-deploy to staging environment
5. Final QA in staging
6. Merge to `main` → auto-deploy to production

## Version Management

### Backend Version

Version is in `backend/package.json`:
```json
{
  "version": "1.2.3"
}
```

- Exposed via `/health` endpoint
- Increment on each deployment:
  - Major feature: increment minor (1.2.3 → 1.3.0)
  - Bug fix: increment patch (1.2.3 → 1.2.4)

### Frontend Version

Version is in `frontend/package.json`:
```json
{
  "version": "1.2.3"
}
```

- Injected at build time via vite.config.js
- Displayed in footer
- Same increment rules as backend

## Health Checks

Each backend exposes `/health`:

```bash
curl https://api.cleverbadge.com/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-23T12:00:00.000Z",
  "version": "1.2.3",
  "environment": "production"
}
```

Frontend footer fetches this to display backend version.

## Monitoring

### What to Monitor

1. **Health endpoint** - Check `/health` returns 200
2. **Frontend loads** - Check homepage loads
3. **Database connections** - Monitor connection pool
4. **Error rates** - Track 4xx and 5xx responses

### Render Built-in Monitoring

- View logs in Render dashboard
- Set up alerts for service failures
- Monitor resource usage (CPU, memory)

## Rollback Strategy

If deployment fails:

1. **Via Render Dashboard:**
   - Go to service deployments
   - Click "Redeploy" on previous successful deployment

2. **Via Git:**
   ```bash
   git revert <bad-commit>
   git push
   ```

3. **Database Schema:**
   - Schemas are isolated, rollback doesn't affect data
   - If schema migration fails, fix locally then re-push

## Database Backups

### Automatic Backups (Render)

- Free tier: Daily backups, 7-day retention
- Paid tier: Point-in-time recovery

### Manual Backup

```bash
# Backup specific schema
pg_dump -h <host> -U <user> -d <database> -n production > production_backup.sql

# Restore
psql -h <host> -U <user> -d <database> < production_backup.sql
```

## Security Checklist

- [ ] `JWT_SECRET` is unique and secure (64+ random characters)
- [ ] Database credentials not in code (use Render env vars)
- [ ] CORS configured for correct domains
- [ ] HTTPS enforced on all domains
- [ ] Security headers set (X-Frame-Options, etc.)
- [ ] Database backups enabled
- [ ] Different JWT_SECRET per environment (optional but recommended)

## Cost Optimization

Using schema isolation saves money:
- **1 database** instead of 3+ (testing, staging, production)
- Free tier sufficient for MVP
- Upgrade to paid tier only for production when needed

Current setup (free tier):
- 1 PostgreSQL instance: Free
- 3 backend web services: Free
- 3 frontend static sites: Free
- **Total: $0/month**

## Troubleshooting

### Backend won't start
- Check `DATABASE_URL` is set
- Check `DB_SCHEMA` matches existing schema
- Check `JWT_SECRET` is set
- View logs in Render dashboard

### Frontend shows wrong environment
- Check `VITE_ENV` is set correctly
- Rebuild frontend to pick up new env vars
- Clear browser cache

### Database connection errors
- Verify schema exists: `\dn` in psql
- Check `DB_SCHEMA` matches schema name
- Verify `search_path` is set in connection

### Migrations fail
- Ensure schema exists first
- Run `CREATE SCHEMA IF NOT EXISTS <schema_name>`
- Then run `npm run db:push`

## First Deployment Checklist

- [ ] Create database on Render
- [ ] Create all schemas (testing, staging, production)
- [ ] Deploy backend services (set env vars!)
- [ ] Run migrations on each backend
- [ ] Create admin users for each environment
- [ ] Deploy frontend services (set env vars!)
- [ ] Test health endpoints
- [ ] Test frontend loads with correct environment banner
- [ ] Verify footer shows correct versions
- [ ] Test admin login on each environment
- [ ] Import sample questions
- [ ] Create test and verify candidate flow

## Maintenance

### Adding a New Environment

1. Create new schema in database
2. Add new services to render.yaml
3. Create new Git branch if needed
4. Set environment variables
5. Deploy
6. Run migrations
7. Create admin user

### Removing an Environment

1. Delete Render services
2. Drop schema: `DROP SCHEMA <name> CASCADE;`
3. Remove from render.yaml
4. Delete Git branch if no longer needed

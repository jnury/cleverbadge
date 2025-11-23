# Database Security Architecture

## Overview

Clever Badge implements a secure multi-environment database architecture using PostgreSQL schema isolation and role-based access control. This prevents accidental schema modifications in production and ensures complete data isolation between environments.

## Security Principles

1. **Principle of Least Privilege**: Runtime applications have only the permissions they need (data access, no schema changes)
2. **User Separation**: Each environment has its own database user
3. **Schema Isolation**: Each environment uses a separate PostgreSQL schema
4. **Admin Separation**: Admin user used only for migrations, never for runtime

## Database Users

### Admin User: `cleverbadge_admin`

**Purpose:** Schema migrations and structural changes ONLY

**Permissions:**
- Full access to all schemas (development, staging, production)
- Can CREATE, ALTER, DROP tables
- Can GRANT permissions
- Can modify schema structure

**When to Use:**
- Running `npm run db:push` (Drizzle migrations)
- Creating new tables
- Altering table structure
- Adding indexes or constraints

**CRITICAL:** NEVER use this user for runtime application

**Connection String:**
```
postgresql://cleverbadge_admin:ADMIN_PASSWORD@host:5432/cleverbadge
```

### Runtime Users

Each environment has a dedicated runtime user with restricted permissions.

#### Development: `cleverbadge_dev`
- Schema: `development`
- Permissions: SELECT, INSERT, UPDATE, DELETE on tables
- No schema modification rights

#### Staging: `cleverbadge_staging`
- Schema: `staging`
- Permissions: SELECT, INSERT, UPDATE, DELETE on tables
- No schema modification rights

#### Production: `cleverbadge_prod`
- Schema: `production`
- Permissions: SELECT, INSERT, UPDATE, DELETE on tables
- No schema modification rights

**When to Use:**
- Application runtime (Express server)
- Normal API operations (CRUD)
- Queries and data manipulation

**CRITICAL:** These users cannot modify schema structure

**Connection Strings:**
```
Development: postgresql://cleverbadge_dev:DEV_PASSWORD@localhost:5432/cleverbadge
Staging:     postgresql://cleverbadge_staging:STAGING_PASSWORD@host:5432/cleverbadge
Production:  postgresql://cleverbadge_prod:PROD_PASSWORD@host:5432/cleverbadge
```

## Permission Matrix

| Operation | Runtime User | Admin User |
|-----------|-------------|------------|
| SELECT    | ✅ Yes      | ✅ Yes     |
| INSERT    | ✅ Yes      | ✅ Yes     |
| UPDATE    | ✅ Yes      | ✅ Yes     |
| DELETE    | ✅ Yes      | ✅ Yes     |
| CREATE TABLE | ❌ No    | ✅ Yes     |
| ALTER TABLE | ❌ No     | ✅ Yes     |
| DROP TABLE | ❌ No      | ✅ Yes     |
| CREATE INDEX | ❌ No    | ✅ Yes     |
| GRANT | ❌ No          | ✅ Yes     |
| Access other schemas | ❌ No | ✅ Yes |

## Environment Configuration

### Runtime (Application Servers)

**Environment Variables:**
```env
# Use runtime user (NOT admin!)
DATABASE_URL=postgresql://cleverbadge_prod:PASSWORD@host:5432/cleverbadge
DB_SCHEMA=production
NODE_ENV=production
```

**What happens:**
- Application connects with `cleverbadge_prod` user
- Can read/write data in `production` schema only
- Cannot modify table structure
- Cannot access other schemas

### Migrations (Manual, One-Time)

**Temporary Environment Variables:**
```bash
# Set temporarily in shell
export DATABASE_ADMIN_URL=postgresql://cleverbadge_admin:ADMIN_PASSWORD@host:5432/cleverbadge
export DB_SCHEMA=production

# Run migrations
npm run db:push

# Unset immediately after
unset DATABASE_ADMIN_URL
```

**What happens:**
- Drizzle connects with `cleverbadge_admin` user
- Creates/modifies tables in `production` schema
- Updates schema structure
- Exits

## Safety Mechanisms

### 1. Preventing Accidental Schema Changes

Runtime users **physically cannot** modify schema:

```sql
-- Runtime user tries to create table
CREATE TABLE new_table (id INT);
-- ERROR: permission denied for schema production
```

This prevents bugs in code from accidentally dropping or altering tables.

### 2. Schema Isolation

Each environment can only access its own schema:

```sql
-- Production user tries to access staging data
SELECT * FROM staging.tests;
-- ERROR: permission denied for schema staging
```

This ensures complete data isolation between environments.

### 3. Admin User Not in Runtime

Admin credentials are **never** stored in application environment variables:

- ✅ `DATABASE_URL` = runtime user (set in Render dashboard)
- ❌ `DATABASE_ADMIN_URL` = not set in runtime (only used manually)

## Setup Checklist

### Initial Setup (One-Time)

- [ ] Create PostgreSQL database on Render
- [ ] Create admin user (`cleverbadge_admin`)
- [ ] Create all runtime users (dev, staging, prod)
- [ ] Create all schemas (development, staging, production)
- [ ] Grant admin user full access to all schemas
- [ ] Grant each runtime user limited access to its schema only

### Per-Environment Deployment

- [ ] Set `DATABASE_URL` with **runtime user** in Render dashboard
- [ ] Verify `DATABASE_URL` does NOT use admin user
- [ ] Set `NODE_ENV` to match environment (determines schema automatically)
- [ ] Deploy application
- [ ] Run migrations manually with admin user via Render shell
- [ ] Verify application can read/write data
- [ ] Verify application cannot alter schema

## Common Mistakes to Avoid

### ❌ WRONG: Using Admin User in Runtime

```yaml
# render.yaml - WRONG!
envVars:
  - key: DATABASE_URL
    value: postgresql://cleverbadge_admin:PASSWORD@host:5432/cleverbadge
```

**Why wrong:** Application has too much privilege, could accidentally modify schema.

### ✅ CORRECT: Using Runtime User

```yaml
# render.yaml - CORRECT
envVars:
  - key: DATABASE_URL
    value: postgresql://cleverbadge_prod:PASSWORD@host:5432/cleverbadge
```

### ❌ WRONG: Runtime User for Migrations

```bash
# WRONG - runtime user can't create tables
export DATABASE_URL=postgresql://cleverbadge_prod:PASSWORD@host:5432/cleverbadge
npm run db:push
# ERROR: permission denied
```

### ✅ CORRECT: Admin User for Migrations

```bash
# CORRECT - admin user can create tables
export DATABASE_ADMIN_URL=postgresql://cleverbadge_admin:PASSWORD@host:5432/cleverbadge
npm run db:push
# SUCCESS
```

## Verification

### Test Runtime User Permissions

```bash
# Connect as runtime user
psql "postgresql://cleverbadge_prod:PASSWORD@host:5432/cleverbadge"

# Switch to schema
SET search_path TO production;

# These should work
SELECT * FROM users LIMIT 1;
INSERT INTO users (username, password_hash) VALUES ('test', 'hash');

# These should FAIL
CREATE TABLE test (id INT);  -- ERROR: permission denied
ALTER TABLE users ADD COLUMN test TEXT;  -- ERROR: permission denied
DROP TABLE users;  -- ERROR: permission denied
```

### Test Schema Isolation

```bash
# Connect as production user
psql "postgresql://cleverbadge_prod:PASSWORD@host:5432/cleverbadge"

# Try to access staging schema
SELECT * FROM staging.users;  -- ERROR: permission denied
```

## Password Management

**Best Practices:**
- Generate strong passwords (32+ characters, random)
- Store in Render dashboard environment variables (encrypted)
- Never commit passwords to git
- Use different passwords for each environment
- Rotate passwords periodically

**Generating Secure Passwords:**
```bash
# Generate random password
openssl rand -base64 32
```

## Disaster Recovery

### If Runtime User Compromised

1. Revoke permissions immediately:
   ```sql
   REVOKE ALL ON SCHEMA production FROM cleverbadge_prod;
   ```

2. Create new user with different password:
   ```sql
   CREATE USER cleverbadge_prod_new WITH PASSWORD 'new_password';
   -- Grant same permissions
   ```

3. Update `DATABASE_URL` in Render dashboard

4. Redeploy application

5. Delete old user:
   ```sql
   DROP USER cleverbadge_prod;
   ```

### If Admin User Compromised

1. Create new admin user:
   ```sql
   CREATE USER cleverbadge_admin_new WITH PASSWORD 'new_password';
   -- Grant all permissions
   ```

2. Update local `.env` files and secure storage

3. Delete old admin user:
   ```sql
   DROP USER cleverbadge_admin;
   ```

## Migration Workflow

### Safe Migration Process

1. **Develop migration locally:**
   ```bash
   # Use admin user
   export DATABASE_ADMIN_URL=postgresql://cleverbadge_admin:PASSWORD@localhost:5432/cleverbadge
   export NODE_ENV=development
   npm run db:push
   ```

2. **Test with runtime user:**
   ```bash
   # Use runtime user
   export DATABASE_URL=postgresql://cleverbadge_dev:PASSWORD@localhost:5432/cleverbadge
   npm run dev
   # Verify application works
   ```

3. **Deploy to staging:**
   ```bash
   # In Render shell for staging service
   export DATABASE_ADMIN_URL=postgresql://cleverbadge_admin:PASSWORD@host:5432/cleverbadge
   export NODE_ENV=staging
   npm run db:push
   ```

4. **Test staging application**

5. **Deploy to production:**
   ```bash
   # In Render shell for production service
   export DATABASE_ADMIN_URL=postgresql://cleverbadge_admin:PASSWORD@host:5432/cleverbadge
   export NODE_ENV=production
   npm run db:push
   ```

6. **Verify production application works**

## Summary

**Key Principles:**
- ✅ Runtime = restricted user
- ✅ Migrations = admin user
- ✅ Each environment = separate user + schema
- ✅ Never mix admin and runtime credentials
- ✅ Test permissions after setup

**Remember:**
> The runtime application should NEVER have the ability to modify its own database structure. This prevents entire classes of bugs and security issues.

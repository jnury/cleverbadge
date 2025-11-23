# Local Development Setup Guide

Complete step-by-step guide to set up Clever Badge for local development.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Git

## Step 1: Create PostgreSQL Database and Users

Open your terminal and run these commands:

```bash
# Connect to PostgreSQL as superuser
psql postgres
```

Once connected to PostgreSQL, run these SQL commands one by one:

```sql
-- 1. Create the database
CREATE DATABASE cleverbadge;

-- 2. Create admin user (for migrations only)
CREATE USER cleverbadge_admin WITH PASSWORD 'admin_local_password_change_me';

-- 3. Create development runtime user (for application)
CREATE USER cleverbadge_dev WITH PASSWORD 'dev_local_password_change_me';

-- 4. Grant admin user full database privileges
GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;

-- 5. Connect to the cleverbadge database
\c cleverbadge

-- 6. Create development schema
CREATE SCHEMA IF NOT EXISTS development;

-- 7. Grant admin user full access to development schema
GRANT ALL PRIVILEGES ON SCHEMA development TO cleverbadge_admin;

-- 8. Grant admin user full access to all current and future tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA development TO cleverbadge_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT ALL ON TABLES TO cleverbadge_admin;

-- 9. Grant runtime user USAGE on schema (can access the schema)
GRANT USAGE ON SCHEMA development TO cleverbadge_dev;

-- 10. Grant runtime user data access ONLY (no schema modification)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_dev;

-- 11. Grant sequence usage for auto-incrementing IDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT USAGE ON SEQUENCES TO cleverbadge_dev;

-- 12. Verify users were created
\du

-- You should see:
--  cleverbadge_admin | superuser privileges on database
--  cleverbadge_dev   | limited privileges

-- 13. Verify schema was created
\dn

-- You should see:
--  development

-- 14. Exit PostgreSQL
\q
```

## Step 2: Clone Repository and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd CleverBadge

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

## Step 3: Configure Backend Environment

Create the backend `.env` file:

```bash
cd backend
cp .env.example .env
```

Now edit `backend/.env` with your favorite editor:

```env
# Runtime database connection (use cleverbadge_dev user)
DATABASE_URL="postgresql://cleverbadge_dev:dev_local_password_change_me@localhost:5432/cleverbadge"

# Environment (also determines database schema automatically)
NODE_ENV="development"

# Server configuration
PORT=3000
JWT_SECRET="local_dev_secret_change_this_in_production"

# MIGRATIONS ONLY - Uncomment when running npm run db:push
# DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:admin_local_password_change_me@localhost:5432/cleverbadge"
```

**Important Notes:**
- Replace `dev_local_password_change_me` with the password you set for `cleverbadge_dev`
- Replace `admin_local_password_change_me` with the password you set for `cleverbadge_admin`
- Keep `DATABASE_ADMIN_URL` commented out (only uncomment when running migrations)
- `NODE_ENV` automatically determines the database schema (development → development schema)

## Step 4: Configure Frontend Environment

Create the frontend `.env` file:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

## Step 5: Run Database Migrations

Now we'll create the database tables using the admin user:

```bash
cd backend

# Temporarily uncomment DATABASE_ADMIN_URL in your .env file
# Or set it in your terminal:
export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:admin_local_password_change_me@localhost:5432/cleverbadge"
export NODE_ENV="development"

# Run migrations
npm run db:push

# If successful, you should see:
# "🗄️  Using schema: development (from NODE_ENV=development)"
# "Schema pushed successfully"

# Unset the admin URL
unset DATABASE_ADMIN_URL
```

**Verify tables were created:**

```bash
psql "postgresql://cleverbadge_admin:admin_local_password_change_me@localhost:5432/cleverbadge"
```

```sql
-- Switch to development schema
SET search_path TO development;

-- List all tables
\dt

-- You should see:
--  users
--  questions
--  tests
--  test_questions
--  assessments
--  assessment_answers

-- Exit
\q
```

## Step 6: Create Admin Application User

Create an admin user to access the admin dashboard:

```bash
cd backend
npm run create-admin

# Follow the prompts:
# Enter admin username: admin
# Enter admin password: <your-secure-password>

# You should see:
# Admin user created successfully!
```

## Step 7: Start Development Servers

Open two terminal windows/tabs:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev

# You should see:
# Server running on port 3000 (v0.1.0, development)
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev

# You should see:
# ➜ Local: http://localhost:5173/
```

## Step 8: Verify Setup

### Test Backend Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-23T12:00:00.000Z",
  "version": "0.1.0",
  "environment": "development"
}
```

### Test Frontend

1. Open browser to `http://localhost:5173`
2. You should see:
   - Yellow banner at top saying "Environment: DEVELOPMENT"
   - Clever Badge homepage
   - Footer with "Frontend: v0.1.0 - Backend: v0.1.0"

### Test Admin Login

1. Navigate to `http://localhost:5173/admin/login`
2. Login with credentials you created in Step 6
3. You should be redirected to admin dashboard

## Troubleshooting

### "Database does not exist"
```bash
# Make sure you created the database
psql postgres -c "CREATE DATABASE cleverbadge;"
```

### "Role does not exist"
```bash
# Make sure you created the users
psql postgres -c "CREATE USER cleverbadge_admin WITH PASSWORD 'password';"
psql postgres -c "CREATE USER cleverbadge_dev WITH PASSWORD 'password';"
```

### "Permission denied for schema development"
```bash
# Re-run the permission grants from Step 1
psql cleverbadge
# Run grants 7-11 from Step 1
```

### "Cannot connect to database"
```bash
# Verify PostgreSQL is running
pg_isready

# Check connection string in .env matches your setup
# Format: postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

### Migration fails with permission error
```bash
# Make sure you're using DATABASE_ADMIN_URL for migrations
export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:PASSWORD@localhost:5432/cleverbadge"
npm run db:push
```

### Backend starts but cannot query database
```bash
# Verify DATABASE_URL uses cleverbadge_dev user (not admin)
# Check .env file
grep DATABASE_URL backend/.env
```

## Quick Reference

### Database Connection Strings

**Runtime (Application):**
```
postgresql://cleverbadge_dev:PASSWORD@localhost:5432/cleverbadge
```

**Migrations (Admin):**
```
postgresql://cleverbadge_admin:PASSWORD@localhost:5432/cleverbadge
```

### Start Development

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### Run Migrations

```bash
cd backend
export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:PASSWORD@localhost:5432/cleverbadge"
npm run db:push
unset DATABASE_ADMIN_URL
```

### Import Sample Questions

```bash
curl -X POST http://localhost:3000/api/questions/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@examples/questions.yaml"
```

## Next Steps

After successful setup:

1. **Import sample questions:**
   - Use examples/questions.yaml as reference
   - Import via admin dashboard or API

2. **Create a test:**
   - Login to admin dashboard
   - Create new test with title and slug
   - Add questions to test
   - Enable the test

3. **Take a test as candidate:**
   - Visit `http://localhost:5173/t/YOUR-TEST-SLUG`
   - Enter candidate name
   - Complete the test
   - View results

4. **View analytics:**
   - Login to admin dashboard
   - View test results
   - Check question success rates

## Clean Slate (Reset Database)

If you need to start fresh:

```bash
# Connect to PostgreSQL
psql postgres

# Drop and recreate database
DROP DATABASE cleverbadge;
CREATE DATABASE cleverbadge;

# Exit and repeat Step 1
\q
```

Or just drop the schema:

```bash
psql cleverbadge
DROP SCHEMA development CASCADE;
# Then re-run schema creation from Step 1
```

## Security Notes for Local Development

- Local passwords are different from production
- Don't commit `.env` files to git (they're in .gitignore)
- Use strong passwords even for local development
- Admin user should have a different password than dev user

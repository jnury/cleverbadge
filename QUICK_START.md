# Quick Start - Copy/Paste Commands

Complete setup for local development. Just copy and paste these command blocks.

## 1. Create Database and Users

```bash
psql postgres << 'EOF'
-- Create database
CREATE DATABASE cleverbadge;

-- Create users
CREATE USER cleverbadge_admin WITH PASSWORD 'admin_local_pass_123';
CREATE USER cleverbadge_dev WITH PASSWORD 'dev_local_pass_123';

-- Grant admin database privileges
GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;

-- Connect to database
\c cleverbadge

-- Create schema
CREATE SCHEMA IF NOT EXISTS development;

-- Grant admin full access
GRANT ALL PRIVILEGES ON SCHEMA development TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA development TO cleverbadge_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT ALL ON TABLES TO cleverbadge_admin;

-- Grant dev user limited access (data only)
GRANT USAGE ON SCHEMA development TO cleverbadge_dev;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_dev;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT USAGE ON SEQUENCES TO cleverbadge_dev;

-- Verify
\du
\dn
EOF
```

## 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

cd ..
```

## 3. Create Backend .env

```bash
cd backend
cat > .env << 'EOF'
DATABASE_URL="postgresql://cleverbadge_dev:dev_local_pass_123@localhost:5432/cleverbadge"
NODE_ENV="development"
PORT=3000
JWT_SECRET="local_dev_jwt_secret_change_in_production"
EOF
```

## 4. Create Frontend .env

```bash
cd ../frontend
cat > .env << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_ENV=development
EOF

cd ..
```

## 5. Run Migrations

```bash
cd backend
DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:admin_local_pass_123@localhost:5432/cleverbadge" \
NODE_ENV="development" \
npm run db:push
```

## 6. Create Admin User

```bash
npm run create-admin
# Enter username: admin
# Enter password: admin123 (or your preferred password)
```

## 7. Start Development Servers

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 8. Verify Setup

```bash
# Test backend health
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"...","version":"0.1.0","environment":"development"}
```

Open browser: `http://localhost:5173`

✅ You should see:
- Yellow "DEVELOPMENT" banner at top
- Clever Badge homepage
- Footer with version numbers

## Done! 🎉

**Next steps:**
- Login to admin: `http://localhost:5173/admin/login`
- Import questions from `examples/questions.yaml`
- Create your first test

---

## Quick Commands Reference

### Start Dev Servers
```bash
# Backend
cd backend && npm run dev

# Frontend (in another terminal)
cd frontend && npm run dev
```

### Run Migrations (when schema changes)
```bash
cd backend
DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:admin_local_pass_123@localhost:5432/cleverbadge" \
NODE_ENV="development" \
npm run db:push
```

### Reset Database (start fresh)
```bash
psql postgres -c "DROP DATABASE cleverbadge;"
psql postgres -c "CREATE DATABASE cleverbadge;"
# Then re-run steps 1 and 5
```

### View Database Tables
```bash
psql "postgresql://cleverbadge_dev:dev_local_pass_123@localhost:5432/cleverbadge" \
  -c "SET search_path TO development;" \
  -c "\dt"
```

---

**Note:** These commands use simple passwords for local development. Change them if needed, and NEVER use these in production!

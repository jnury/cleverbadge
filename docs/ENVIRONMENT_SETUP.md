# Environment Setup Summary

Quick reference for environment-aware architecture setup.

## Environment Variables

### Backend

```env
# RUNTIME (use environment-specific user with limited permissions)
DATABASE_URL="postgresql://cleverbadge_dev:pass@host:5432/db"
NODE_ENV="development"               # development|staging|production (determines schema)
JWT_SECRET="your-secret-here"
PORT=3000

# MIGRATIONS ONLY (use admin user, never in runtime!)
# DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:admin_pass@host:5432/db"
```

**CRITICAL:**
- `DATABASE_URL` must use runtime user (cleverbadge_dev, cleverbadge_staging, cleverbadge_prod)
- Runtime users have READ/WRITE permissions only (no schema changes)
- `NODE_ENV` automatically determines database schema (development → development schema, etc.)
- **No separate DB_SCHEMA variable** - ensures you never mix environment and schema
- `DATABASE_ADMIN_URL` only for migrations, never in production environment variables
- See [Database Security](DATABASE_SECURITY.md) for complete details

### Frontend

```env
VITE_API_URL=http://localhost:3000   # Backend URL
VITE_ENV=development                 # development|staging|production
```

## PostgreSQL Schema Isolation

All environments share one database but use separate schemas:

```sql
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS production;
```

## Visual Elements

### Environment Banner (Frontend)

- **Location**: Top of every page
- **Visibility**: Hidden in production only
- **Colors**:
  - Development: Yellow banner
  - Staging: Purple banner
  - Production: No banner

### Footer (Frontend)

- **Location**: Bottom of every page
- **Content**: `Copyright Clever Badge 2025 - Frontend: v.x.x.x - Backend: v.x.x.x`
- **Backend version**: Fetched dynamically from `/health` endpoint
- **Frontend version**: Injected at build time from package.json

## Health Endpoint (Backend)

```javascript
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2025-01-23T12:00:00.000Z",
  "version": "1.2.3",
  "environment": "production"
}
```

## Version Management

### When to Increment Versions

**In package.json (both backend and frontend):**
- **Minor version** (0.1.0 → 0.2.0): New feature implemented
- **Patch version** (0.1.0 → 0.1.1): Bug fix or small change

**Example:**
- Implement question import feature → 0.1.0 → 0.2.0
- Fix typo in error message → 0.1.0 → 0.1.1

### How to Update

**Backend:**
```bash
cd backend
# Edit package.json version field
# Version automatically exposed via /health endpoint
```

**Frontend:**
```bash
cd frontend
# Edit package.json version field
# Version automatically injected at build time
npm run build
```

## Quick Setup for New Environment

1. **Create schema in database:**
   ```sql
   CREATE SCHEMA IF NOT EXISTS <env_name>;
   ```

2. **Set backend env vars:**
   ```env
   DB_SCHEMA=<env_name>
   NODE_ENV=<env_name>
   DATABASE_URL=<postgres_url>
   JWT_SECRET=<secret>
   ```

3. **Set frontend env vars:**
   ```env
   VITE_API_URL=<backend_url>
   VITE_ENV=<env_name>
   ```

4. **Deploy and verify:**
   - Backend: `curl <backend_url>/health` shows correct environment
   - Frontend: Environment banner shows correct environment (if not production)
   - Footer: Shows both versions correctly

## Files Modified for Environment Support

### Documentation
- `CLAUDE.md` - Added environment variables and implementation notes
- `docs/IMPLEMENTATION.md` - Added code examples for all components
- `docs/DEPLOYMENT.md` - Complete multi-environment deployment guide

### Backend (to be implemented)
- `backend/.env.example` - Added `DB_SCHEMA` variable
- `backend/index.js` - Health endpoint returns version and environment
- `backend/db/index.js` - Schema-aware database connection
- `backend/drizzle.config.js` - Schema filter configuration
- `backend/package.json` - Version field

### Frontend (to be implemented)
- `frontend/.env.example` - Added `VITE_ENV` variable
- `frontend/vite.config.js` - Version injection from package.json
- `frontend/src/components/EnvironmentBanner.jsx` - New component
- `frontend/src/components/Footer.jsx` - New component
- `frontend/src/App.jsx` - Layout with banner and footer
- `frontend/package.json` - Version field

## Testing Environment Setup

### Development (Local)
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env: DB_SCHEMA=development, NODE_ENV=development
npm run dev

# Frontend
cd frontend
cp .env.example .env
# Edit .env: VITE_ENV=development, VITE_API_URL=http://localhost:3000
npm run dev
```

**Verify:**
- Visit http://localhost:5173
- Yellow banner shows "DEVELOPMENT"
- Footer shows version numbers

### Staging/Production (Render)
- Configure via Render dashboard environment variables
- Each service has its own `DB_SCHEMA` and `NODE_ENV`/`VITE_ENV`
- Deploy and verify banner and footer

## Benefits

1. **Cost Savings**: One database for all environments
2. **Clear Visibility**: Always know which environment you're in
3. **Version Tracking**: See exactly which code is running
4. **Data Isolation**: Complete separation between environments
5. **Easy Cleanup**: Drop schema to reset environment
6. **Simple Debugging**: Environment visible in banner and logs

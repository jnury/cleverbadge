-- =============================================================================
-- CleverBadge Database Initialization Script for Render
-- =============================================================================
--
-- This script sets up the complete database infrastructure for Render deployment:
-- - Creates staging and production schemas
-- - Creates users with appropriate privileges:
--   * Runtime users (minimal privileges for app operation)
--   * Admin users (DDL privileges for migrations)
--   * Refresh user (sync staging from production)
--
-- IMPORTANT: Run this script as the Render database owner (usually 'postgres' or
-- the user created by Render when provisioning the database).
--
-- Usage on Render:
--   1. Connect to your Render PostgreSQL database
--   2. Run this script once during initial setup
--   3. Store the generated passwords securely
--
-- =============================================================================

-- Configuration: Set passwords here before running
-- IMPORTANT: Change these passwords before running in production!
-- Use strong, unique passwords for each user.
\set staging_runtime_pwd 'CHANGE_ME_staging_runtime_password'
\set staging_admin_pwd 'CHANGE_ME_staging_admin_password'
\set prod_runtime_pwd 'CHANGE_ME_prod_runtime_password'
\set prod_admin_pwd 'CHANGE_ME_prod_admin_password'
\set refresh_pwd 'CHANGE_ME_refresh_password'

-- =============================================================================
-- PART 1: CREATE SCHEMAS
-- =============================================================================

-- Create staging schema
CREATE SCHEMA IF NOT EXISTS staging;
COMMENT ON SCHEMA staging IS 'Staging environment for CleverBadge - mirrors production for testing';

-- Create production schema
CREATE SCHEMA IF NOT EXISTS production;
COMMENT ON SCHEMA production IS 'Production environment for CleverBadge - live data';

-- =============================================================================
-- PART 2: CREATE USERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 Runtime Users (for application operation)
-- These users have minimal privileges: SELECT, INSERT, UPDATE, DELETE on tables
-- and USAGE on sequences. NO DDL privileges (cannot ALTER/CREATE/DROP tables).
-- -----------------------------------------------------------------------------

-- Staging runtime user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cleverbadge_staging') THEN
    CREATE ROLE cleverbadge_staging WITH LOGIN PASSWORD :'staging_runtime_pwd';
  ELSE
    ALTER ROLE cleverbadge_staging WITH PASSWORD :'staging_runtime_pwd';
  END IF;
END
$$;
COMMENT ON ROLE cleverbadge_staging IS 'Runtime user for staging environment - read/write data only';

-- Production runtime user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cleverbadge_prod') THEN
    CREATE ROLE cleverbadge_prod WITH LOGIN PASSWORD :'prod_runtime_pwd';
  ELSE
    ALTER ROLE cleverbadge_prod WITH PASSWORD :'prod_runtime_pwd';
  END IF;
END
$$;
COMMENT ON ROLE cleverbadge_prod IS 'Runtime user for production environment - read/write data only';

-- -----------------------------------------------------------------------------
-- 2.2 Admin Users (for migrations)
-- These users have full DDL privileges on their respective schemas:
-- CREATE, ALTER, DROP tables, indexes, constraints, etc.
-- -----------------------------------------------------------------------------

-- Staging admin user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cleverbadge_staging_admin') THEN
    CREATE ROLE cleverbadge_staging_admin WITH LOGIN PASSWORD :'staging_admin_pwd';
  ELSE
    ALTER ROLE cleverbadge_staging_admin WITH PASSWORD :'staging_admin_pwd';
  END IF;
END
$$;
COMMENT ON ROLE cleverbadge_staging_admin IS 'Admin user for staging - can run migrations and alter schema';

-- Production admin user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cleverbadge_prod_admin') THEN
    CREATE ROLE cleverbadge_prod_admin WITH LOGIN PASSWORD :'prod_admin_pwd';
  ELSE
    ALTER ROLE cleverbadge_prod_admin WITH PASSWORD :'prod_admin_pwd';
  END IF;
END
$$;
COMMENT ON ROLE cleverbadge_prod_admin IS 'Admin user for production - can run migrations and alter schema';

-- -----------------------------------------------------------------------------
-- 2.3 Refresh User (for staging data sync)
-- This user can:
-- - SELECT from production schema (read production data)
-- - TRUNCATE + INSERT/UPDATE/DELETE on staging schema (full replace)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cleverbadge_refresh') THEN
    CREATE ROLE cleverbadge_refresh WITH LOGIN PASSWORD :'refresh_pwd';
  ELSE
    ALTER ROLE cleverbadge_refresh WITH PASSWORD :'refresh_pwd';
  END IF;
END
$$;
COMMENT ON ROLE cleverbadge_refresh IS 'Refresh user - can sync staging from production (TRUNCATE + copy)';

-- =============================================================================
-- PART 3: GRANT SCHEMA PRIVILEGES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 Staging Schema Privileges
-- -----------------------------------------------------------------------------

-- Runtime user: USAGE on schema only (no CREATE)
GRANT USAGE ON SCHEMA staging TO cleverbadge_staging;

-- Admin user: Full control on schema (including CREATE)
GRANT ALL PRIVILEGES ON SCHEMA staging TO cleverbadge_staging_admin;

-- Refresh user: USAGE on staging for data operations
GRANT USAGE ON SCHEMA staging TO cleverbadge_refresh;

-- -----------------------------------------------------------------------------
-- 3.2 Production Schema Privileges
-- -----------------------------------------------------------------------------

-- Runtime user: USAGE on schema only (no CREATE)
GRANT USAGE ON SCHEMA production TO cleverbadge_prod;

-- Admin user: Full control on schema (including CREATE)
GRANT ALL PRIVILEGES ON SCHEMA production TO cleverbadge_prod_admin;

-- Refresh user: USAGE on production for reading data
GRANT USAGE ON SCHEMA production TO cleverbadge_refresh;

-- =============================================================================
-- PART 4: GRANT TABLE/SEQUENCE PRIVILEGES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 Staging Runtime User Privileges
-- -----------------------------------------------------------------------------

-- Grant privileges on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA staging TO cleverbadge_staging;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA staging TO cleverbadge_staging;

-- Set default privileges for future tables (created by admin)
ALTER DEFAULT PRIVILEGES FOR ROLE cleverbadge_staging_admin IN SCHEMA staging
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_staging;
ALTER DEFAULT PRIVILEGES FOR ROLE cleverbadge_staging_admin IN SCHEMA staging
  GRANT USAGE, SELECT ON SEQUENCES TO cleverbadge_staging;

-- -----------------------------------------------------------------------------
-- 4.2 Staging Admin User Privileges
-- -----------------------------------------------------------------------------

-- Full control on all objects in staging schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA staging TO cleverbadge_staging_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA staging TO cleverbadge_staging_admin;

-- Allow creating types (for ENUMs)
GRANT CREATE ON SCHEMA staging TO cleverbadge_staging_admin;

-- -----------------------------------------------------------------------------
-- 4.3 Production Runtime User Privileges
-- -----------------------------------------------------------------------------

-- Grant privileges on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA production TO cleverbadge_prod;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA production TO cleverbadge_prod;

-- Set default privileges for future tables (created by admin)
ALTER DEFAULT PRIVILEGES FOR ROLE cleverbadge_prod_admin IN SCHEMA production
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_prod;
ALTER DEFAULT PRIVILEGES FOR ROLE cleverbadge_prod_admin IN SCHEMA production
  GRANT USAGE, SELECT ON SEQUENCES TO cleverbadge_prod;

-- -----------------------------------------------------------------------------
-- 4.4 Production Admin User Privileges
-- -----------------------------------------------------------------------------

-- Full control on all objects in production schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA production TO cleverbadge_prod_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA production TO cleverbadge_prod_admin;

-- Allow creating types (for ENUMs)
GRANT CREATE ON SCHEMA production TO cleverbadge_prod_admin;

-- -----------------------------------------------------------------------------
-- 4.5 Refresh User Privileges
-- -----------------------------------------------------------------------------

-- SELECT on production (to read data for copying)
GRANT SELECT ON ALL TABLES IN SCHEMA production TO cleverbadge_refresh;

-- Default privileges for future production tables
ALTER DEFAULT PRIVILEGES FOR ROLE cleverbadge_prod_admin IN SCHEMA production
  GRANT SELECT ON TABLES TO cleverbadge_refresh;

-- Full data manipulation on staging (TRUNCATE requires table ownership or special grant)
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA staging TO cleverbadge_refresh;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA staging TO cleverbadge_refresh;

-- Default privileges for future staging tables
ALTER DEFAULT PRIVILEGES FOR ROLE cleverbadge_staging_admin IN SCHEMA staging
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO cleverbadge_refresh;
ALTER DEFAULT PRIVILEGES FOR ROLE cleverbadge_staging_admin IN SCHEMA staging
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO cleverbadge_refresh;

-- =============================================================================
-- PART 5: VERIFICATION QUERIES
-- =============================================================================

-- Display created roles and their attributes
SELECT
  rolname AS "Role",
  rolcanlogin AS "Can Login",
  rolcreatedb AS "Create DB",
  rolcreaterole AS "Create Role",
  rolsuper AS "Superuser"
FROM pg_roles
WHERE rolname LIKE 'cleverbadge%'
ORDER BY rolname;

-- Display schema privileges
SELECT
  nspname AS "Schema",
  pg_catalog.array_agg(DISTINCT grantee::text) AS "Users with access"
FROM pg_namespace n
JOIN (
  SELECT nspname, grantor::regrole::text, grantee::regrole::text
  FROM pg_namespace, aclexplode(nspacl) AS acl
  WHERE nspname IN ('staging', 'production')
) sub USING (nspname)
WHERE nspname IN ('staging', 'production')
GROUP BY nspname;

-- =============================================================================
-- PART 6: CONNECTION STRING TEMPLATES
-- =============================================================================

-- After running this script, use these connection string formats:
--
-- STAGING RUNTIME (for NODE_ENV=staging backend):
--   postgresql://cleverbadge_staging:<staging_runtime_pwd>@<render-host>:5432/<dbname>?schema=staging
--
-- STAGING ADMIN (for migrations on staging):
--   postgresql://cleverbadge_staging_admin:<staging_admin_pwd>@<render-host>:5432/<dbname>?schema=staging
--
-- PRODUCTION RUNTIME (for NODE_ENV=production backend):
--   postgresql://cleverbadge_prod:<prod_runtime_pwd>@<render-host>:5432/<dbname>?schema=production
--
-- PRODUCTION ADMIN (for migrations on production):
--   postgresql://cleverbadge_prod_admin:<prod_admin_pwd>@<render-host>:5432/<dbname>?schema=production
--
-- REFRESH USER (for sync-staging-from-prod script):
--   postgresql://cleverbadge_refresh:<refresh_pwd>@<render-host>:5432/<dbname>
--
-- =============================================================================

\echo ''
\echo '============================================================================='
\echo 'CleverBadge Database Initialization Complete!'
\echo '============================================================================='
\echo ''
\echo 'Created schemas: staging, production'
\echo ''
\echo 'Created users:'
\echo '  - cleverbadge_staging       (runtime - staging)'
\echo '  - cleverbadge_staging_admin (migrations - staging)'
\echo '  - cleverbadge_prod          (runtime - production)'
\echo '  - cleverbadge_prod_admin    (migrations - production)'
\echo '  - cleverbadge_refresh       (sync staging from prod)'
\echo ''
\echo 'IMPORTANT: Update the passwords at the top of this script before running!'
\echo '============================================================================='

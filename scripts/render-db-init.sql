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
-- IMPORTANT:
-- 1. Run this script as the Render database owner
-- 2. Replace ALL password placeholders before running!
--
-- =============================================================================

-- =============================================================================
-- PART 1: CREATE SCHEMAS
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS production;

-- =============================================================================
-- PART 2: CREATE USERS
-- =============================================================================
-- IMPORTANT: Replace passwords below with secure values!
-- Use the generated passwords from: scripts/README.md

-- 2.1 Runtime Users (SELECT, INSERT, UPDATE, DELETE only)
CREATE ROLE cleverbadge_staging WITH LOGIN PASSWORD '******-REPLACE-WITH-STRONG-PASSWORD-******';
CREATE ROLE cleverbadge_prod WITH LOGIN PASSWORD '******-REPLACE-WITH-STRONG-PASSWORD-******';

-- 2.2 Admin Users (full DDL for migrations)
CREATE ROLE cleverbadge_staging_admin WITH LOGIN PASSWORD '******-REPLACE-WITH-STRONG-PASSWORD-******';
CREATE ROLE cleverbadge_prod_admin WITH LOGIN PASSWORD '******-REPLACE-WITH-STRONG-PASSWORD-******';

-- 2.3 Refresh User (sync staging from production)
CREATE ROLE cleverbadge_refresh WITH LOGIN PASSWORD '******-REPLACE-WITH-STRONG-PASSWORD-******';

-- =============================================================================
-- PART 3: GRANT SCHEMA PRIVILEGES
-- =============================================================================

-- Staging schema
GRANT USAGE ON SCHEMA staging TO cleverbadge_staging;
GRANT ALL PRIVILEGES ON SCHEMA staging TO cleverbadge_staging_admin;
GRANT USAGE ON SCHEMA staging TO cleverbadge_refresh;

-- Production schema
GRANT USAGE ON SCHEMA production TO cleverbadge_prod;
GRANT ALL PRIVILEGES ON SCHEMA production TO cleverbadge_prod_admin;
GRANT USAGE ON SCHEMA production TO cleverbadge_refresh;

-- =============================================================================
-- PART 4: GRANT TABLE/SEQUENCE PRIVILEGES
-- =============================================================================

-- 4.1 Staging Runtime User
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA staging TO cleverbadge_staging;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA staging TO cleverbadge_staging;

-- 4.2 Staging Admin User
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA staging TO cleverbadge_staging_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA staging TO cleverbadge_staging_admin;
GRANT CREATE ON SCHEMA staging TO cleverbadge_staging_admin;

-- 4.3 Production Runtime User
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA production TO cleverbadge_prod;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA production TO cleverbadge_prod;

-- 4.4 Production Admin User
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA production TO cleverbadge_prod_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA production TO cleverbadge_prod_admin;
GRANT CREATE ON SCHEMA production TO cleverbadge_prod_admin;

-- 4.5 Refresh User
GRANT SELECT ON ALL TABLES IN SCHEMA production TO cleverbadge_refresh;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA staging TO cleverbadge_refresh;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA staging TO cleverbadge_refresh;

-- =============================================================================
-- PART 5: VERIFICATION
-- =============================================================================

SELECT rolname AS "Role", rolcanlogin AS "Can Login"
FROM pg_roles
WHERE rolname LIKE 'cleverbadge%'
ORDER BY rolname;

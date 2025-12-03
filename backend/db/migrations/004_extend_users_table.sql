-- Migration: Extend users table for multi-user support
-- Add email, display_name, role, status fields

-- ===========================================
-- ENUM TYPES
-- ===========================================

-- User role type
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.user_role AS ENUM ('USER', 'AUTHOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- ALTER USERS TABLE
-- ===========================================

-- Add email column (will migrate existing users later)
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add display_name column
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Add bio column
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add role column with default USER
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS role __SCHEMA__.user_role DEFAULT 'USER';

-- Add status columns
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;

ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add last_login_at column
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- ===========================================
-- MIGRATE EXISTING USERS
-- ===========================================

-- Existing users in users table are all admins
-- Set them as ADMIN, active, and verified
UPDATE __SCHEMA__.users
SET
  role = 'ADMIN',
  is_active = TRUE,
  email_verified = TRUE,
  display_name = username,
  email = username || '@placeholder.local'
WHERE role IS NULL OR role = 'USER';

-- ===========================================
-- ADD CONSTRAINTS (after migration)
-- ===========================================

-- Make email unique (after populating)
DO $$ BEGIN
  ALTER TABLE __SCHEMA__.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

-- Make display_name unique
DO $$ BEGIN
  ALTER TABLE __SCHEMA__.users
    ADD CONSTRAINT users_display_name_unique UNIQUE (display_name);
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON __SCHEMA__.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON __SCHEMA__.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON __SCHEMA__.users(is_active);

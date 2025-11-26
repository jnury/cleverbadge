-- Migration: Add visibility_type enum
-- Date: 2025-11-26
-- Description: Create visibility_type enum with values 'public', 'private', 'protected'
--              This enum will be used for questions and tests visibility control

-- Create visibility_type ENUM in the schema (not in public)
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.visibility_type AS ENUM ('public', 'private', 'protected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

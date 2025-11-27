-- Migration: Add is_archived column to tests table for soft delete
-- This allows tests to be "deleted" while preserving historical assessment data

-- Add is_archived column with default false
ALTER TABLE __SCHEMA__.tests
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering non-archived tests
CREATE INDEX IF NOT EXISTS idx_tests_is_archived ON __SCHEMA__.tests(is_archived);

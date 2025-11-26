-- Migration: Add visibility column to tests table
-- Date: 2025-11-26
-- Description: Add visibility column using visibility_type enum
--              Existing tests default to 'private' (preserves current behavior)

-- Add visibility column
ALTER TABLE __SCHEMA__.tests
ADD COLUMN IF NOT EXISTS visibility __SCHEMA__.visibility_type NOT NULL DEFAULT 'private';

-- Create index for visibility filtering
CREATE INDEX IF NOT EXISTS idx_tests_visibility ON __SCHEMA__.tests(visibility);

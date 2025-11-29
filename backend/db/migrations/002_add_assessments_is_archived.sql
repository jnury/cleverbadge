-- Migration to add is_archived column to assessments table
-- Use __SCHEMA__ placeholder which will be replaced by the migration runner with the actual schema name

-- Add is_archived column to assessments
ALTER TABLE __SCHEMA__.assessments
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_assessments_is_archived ON __SCHEMA__.assessments(is_archived);

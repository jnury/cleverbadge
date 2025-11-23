-- Migration: Add pass_threshold column to tests table
-- Date: 2025-01-23
-- Description: Add pass_threshold (0-100) to support pass/fail vs neutral scoring modes
--              If pass_threshold = 0, show neutral score only
--              If pass_threshold > 0, show pass/fail based on score >= threshold

-- Add pass_threshold column to tests table
ALTER TABLE __SCHEMA__.tests
ADD COLUMN pass_threshold INTEGER NOT NULL DEFAULT 0
CHECK (pass_threshold >= 0 AND pass_threshold <= 100);

-- Update existing tests to have neutral mode (0 = no pass/fail threshold)
UPDATE __SCHEMA__.tests SET pass_threshold = 0 WHERE pass_threshold IS NULL;

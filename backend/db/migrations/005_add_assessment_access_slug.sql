-- Migration: Add access_slug column to assessments table
-- Date: 2025-11-26
-- Description: Stores the slug that was used when candidate started the test
--              This preserves the test link even if the test slug changes

-- Add access_slug column (nullable first for backfill)
ALTER TABLE __SCHEMA__.assessments
ADD COLUMN IF NOT EXISTS access_slug VARCHAR(100);

-- Backfill existing assessments with current test slug
UPDATE __SCHEMA__.assessments a
SET access_slug = t.slug
FROM __SCHEMA__.tests t
WHERE a.test_id = t.id AND a.access_slug IS NULL;

-- Make column NOT NULL after backfill
ALTER TABLE __SCHEMA__.assessments
ALTER COLUMN access_slug SET NOT NULL;

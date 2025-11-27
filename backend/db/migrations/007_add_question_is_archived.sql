-- Migration: Add is_archived column to questions table for soft delete
-- This allows questions to be "deleted" while preserving historical assessment data

-- Add is_archived column with default false
ALTER TABLE __SCHEMA__.questions
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering non-archived questions
CREATE INDEX IF NOT EXISTS idx_questions_is_archived ON __SCHEMA__.questions(is_archived);

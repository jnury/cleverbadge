-- Migration: Options refactor
-- - Remove correct_answers column from questions (derive from options.is_correct)
-- - Add show_explanations and explanation_scope columns to tests
-- - Options format changes from array to dict with is_correct/explanation per option

-- Add new enum types for test feedback settings
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.show_explanations_type AS ENUM ('never', 'after_each_question', 'after_submit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE __SCHEMA__.explanation_scope_type AS ENUM ('selected_only', 'all_answers');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add feedback settings columns to tests table
ALTER TABLE __SCHEMA__.tests
ADD COLUMN IF NOT EXISTS show_explanations __SCHEMA__.show_explanations_type NOT NULL DEFAULT 'never';

ALTER TABLE __SCHEMA__.tests
ADD COLUMN IF NOT EXISTS explanation_scope __SCHEMA__.explanation_scope_type NOT NULL DEFAULT 'selected_only';

-- Drop correct_answers column from questions table
-- Note: Run this AFTER all existing data has been migrated or deleted
ALTER TABLE __SCHEMA__.questions
DROP COLUMN IF EXISTS correct_answers;

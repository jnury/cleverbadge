-- Consolidated initial schema for CleverBadge v1.3.0
-- This migration creates all tables with the final schema
-- Use __SCHEMA__ placeholder which will be replaced by the migration runner with the actual schema name

-- ===========================================
-- ENUM TYPES
-- ===========================================

-- Question type: single choice or multiple choice
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.question_type AS ENUM ('SINGLE', 'MULTIPLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Assessment status: started or completed
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.assessment_status AS ENUM ('STARTED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Visibility type for questions and tests
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.visibility_type AS ENUM ('public', 'private', 'protected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Show explanations setting for tests
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.show_explanations_type AS ENUM ('never', 'after_each_question', 'after_submit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Explanation scope setting for tests
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.explanation_scope_type AS ENUM ('selected_only', 'all_answers');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- TABLES
-- ===========================================

-- Users table (for admin accounts)
CREATE TABLE IF NOT EXISTS __SCHEMA__.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Questions table
-- Options format: {"0": {"text": "...", "is_correct": true, "explanation": "..."}, ...}
CREATE TABLE IF NOT EXISTS __SCHEMA__.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  text TEXT NOT NULL,
  type __SCHEMA__.question_type NOT NULL,
  options JSONB NOT NULL,
  tags JSONB,
  author_id UUID NOT NULL REFERENCES __SCHEMA__.users(id),
  visibility __SCHEMA__.visibility_type NOT NULL DEFAULT 'private',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tests table
CREATE TABLE IF NOT EXISTS __SCHEMA__.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  pass_threshold INTEGER NOT NULL DEFAULT 0 CHECK (pass_threshold >= 0 AND pass_threshold <= 100),
  visibility __SCHEMA__.visibility_type NOT NULL DEFAULT 'private',
  show_explanations __SCHEMA__.show_explanations_type NOT NULL DEFAULT 'never',
  explanation_scope __SCHEMA__.explanation_scope_type NOT NULL DEFAULT 'selected_only',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Test Questions junction table (many-to-many)
CREATE TABLE IF NOT EXISTS __SCHEMA__.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES __SCHEMA__.tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES __SCHEMA__.questions(id) ON DELETE RESTRICT,
  weight INTEGER NOT NULL DEFAULT 1
);

-- Assessments table (candidate test attempts)
CREATE TABLE IF NOT EXISTS __SCHEMA__.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES __SCHEMA__.tests(id) ON DELETE CASCADE,
  candidate_name VARCHAR(100) NOT NULL,
  access_slug VARCHAR(100) NOT NULL,
  status __SCHEMA__.assessment_status NOT NULL DEFAULT 'STARTED',
  score_percentage NUMERIC(5, 2),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Assessment Answers table (individual question answers)
CREATE TABLE IF NOT EXISTS __SCHEMA__.assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES __SCHEMA__.assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES __SCHEMA__.questions(id) ON DELETE RESTRICT,
  selected_options JSONB NOT NULL,
  is_correct BOOLEAN,
  answered_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================

-- Questions indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_author_title ON __SCHEMA__.questions(author_id, title);
CREATE INDEX IF NOT EXISTS idx_questions_visibility ON __SCHEMA__.questions(visibility);
CREATE INDEX IF NOT EXISTS idx_questions_author_id ON __SCHEMA__.questions(author_id);
CREATE INDEX IF NOT EXISTS idx_questions_is_archived ON __SCHEMA__.questions(is_archived);

-- Tests indexes
CREATE INDEX IF NOT EXISTS idx_tests_visibility ON __SCHEMA__.tests(visibility);
CREATE INDEX IF NOT EXISTS idx_tests_is_archived ON __SCHEMA__.tests(is_archived);

-- Test Questions indexes
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON __SCHEMA__.test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON __SCHEMA__.test_questions(question_id);

-- Assessments indexes
CREATE INDEX IF NOT EXISTS idx_assessments_test_id ON __SCHEMA__.assessments(test_id);

-- Assessment Answers indexes
CREATE INDEX IF NOT EXISTS idx_assessment_answers_assessment_id ON __SCHEMA__.assessment_answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_question_id ON __SCHEMA__.assessment_answers(question_id);

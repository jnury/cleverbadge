-- Initial schema for CleverBadge
-- This migration creates all 6 tables: users, questions, tests, test_questions, assessments, assessment_answers
-- Use __SCHEMA__ placeholder which will be replaced by the migration runner with the actual schema name

-- Create ENUMs in the schema (not in public)
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.question_type AS ENUM ('SINGLE', 'MULTIPLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE __SCHEMA__.assessment_status AS ENUM ('STARTED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Users table (for admin accounts)
CREATE TABLE IF NOT EXISTS __SCHEMA__.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS __SCHEMA__.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  type __SCHEMA__.question_type NOT NULL,
  options JSONB NOT NULL,
  correct_answers JSONB NOT NULL,
  tags JSONB,
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON __SCHEMA__.test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON __SCHEMA__.test_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_assessments_test_id ON __SCHEMA__.assessments(test_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_assessment_id ON __SCHEMA__.assessment_answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_question_id ON __SCHEMA__.assessment_answers(question_id);

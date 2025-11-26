-- Migration: Add title, author_id, visibility columns to questions table
-- Date: 2025-11-26
-- Description: Add title for question identification, author tracking, and visibility control

-- Add title column (nullable first for backfill)
ALTER TABLE __SCHEMA__.questions
ADD COLUMN IF NOT EXISTS title VARCHAR(200);

-- Add author_id column (nullable first for backfill)
ALTER TABLE __SCHEMA__.questions
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES __SCHEMA__.users(id);

-- Add visibility column
ALTER TABLE __SCHEMA__.questions
ADD COLUMN IF NOT EXISTS visibility __SCHEMA__.visibility_type NOT NULL DEFAULT 'private';

-- Backfill author_id with first admin user (if exists)
UPDATE __SCHEMA__.questions q
SET author_id = (SELECT id FROM __SCHEMA__.users LIMIT 1)
WHERE author_id IS NULL;

-- Backfill title from first 50 chars of question text
-- Add a suffix number if duplicate titles exist for the same author
UPDATE __SCHEMA__.questions q
SET title = CASE
  WHEN (
    SELECT COUNT(*)
    FROM __SCHEMA__.questions q2
    WHERE q2.id < q.id
      AND q2.author_id = q.author_id
      AND LEFT(REGEXP_REPLACE(q2.text, E'[\\n\\r]+', ' ', 'g'), 50) = LEFT(REGEXP_REPLACE(q.text, E'[\\n\\r]+', ' ', 'g'), 50)
  ) > 0
  THEN LEFT(REGEXP_REPLACE(text, E'[\\n\\r]+', ' ', 'g'), 47) || ' (' || (
    SELECT COUNT(*) + 1
    FROM __SCHEMA__.questions q2
    WHERE q2.id < q.id
      AND q2.author_id = q.author_id
      AND LEFT(REGEXP_REPLACE(q2.text, E'[\\n\\r]+', ' ', 'g'), 50) = LEFT(REGEXP_REPLACE(q.text, E'[\\n\\r]+', ' ', 'g'), 50)
  )::text || ')'
  ELSE LEFT(REGEXP_REPLACE(text, E'[\\n\\r]+', ' ', 'g'), 50)
END
WHERE title IS NULL;

-- Make title NOT NULL after backfill
ALTER TABLE __SCHEMA__.questions
ALTER COLUMN title SET NOT NULL;

-- Make author_id NOT NULL after backfill (only if there are users)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM __SCHEMA__.users) THEN
    ALTER TABLE __SCHEMA__.questions
    ALTER COLUMN author_id SET NOT NULL;
  END IF;
END $$;

-- Add unique constraint on (author_id, title)
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_author_title
ON __SCHEMA__.questions(author_id, title);

-- Create index for visibility filtering
CREATE INDEX IF NOT EXISTS idx_questions_visibility ON __SCHEMA__.questions(visibility);

-- Create index for author filtering
CREATE INDEX IF NOT EXISTS idx_questions_author_id ON __SCHEMA__.questions(author_id);

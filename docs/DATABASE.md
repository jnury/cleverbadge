# Database Schema

Clever Badge uses PostgreSQL with Drizzle ORM. This document describes the complete database schema.

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└─────────────┘
      │
      │ (Admin creates tests)
      │
      ▼
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│    tests    │◄──────┤ test_questions   │──────►│  questions  │
└─────────────┘       └──────────────────┘       └─────────────┘
      │                 (Many-to-many with weight)
      │
      │ (Test has many assessments)
      │
      ▼
┌─────────────────┐
│  assessments    │
└─────────────────┘
      │
      │ (Assessment has many answers)
      │
      ▼
┌─────────────────────┐
│ assessment_answers  │
└─────────────────────┘
```

## Enums

### `visibility_type`

Controls access to questions and tests.

**Values:**
- `PUBLIC`: Accessible to all users
- `PRIVATE`: Requires additional access credentials

**Usage:**
- `questions.visibility`: Controls who can add question to tests
- `tests.visibility`: Controls who can access the test

### `question_type`

Type of multiple choice question.

**Values:**
- `SINGLE`: Exactly one correct answer
- `MULTIPLE`: One or more correct answers

### `assessment_status`

Status of a candidate's assessment attempt.

**Values:**
- `STARTED`: Assessment in progress
- `COMPLETED`: Assessment submitted and scored

---

## Tables

### `users`

Admin users who can manage tests and view results.

| Column        | Type      | Constraints           | Description                    |
|---------------|-----------|-----------------------|--------------------------------|
| id            | UUID      | PRIMARY KEY           | Unique identifier              |
| username      | VARCHAR   | UNIQUE, NOT NULL      | Login username                 |
| password_hash | VARCHAR   | NOT NULL              | Argon2 hashed password         |
| created_at    | TIMESTAMP | NOT NULL, DEFAULT NOW | Account creation timestamp     |
| updated_at    | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update timestamp          |

**Indexes:**
- Primary key on `id`
- Unique index on `username`

**Notes:**
- Passwords are hashed using argon2 before storage
- No email field in MVP (username only)

---

### `questions`

Individual MCQ questions that can be added to tests.

| Column          | Type      | Constraints                      | Description                              |
|-----------------|-----------|----------------------------------|------------------------------------------|
| id              | UUID      | PRIMARY KEY                      | Unique identifier                        |
| title           | VARCHAR   | NOT NULL                         | Question title (3-200 characters)        |
| text            | TEXT      | NOT NULL                         | Question text (10-1000 characters)       |
| type            | ENUM      | NOT NULL                         | 'SINGLE' or 'MULTIPLE'                   |
| visibility      | ENUM      | NOT NULL, DEFAULT 'PUBLIC'       | 'PUBLIC' or 'PRIVATE'                    |
| options         | JSON      | NOT NULL                         | Array of answer options                  |
| correct_answers | JSON      | NOT NULL                         | Array of correct answer(s)               |
| tags            | JSON      | NULL                             | Array of tags for categorization         |
| author_id       | UUID      | FOREIGN KEY → users(id), NOT NULL| Author who created the question          |
| created_at      | TIMESTAMP | NOT NULL, DEFAULT NOW            | Creation timestamp                       |
| updated_at      | TIMESTAMP | NOT NULL, DEFAULT NOW            | Last update timestamp                    |

**Indexes:**
- Primary key on `id`
- Index on `author_id` for filtering by author
- Index on `visibility` for filtering
- GIN index on `tags` for efficient tag filtering

**Foreign Keys:**
- `author_id` → `users(id)` ON DELETE SET NULL (preserve questions if author deleted)

**Validation:**
- `title`: 3-200 characters, auto-generated from text if not provided
- `type`: Must be 'SINGLE' or 'MULTIPLE'
- `visibility`: Must be 'PUBLIC' or 'PRIVATE'
- `options`: Array of 2-10 strings
- `correct_answers`: Must be subset of `options`
  - For SINGLE: exactly 1 element
  - For MULTIPLE: 1+ elements
- `tags`: Optional array of strings

**Visibility Rules:**
- PUBLIC questions: Can be added to any test by any admin
- PRIVATE questions: Can only be added to tests by the author

**Example Data:**
```json
{
  "title": "Geography - France Capital",
  "text": "What is the capital of France?",
  "type": "SINGLE",
  "visibility": "PUBLIC",
  "options": ["London", "Paris", "Berlin", "Madrid"],
  "correct_answers": ["Paris"],
  "tags": ["geography", "europe"],
  "author_id": "uuid-admin"
}
```

---

### `tests`

Collections of questions that candidates can take.

| Column      | Type      | Constraints           | Description                              |
|-------------|-----------|-----------------------|------------------------------------------|
| id          | UUID      | PRIMARY KEY           | Unique identifier                        |
| title       | VARCHAR   | NOT NULL              | Test title (3-200 characters)            |
| description | TEXT      | NULL                  | Test description (max 2000 chars)        |
| slug        | VARCHAR   | UNIQUE, NOT NULL      | URL-friendly identifier with random suffix |
| access_slug | VARCHAR   | NULL                  | Access token for PRIVATE tests (12 chars) |
| visibility  | ENUM      | NOT NULL, DEFAULT 'PUBLIC' | 'PUBLIC' or 'PRIVATE'               |
| is_enabled  | BOOLEAN   | NOT NULL, DEFAULT false | Whether test is available to candidates |
| created_at  | TIMESTAMP | NOT NULL, DEFAULT NOW | Creation timestamp                       |
| updated_at  | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update timestamp                    |

**Indexes:**
- Primary key on `id`
- Unique index on `slug`
- Index on `visibility` for filtering
- Index on `is_enabled` for filtering

**Notes:**
- `slug` is auto-generated from title with random 6-character suffix (e.g., "javascript-fundamentals-a1b2c3")
- `access_slug` is auto-generated for PRIVATE tests (12 alphanumeric characters)
- When `is_enabled = false`, test is not accessible via `/t/:slug`
- Disabling a test blocks both new starts and in-progress assessments

**Visibility Rules:**
- PUBLIC tests: Accessible with just the slug
- PRIVATE tests: Require both slug and access_slug to access
- access_slug can be regenerated via API (invalidates previous links)

**Example Data:**
```json
{
  "title": "JavaScript Fundamentals",
  "description": "Test your knowledge of JavaScript basics",
  "slug": "javascript-fundamentals-a1b2c3",
  "access_slug": "xyz789abc012",
  "visibility": "PRIVATE",
  "is_enabled": true
}
```

---

### `test_questions`

Many-to-many relationship between tests and questions with weight for scoring.

| Column      | Type    | Constraints                           | Description                              |
|-------------|---------|---------------------------------------|------------------------------------------|
| id          | UUID    | PRIMARY KEY                           | Unique identifier                        |
| test_id     | UUID    | FOREIGN KEY → tests(id), NOT NULL     | Reference to test                        |
| question_id | UUID    | FOREIGN KEY → questions(id), NOT NULL | Reference to question                    |
| weight      | INTEGER | NOT NULL, DEFAULT 1                   | Question weight for scoring (1-10)       |

**Indexes:**
- Primary key on `id`
- Composite unique index on `(test_id, question_id)`
- Index on `test_id` for efficient test lookups
- Index on `question_id` for checking question usage

**Foreign Keys:**
- `test_id` → `tests(id)` ON DELETE CASCADE
- `question_id` → `questions(id)` ON DELETE RESTRICT

**Notes:**
- Same question can appear in multiple tests
- Weight determines how much the question contributes to final score
- Cannot delete a question that's used in active tests (RESTRICT)
- Deleting a test removes all its test_questions entries (CASCADE)

**Scoring Logic:**
```
For each question:
  if answer is correct: score += weight

Final score = (total_score / max_possible_score) * 100
```

---

### `assessments`

Individual candidate attempts at taking a test.

| Column          | Type      | Constraints                        | Description                              |
|-----------------|-----------|-------------------------------------|------------------------------------------|
| id              | UUID      | PRIMARY KEY                        | Unique identifier                        |
| test_id         | UUID      | FOREIGN KEY → tests(id), NOT NULL   | Reference to test taken                  |
| candidate_name  | VARCHAR   | NOT NULL                           | Candidate's name (2-100 characters)      |
| access_slug     | VARCHAR   | NULL                               | Access token for PRIVATE tests (copied from test) |
| status          | ENUM      | NOT NULL, DEFAULT 'STARTED'        | 'STARTED' or 'COMPLETED'                 |
| score_percentage| DECIMAL   | NULL                               | Final score (0-100), null until completed |
| started_at      | TIMESTAMP | NOT NULL, DEFAULT NOW              | When assessment started                  |
| completed_at    | TIMESTAMP | NULL                               | When assessment was submitted            |

**Indexes:**
- Primary key on `id`
- Index on `test_id` for filtering by test
- Index on `status` for filtering incomplete assessments
- Index on `completed_at` for sorting by completion time

**Foreign Keys:**
- `test_id` → `tests(id)` ON DELETE CASCADE

**Notes:**
- Created when candidate clicks "Start Test"
- `access_slug` is copied from test during creation (for PRIVATE tests)
- Storing access_slug allows candidate to continue test even if test's access_slug is regenerated
- `status` changes from 'STARTED' to 'COMPLETED' on submission
- `score_percentage` is calculated on submission
- No authentication - candidates don't need accounts

**State Transitions:**
```
STARTED → (submit assessment) → COMPLETED
```

---

### `assessment_answers`

Individual answers submitted during an assessment.

| Column           | Type      | Constraints                              | Description                              |
|------------------|-----------|------------------------------------------|------------------------------------------|
| id               | UUID      | PRIMARY KEY                              | Unique identifier                        |
| assessment_id    | UUID      | FOREIGN KEY → assessments(id), NOT NULL  | Reference to assessment                  |
| question_id      | UUID      | FOREIGN KEY → questions(id), NOT NULL    | Reference to question answered           |
| selected_options | JSON      | NOT NULL                                 | Array of selected option(s)              |
| is_correct       | BOOLEAN   | NULL                                     | Whether answer is correct (set on submit)|
| answered_at      | TIMESTAMP | NOT NULL, DEFAULT NOW                    | When answer was submitted                |

**Indexes:**
- Primary key on `id`
- Composite unique index on `(assessment_id, question_id)` - one answer per question
- Index on `assessment_id` for efficient assessment lookups

**Foreign Keys:**
- `assessment_id` → `assessments(id)` ON DELETE CASCADE
- `question_id` → `questions(id)` ON DELETE RESTRICT

**Notes:**
- Candidates can update their answer before final submission
- `is_correct` is null while assessment is in progress
- `is_correct` is calculated when assessment is submitted
- `selected_options` must be subset of question's options

**Correctness Logic:**
```javascript
// For SINGLE type questions
is_correct = (selected_options.length === 1 &&
              correct_answers.includes(selected_options[0]))

// For MULTIPLE type questions
is_correct = (arraysAreEqual(selected_options.sort(), correct_answers.sort()))
```

---

## Raw SQL Schema Example

```sql
-- Enums
CREATE TYPE visibility_type AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE question_type AS ENUM ('SINGLE', 'MULTIPLE');
CREATE TYPE assessment_status AS ENUM ('STARTED', 'COMPLETED');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  text TEXT NOT NULL,
  type question_type NOT NULL,
  visibility visibility_type NOT NULL DEFAULT 'PUBLIC',
  options JSON NOT NULL,
  correct_answers JSON NOT NULL,
  tags JSON,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_author ON questions(author_id);
CREATE INDEX idx_questions_visibility ON questions(visibility);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);

-- Tests table
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL UNIQUE,
  access_slug VARCHAR(12),
  visibility visibility_type NOT NULL DEFAULT 'PUBLIC',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  pass_threshold INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tests_visibility ON tests(visibility);
CREATE INDEX idx_tests_enabled ON tests(is_enabled);

-- Test Questions junction table
CREATE TABLE test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  weight INTEGER NOT NULL DEFAULT 1,
  UNIQUE(test_id, question_id)
);

CREATE INDEX idx_test_questions_test ON test_questions(test_id);
CREATE INDEX idx_test_questions_question ON test_questions(question_id);

-- Assessments table
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  candidate_name VARCHAR(100) NOT NULL,
  access_slug VARCHAR(12),
  status assessment_status NOT NULL DEFAULT 'STARTED',
  score_percentage DECIMAL(5,2),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_assessments_test ON assessments(test_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_completed ON assessments(completed_at);

-- Assessment Answers table
CREATE TABLE assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_options JSON NOT NULL,
  is_correct BOOLEAN,
  answered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(assessment_id, question_id)
);

CREATE INDEX idx_assessment_answers_assessment ON assessment_answers(assessment_id);
```

---

## Common Queries

### Get test with all questions
```sql
SELECT t.*,
       json_agg(
         json_build_object(
           'question_id', q.id,
           'text', q.text,
           'type', q.type,
           'options', q.options,
           'weight', tq.weight
         )
       ) as questions
FROM tests t
LEFT JOIN test_questions tq ON t.id = tq.test_id
LEFT JOIN questions q ON tq.question_id = q.id
WHERE t.id = $1
GROUP BY t.id;
```

### Calculate assessment score
```sql
WITH question_scores AS (
  SELECT
    aa.assessment_id,
    SUM(CASE WHEN aa.is_correct THEN tq.weight ELSE 0 END) as earned_score,
    SUM(tq.weight) as max_score
  FROM assessment_answers aa
  JOIN test_questions tq ON aa.question_id = tq.question_id
  WHERE aa.assessment_id = $1
  GROUP BY aa.assessment_id
)
UPDATE assessments
SET
  score_percentage = (earned_score::decimal / max_score::decimal * 100),
  status = 'COMPLETED',
  completed_at = NOW()
FROM question_scores
WHERE assessments.id = question_scores.assessment_id;
```

### Get question success rate for a test
```sql
SELECT
  q.id,
  q.text,
  COUNT(aa.id) as total_attempts,
  SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END) as correct_attempts,
  ROUND(
    SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::decimal / COUNT(aa.id)::decimal * 100,
    2
  ) as success_rate
FROM questions q
JOIN test_questions tq ON q.id = tq.question_id
JOIN assessments a ON tq.test_id = a.test_id
LEFT JOIN assessment_answers aa ON a.id = aa.assessment_id AND q.id = aa.question_id
WHERE tq.test_id = $1 AND a.status = 'COMPLETED'
GROUP BY q.id, q.text
ORDER BY success_rate ASC;
```

---

## Migration Notes

### Initial Setup
1. Create database and user (see README.md)
2. Set `DATABASE_URL` in `.env`
3. Run `npm run db:push` to create all tables
4. Run `npm run create-admin` to create first admin user

### Development Workflow
- Schema changes are made in `db/schema.js`
- Run `npm run db:push` to apply changes to local database
- For production, use proper migration files (future enhancement)

### Data Seeding
- Use YAML import for questions
- Manually create first admin user via script
- Tests are created through admin UI

---

## Performance Considerations

### Indexes
All foreign keys have indexes for efficient joins. Additional indexes:
- `tests.is_enabled` - filter active tests
- `assessments.status` - filter completed assessments
- `questions.tags` (GIN) - tag filtering

### Cascade Deletes
- Deleting a test cascades to test_questions and assessments
- Deleting an assessment cascades to assessment_answers
- Questions cannot be deleted if used in tests (RESTRICT)

### Query Optimization
- Use pagination for large result sets
- Limit included with all list endpoints (default 100, max 500)
- Consider materialized views for analytics in future versions

---

## Backup and Recovery

For production on Render:
- Enable automated backups in Render dashboard
- Backups occur daily on free tier
- Point-in-time recovery available on paid tiers

For local development:
```bash
# Backup
pg_dump -U cleverbadge_user cleverbadge > backup.sql

# Restore
psql -U cleverbadge_user cleverbadge < backup.sql
```

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

| Column          | Type      | Constraints           | Description                              |
|-----------------|-----------|-----------------------|------------------------------------------|
| id              | UUID      | PRIMARY KEY           | Unique identifier                        |
| text            | TEXT      | NOT NULL              | Question text (10-1000 characters)       |
| type            | ENUM      | NOT NULL              | 'SINGLE' or 'MULTIPLE'                   |
| options         | JSON      | NOT NULL              | Array of answer options                  |
| correct_answers | JSON      | NOT NULL              | Array of correct answer(s)               |
| tags            | JSON      | NULL                  | Array of tags for categorization         |
| created_at      | TIMESTAMP | NOT NULL, DEFAULT NOW | Creation timestamp                       |
| updated_at      | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update timestamp                    |

**Indexes:**
- Primary key on `id`
- GIN index on `tags` for efficient tag filtering

**Validation:**
- `type`: Must be 'SINGLE' or 'MULTIPLE'
- `options`: Array of 2-10 strings
- `correct_answers`: Must be subset of `options`
  - For SINGLE: exactly 1 element
  - For MULTIPLE: 1+ elements
- `tags`: Optional array of strings

**Example Data:**
```json
{
  "text": "What is the capital of France?",
  "type": "SINGLE",
  "options": ["London", "Paris", "Berlin", "Madrid"],
  "correct_answers": ["Paris"],
  "tags": ["geography", "europe"]
}
```

---

### `tests`

Collections of questions that candidates can take.

| Column      | Type      | Constraints           | Description                           |
|-------------|-----------|-----------------------|---------------------------------------|
| id          | UUID      | PRIMARY KEY           | Unique identifier                     |
| title       | VARCHAR   | NOT NULL              | Test title (3-200 characters)         |
| description | TEXT      | NULL                  | Test description (max 2000 chars)     |
| slug        | VARCHAR   | UNIQUE, NOT NULL      | URL-friendly identifier               |
| is_enabled  | BOOLEAN   | NOT NULL, DEFAULT false | Whether test is available to candidates |
| created_at  | TIMESTAMP | NOT NULL, DEFAULT NOW | Creation timestamp                    |
| updated_at  | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update timestamp                 |

**Indexes:**
- Primary key on `id`
- Unique index on `slug`
- Index on `is_enabled` for filtering

**Notes:**
- `slug` is immutable after creation
- When `is_enabled = false`, test is not accessible via `/t/:slug`
- Disabling a test blocks both new starts and in-progress assessments

**Example Data:**
```json
{
  "title": "JavaScript Fundamentals",
  "description": "Test your knowledge of JavaScript basics",
  "slug": "javascript-fundamentals",
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

## Drizzle Schema Example

```javascript
// Example Drizzle schema definition (db/schema.js)

import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, json, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const questionTypeEnum = pgEnum('question_type', ['SINGLE', 'MULTIPLE']);
export const assessmentStatusEnum = pgEnum('assessment_status', ['STARTED', 'COMPLETED']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Questions table
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  type: questionTypeEnum('type').notNull(),
  options: json('options').$type<string[]>().notNull(),
  correct_answers: json('correct_answers').$type<string[]>().notNull(),
  tags: json('tags').$type<string[]>(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Tests table
export const tests = pgTable('tests', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  is_enabled: boolean('is_enabled').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Test Questions junction table
export const testQuestions = pgTable('test_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  test_id: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  question_id: uuid('question_id').references(() => questions.id, { onDelete: 'restrict' }).notNull(),
  weight: integer('weight').default(1).notNull()
});

// Assessments table
export const assessments = pgTable('assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  test_id: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  candidate_name: varchar('candidate_name', { length: 100 }).notNull(),
  status: assessmentStatusEnum('status').default('STARTED').notNull(),
  score_percentage: decimal('score_percentage', { precision: 5, scale: 2 }),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at')
});

// Assessment Answers table
export const assessmentAnswers = pgTable('assessment_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  assessment_id: uuid('assessment_id').references(() => assessments.id, { onDelete: 'cascade' }).notNull(),
  question_id: uuid('question_id').references(() => questions.id, { onDelete: 'restrict' }).notNull(),
  selected_options: json('selected_options').$type<string[]>().notNull(),
  is_correct: boolean('is_correct'),
  answered_at: timestamp('answered_at').defaultNow().notNull()
});
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

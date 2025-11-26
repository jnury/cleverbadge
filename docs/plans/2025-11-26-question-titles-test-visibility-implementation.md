# Question Titles & Test Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add question titles, author tracking, visibility modes (public/private/protected), and random slugs with regeneration capability.

**Architecture:** Database migration adds new columns and enum type. Backend enforces visibility matrix when adding questions to tests or changing visibility. Frontend removes slug input, adds visibility dropdowns, and displays author filter.

**Tech Stack:** PostgreSQL migrations, Node.js/Express API, React frontend, Vitest/Playwright tests

---

## Task 1: Create Migration for Visibility Enum Type

**Files:**
- Create: `backend/db/migrations/003_add_visibility_enum.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration 003: Add visibility enum type
-- This enum is used by both questions and tests tables

DO $$ BEGIN
  CREATE TYPE __SCHEMA__.visibility_type AS ENUM ('public', 'private', 'protected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

**Step 2: Test migration locally**

Run: `cd backend && npm run migrate`
Expected: Migration runs without errors

**Step 3: Verify enum exists**

Run: `PGPASSWORD=cleverbadge_dev psql -h localhost -U cleverbadge_dev -d cleverbadge -c "SELECT enum_range(NULL::development.visibility_type);"`
Expected: `{public,private,protected}`

**Step 4: Commit**

```bash
git add backend/db/migrations/003_add_visibility_enum.sql
git commit -m "feat(db): add visibility_type enum for questions and tests"
```

---

## Task 2: Create Migration for Tests Table Changes

**Files:**
- Create: `backend/db/migrations/004_add_test_visibility_and_update_slug.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration 004: Add visibility column to tests table
-- Existing tests default to 'private' (preserves current behavior)

-- Add visibility column
ALTER TABLE __SCHEMA__.tests
ADD COLUMN IF NOT EXISTS visibility __SCHEMA__.visibility_type NOT NULL DEFAULT 'private';

-- Create index for visibility filtering
CREATE INDEX IF NOT EXISTS idx_tests_visibility ON __SCHEMA__.tests(visibility);
```

**Step 2: Test migration locally**

Run: `cd backend && npm run migrate`
Expected: Migration runs without errors

**Step 3: Verify column exists**

Run: `PGPASSWORD=cleverbadge_dev psql -h localhost -U cleverbadge_dev -d cleverbadge -c "SELECT visibility FROM development.tests LIMIT 1;"`
Expected: Returns 'private' or empty result (if no tests exist)

**Step 4: Commit**

```bash
git add backend/db/migrations/004_add_test_visibility_and_update_slug.sql
git commit -m "feat(db): add visibility column to tests table"
```

---

## Task 3: Create Migration for Assessments Table (access_slug)

**Files:**
- Create: `backend/db/migrations/005_add_assessment_access_slug.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration 005: Add access_slug column to assessments table
-- Stores the slug that was used when candidate started the test

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
```

**Step 2: Test migration locally**

Run: `cd backend && npm run migrate`
Expected: Migration runs without errors

**Step 3: Verify column exists and is populated**

Run: `PGPASSWORD=cleverbadge_dev psql -h localhost -U cleverbadge_dev -d cleverbadge -c "SELECT id, access_slug FROM development.assessments LIMIT 3;"`
Expected: Shows access_slug values (or empty if no assessments)

**Step 4: Commit**

```bash
git add backend/db/migrations/005_add_assessment_access_slug.sql
git commit -m "feat(db): add access_slug column to assessments table"
```

---

## Task 4: Create Migration for Questions Table Changes

**Files:**
- Create: `backend/db/migrations/006_add_question_title_author_visibility.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration 006: Add title, author_id, visibility columns to questions table

-- Add title column (nullable first for backfill)
ALTER TABLE __SCHEMA__.questions
ADD COLUMN IF NOT EXISTS title VARCHAR(200);

-- Add author_id column (nullable first for backfill)
ALTER TABLE __SCHEMA__.questions
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES __SCHEMA__.users(id);

-- Add visibility column
ALTER TABLE __SCHEMA__.questions
ADD COLUMN IF NOT EXISTS visibility __SCHEMA__.visibility_type NOT NULL DEFAULT 'private';

-- Backfill title from first 50 chars of question text
UPDATE __SCHEMA__.questions
SET title = LEFT(REGEXP_REPLACE(text, E'[\\n\\r]+', ' ', 'g'), 50)
WHERE title IS NULL;

-- Backfill author_id with first admin user (if exists)
UPDATE __SCHEMA__.questions q
SET author_id = (SELECT id FROM __SCHEMA__.users LIMIT 1)
WHERE author_id IS NULL;

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
```

**Step 2: Test migration locally**

Run: `cd backend && npm run migrate`
Expected: Migration runs without errors

**Step 3: Verify columns exist**

Run: `PGPASSWORD=cleverbadge_dev psql -h localhost -U cleverbadge_dev -d cleverbadge -c "SELECT id, title, author_id, visibility FROM development.questions LIMIT 3;"`
Expected: Shows new columns with backfilled values

**Step 4: Commit**

```bash
git add backend/db/migrations/006_add_question_title_author_visibility.sql
git commit -m "feat(db): add title, author_id, visibility columns to questions table"
```

---

## Task 5: Create Slug Generation Utility

**Files:**
- Create: `backend/utils/slug.js`
- Create: `backend/tests/unit/slug.test.js`

**Step 1: Write the failing test**

```javascript
// backend/tests/unit/slug.test.js
import { describe, it, expect } from 'vitest';
import { generateRandomSlug, isValidSlug } from '../../utils/slug.js';

describe('Slug Utilities', () => {
  describe('generateRandomSlug', () => {
    it('should generate an 8-character slug', () => {
      const slug = generateRandomSlug();
      expect(slug).toHaveLength(8);
    });

    it('should only contain lowercase alphanumeric characters', () => {
      const slug = generateRandomSlug();
      expect(slug).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate unique slugs', () => {
      const slugs = new Set();
      for (let i = 0; i < 100; i++) {
        slugs.add(generateRandomSlug());
      }
      expect(slugs.size).toBe(100);
    });
  });

  describe('isValidSlug', () => {
    it('should return true for valid 8-char alphanumeric slug', () => {
      expect(isValidSlug('k7m2x9pq')).toBe(true);
    });

    it('should return true for legacy slugs with hyphens', () => {
      expect(isValidSlug('javascript-fundamentals')).toBe(true);
    });

    it('should return false for uppercase characters', () => {
      expect(isValidSlug('K7M2X9PQ')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidSlug('')).toBe(false);
    });

    it('should return false for special characters', () => {
      expect(isValidSlug('test_slug!')).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- tests/unit/slug.test.js`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```javascript
// backend/utils/slug.js
import crypto from 'crypto';

/**
 * Generates a random 8-character slug using lowercase alphanumeric characters.
 * Uses cryptographically secure random bytes.
 * @returns {string} 8-character random slug (a-z, 0-9)
 */
export function generateRandomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(8);
  let slug = '';

  for (let i = 0; i < 8; i++) {
    slug += chars[bytes[i] % chars.length];
  }

  return slug;
}

/**
 * Validates a slug format.
 * Accepts both new random slugs (8 alphanumeric) and legacy slugs (with hyphens).
 * @param {string} slug - The slug to validate
 * @returns {boolean} True if valid
 */
export function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return false;
  }
  // Allow lowercase alphanumeric and hyphens (for legacy slugs)
  return /^[a-z0-9-]+$/.test(slug);
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- tests/unit/slug.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/utils/slug.js backend/tests/unit/slug.test.js
git commit -m "feat(utils): add slug generation utility"
```

---

## Task 6: Create Visibility Matrix Utility

**Files:**
- Create: `backend/utils/visibility.js`
- Create: `backend/tests/unit/visibility.test.js`

**Step 1: Write the failing test**

```javascript
// backend/tests/unit/visibility.test.js
import { describe, it, expect } from 'vitest';
import {
  canQuestionBeInTest,
  getIncompatibleQuestions,
  canChangeQuestionVisibility,
  canChangeTestVisibility
} from '../../utils/visibility.js';

describe('Visibility Matrix', () => {
  describe('canQuestionBeInTest', () => {
    it('should allow public question in any test', () => {
      expect(canQuestionBeInTest('public', 'public')).toBe(true);
      expect(canQuestionBeInTest('public', 'private')).toBe(true);
      expect(canQuestionBeInTest('public', 'protected')).toBe(true);
    });

    it('should allow private question in private or protected test', () => {
      expect(canQuestionBeInTest('private', 'public')).toBe(false);
      expect(canQuestionBeInTest('private', 'private')).toBe(true);
      expect(canQuestionBeInTest('private', 'protected')).toBe(true);
    });

    it('should allow protected question only in protected test', () => {
      expect(canQuestionBeInTest('protected', 'public')).toBe(false);
      expect(canQuestionBeInTest('protected', 'private')).toBe(false);
      expect(canQuestionBeInTest('protected', 'protected')).toBe(true);
    });
  });

  describe('getIncompatibleQuestions', () => {
    const questions = [
      { id: '1', title: 'Q1', visibility: 'public' },
      { id: '2', title: 'Q2', visibility: 'private' },
      { id: '3', title: 'Q3', visibility: 'protected' }
    ];

    it('should return no incompatible questions for protected test', () => {
      const result = getIncompatibleQuestions(questions, 'protected');
      expect(result).toHaveLength(0);
    });

    it('should return protected questions as incompatible for private test', () => {
      const result = getIncompatibleQuestions(questions, 'private');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should return private and protected questions as incompatible for public test', () => {
      const result = getIncompatibleQuestions(questions, 'public');
      expect(result).toHaveLength(2);
      expect(result.map(q => q.id)).toContain('2');
      expect(result.map(q => q.id)).toContain('3');
    });
  });

  describe('canChangeQuestionVisibility', () => {
    it('should allow making question more restrictive', () => {
      // public -> private: always allowed (more restrictive)
      expect(canChangeQuestionVisibility('public', 'private', [])).toEqual({ allowed: true });
    });

    it('should block making question less restrictive if used in incompatible tests', () => {
      const tests = [{ id: '1', title: 'Public Test', visibility: 'public' }];
      // private -> public would be allowed
      // But protected -> public when used in public test would be blocked
      const result = canChangeQuestionVisibility('protected', 'public', tests);
      expect(result.allowed).toBe(true); // protected can go to public if test allows
    });

    it('should block if question is in private test and changing to protected', () => {
      const tests = [{ id: '1', title: 'Private Test', visibility: 'private' }];
      const result = canChangeQuestionVisibility('private', 'protected', tests);
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toHaveLength(1);
    });
  });

  describe('canChangeTestVisibility', () => {
    it('should allow making test more restrictive', () => {
      // public -> private: always allowed
      const result = canChangeTestVisibility('public', 'private', []);
      expect(result.allowed).toBe(true);
    });

    it('should block making test public if it has private questions', () => {
      const questions = [
        { id: '1', title: 'Q1', visibility: 'private' }
      ];
      const result = canChangeTestVisibility('private', 'public', questions);
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toHaveLength(1);
    });

    it('should allow making test public if all questions are public', () => {
      const questions = [
        { id: '1', title: 'Q1', visibility: 'public' }
      ];
      const result = canChangeTestVisibility('private', 'public', questions);
      expect(result.allowed).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- tests/unit/visibility.test.js`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```javascript
// backend/utils/visibility.js

/**
 * Visibility hierarchy (from least to most restrictive):
 * public (0) < private (1) < protected (2)
 */
const VISIBILITY_LEVEL = {
  'public': 0,
  'private': 1,
  'protected': 2
};

/**
 * Check if a question with given visibility can be added to a test with given visibility.
 * Rule: Question can only be in tests with equal or higher restriction level.
 *
 * @param {string} questionVisibility - 'public', 'private', or 'protected'
 * @param {string} testVisibility - 'public', 'private', or 'protected'
 * @returns {boolean}
 */
export function canQuestionBeInTest(questionVisibility, testVisibility) {
  const questionLevel = VISIBILITY_LEVEL[questionVisibility];
  const testLevel = VISIBILITY_LEVEL[testVisibility];

  // Question can be in test if test is at least as restrictive
  return testLevel >= questionLevel;
}

/**
 * Get questions that are incompatible with a given test visibility.
 *
 * @param {Array} questions - Array of question objects with visibility property
 * @param {string} testVisibility - Target test visibility
 * @returns {Array} Questions that cannot be in the test
 */
export function getIncompatibleQuestions(questions, testVisibility) {
  return questions.filter(q => !canQuestionBeInTest(q.visibility, testVisibility));
}

/**
 * Check if question visibility can be changed given the tests it's used in.
 *
 * @param {string} currentVisibility - Current question visibility
 * @param {string} newVisibility - Desired new visibility
 * @param {Array} testsUsingQuestion - Tests that contain this question
 * @returns {{ allowed: boolean, blockedBy?: Array }}
 */
export function canChangeQuestionVisibility(currentVisibility, newVisibility, testsUsingQuestion) {
  // Find tests that would become incompatible
  const blockedBy = testsUsingQuestion.filter(test =>
    !canQuestionBeInTest(newVisibility, test.visibility)
  );

  if (blockedBy.length > 0) {
    return {
      allowed: false,
      blockedBy: blockedBy.map(t => ({ id: t.id, title: t.title, visibility: t.visibility }))
    };
  }

  return { allowed: true };
}

/**
 * Check if test visibility can be changed given its questions.
 *
 * @param {string} currentVisibility - Current test visibility
 * @param {string} newVisibility - Desired new visibility
 * @param {Array} questionsInTest - Questions assigned to this test
 * @returns {{ allowed: boolean, blockedBy?: Array }}
 */
export function canChangeTestVisibility(currentVisibility, newVisibility, questionsInTest) {
  // Find questions that would become incompatible
  const incompatible = getIncompatibleQuestions(questionsInTest, newVisibility);

  if (incompatible.length > 0) {
    return {
      allowed: false,
      blockedBy: incompatible.map(q => ({ id: q.id, title: q.title, visibility: q.visibility }))
    };
  }

  return { allowed: true };
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- tests/unit/visibility.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/utils/visibility.js backend/tests/unit/visibility.test.js
git commit -m "feat(utils): add visibility matrix utilities"
```

---

## Task 7: Update Tests Routes - Add Visibility and Random Slug

**Files:**
- Modify: `backend/routes/tests.js`

**Step 1: Write integration test for new test creation behavior**

Create test file `backend/tests/api/tests-visibility.test.js`:

```javascript
// backend/tests/api/tests-visibility.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getTestDb, getTestSchema } from '../setup.js';

// This test verifies the visibility and slug generation behavior
describe('Tests API - Visibility and Slugs', () => {
  // Tests will be added here after route implementation
  it('placeholder - routes need to be updated first', () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Update the tests routes**

Replace content of `backend/routes/tests.js`:

```javascript
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateRandomSlug } from '../utils/slug.js';
import { canChangeTestVisibility, getIncompatibleQuestions, canQuestionBeInTest } from '../utils/visibility.js';

const router = express.Router();

// Validation middleware helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Valid visibility values
const VALID_VISIBILITIES = ['public', 'private', 'protected'];

/**
 * Generate a unique slug, retrying if collision occurs
 */
async function generateUniqueSlug() {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const slug = generateRandomSlug();
    const existing = await sql`
      SELECT id FROM ${sql(dbSchema)}.tests WHERE slug = ${slug}
    `;
    if (existing.length === 0) {
      return slug;
    }
  }
  throw new Error('Failed to generate unique slug after maximum attempts');
}

// GET all tests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const allTests = await sql`
      SELECT * FROM ${sql(dbSchema)}.tests
      ORDER BY created_at DESC
    `;
    res.json({ tests: allTests, total: allTests.length });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// GET test by ID (admin view with questions)
router.get('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const tests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests
        WHERE id = ${req.params.id}
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Get questions for this test (with visibility)
      const testQuestionsData = await sql`
        SELECT
          tq.question_id,
          tq.weight,
          q.title,
          q.text,
          q.type,
          q.options,
          q.tags,
          q.visibility
        FROM ${sql(dbSchema)}.test_questions tq
        INNER JOIN ${sql(dbSchema)}.questions q ON tq.question_id = q.id
        WHERE tq.test_id = ${req.params.id}
      `;

      res.json({ ...tests[0], questions: testQuestionsData });
    } catch (error) {
      console.error('Error fetching test:', error);
      res.status(500).json({ error: 'Failed to fetch test' });
    }
  }
);

// GET test by slug (public view)
router.get('/slug/:slug',
  param('slug').notEmpty().withMessage('Slug is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const tests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests
        WHERE slug = ${req.params.slug}
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const test = tests[0];

      // Check if test is enabled
      if (!test.is_enabled) {
        return res.status(403).json({
          error: 'This test is currently disabled and not available.'
        });
      }

      // Check visibility - protected tests require login (v2)
      if (test.visibility === 'protected') {
        return res.status(403).json({
          error: 'Access restricted. This test requires authentication.',
          code: 'PROTECTED_TEST'
        });
      }

      // Count questions
      const questionCountResult = await sql`
        SELECT COUNT(*) as count
        FROM ${sql(dbSchema)}.test_questions
        WHERE test_id = ${test.id}
      `;

      res.json({
        id: test.id,
        title: test.title,
        description: test.description,
        slug: test.slug,
        visibility: test.visibility,
        question_count: parseInt(questionCountResult[0].count)
      });
    } catch (error) {
      console.error('Error fetching test by slug:', error);
      res.status(500).json({ error: 'Failed to fetch test' });
    }
  }
);

// POST create test (slug is auto-generated)
router.post('/',
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required').isString().withMessage('Title must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('visibility').optional().isIn(VALID_VISIBILITIES).withMessage('Visibility must be public, private, or protected'),
  body('is_enabled').optional().isBoolean().withMessage('is_enabled must be a boolean'),
  body('pass_threshold').optional().isInt({ min: 0, max: 100 }).withMessage('pass_threshold must be an integer between 0 and 100'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, visibility = 'private', is_enabled, pass_threshold } = req.body;

      // Generate unique random slug
      const slug = await generateUniqueSlug();

      const newTests = await sql`
        INSERT INTO ${sql(dbSchema)}.tests (title, description, slug, visibility, is_enabled, pass_threshold)
        VALUES (${title}, ${description || null}, ${slug}, ${visibility}, ${is_enabled ?? false}, ${pass_threshold ?? 0})
        RETURNING *
      `;

      res.status(201).json(newTests[0]);
    } catch (error) {
      console.error('Error creating test:', error);
      res.status(500).json({ error: 'Failed to create test' });
    }
  }
);

// PUT update test
router.put('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  body('title').notEmpty().withMessage('Title is required').isString().withMessage('Title must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('visibility').optional().isIn(VALID_VISIBILITIES).withMessage('Visibility must be public, private, or protected'),
  body('is_enabled').optional().isBoolean().withMessage('is_enabled must be a boolean'),
  body('pass_threshold').optional().isInt({ min: 0, max: 100 }).withMessage('pass_threshold must be an integer between 0 and 100'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, visibility, is_enabled, pass_threshold } = req.body;

      // Get current test
      const currentTests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests WHERE id = ${req.params.id}
      `;

      if (currentTests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const currentTest = currentTests[0];

      // If visibility is changing, check compatibility with existing questions
      if (visibility && visibility !== currentTest.visibility) {
        const questionsInTest = await sql`
          SELECT q.id, q.title, q.visibility
          FROM ${sql(dbSchema)}.test_questions tq
          INNER JOIN ${sql(dbSchema)}.questions q ON tq.question_id = q.id
          WHERE tq.test_id = ${req.params.id}
        `;

        const canChange = canChangeTestVisibility(currentTest.visibility, visibility, questionsInTest);

        if (!canChange.allowed) {
          const questionTitles = canChange.blockedBy.map(q => q.title).join(', ');
          return res.status(400).json({
            error: `Cannot change test to ${visibility}: it contains incompatible questions: ${questionTitles}`,
            blockedBy: canChange.blockedBy
          });
        }
      }

      const updatedTests = await sql`
        UPDATE ${sql(dbSchema)}.tests
        SET
          title = ${title},
          description = ${description},
          visibility = ${visibility || currentTest.visibility},
          is_enabled = ${is_enabled !== undefined ? is_enabled : currentTest.is_enabled},
          pass_threshold = ${pass_threshold !== undefined ? pass_threshold : currentTest.pass_threshold},
          updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      res.json(updatedTests[0]);
    } catch (error) {
      console.error('Error updating test:', error);
      res.status(500).json({ error: 'Failed to update test' });
    }
  }
);

// POST regenerate test slug
router.post('/:id/regenerate-slug',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      // Verify test exists
      const tests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests WHERE id = ${req.params.id}
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const oldSlug = tests[0].slug;

      // Generate new unique slug
      const newSlug = await generateUniqueSlug();

      // Update test
      const updatedTests = await sql`
        UPDATE ${sql(dbSchema)}.tests
        SET slug = ${newSlug}, updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      res.json({
        message: 'Slug regenerated successfully',
        old_slug: oldSlug,
        new_slug: newSlug,
        test: updatedTests[0]
      });
    } catch (error) {
      console.error('Error regenerating slug:', error);
      res.status(500).json({ error: 'Failed to regenerate slug' });
    }
  }
);

// DELETE test
router.delete('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const deletedTests = await sql`
        DELETE FROM ${sql(dbSchema)}.tests
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      if (deletedTests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      res.json({ message: 'Test deleted successfully', id: req.params.id });
    } catch (error) {
      console.error('Error deleting test:', error);
      res.status(500).json({ error: 'Failed to delete test' });
    }
  }
);

// GET questions for a specific test with weights
router.get('/:testId/questions',
  authenticateToken,
  param('testId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const questions = await sql`
        SELECT
          q.*,
          tq.weight
        FROM ${sql(dbSchema)}.test_questions tq
        JOIN ${sql(dbSchema)}.questions q ON q.id = tq.question_id
        WHERE tq.test_id = ${req.params.testId}
        ORDER BY q.created_at ASC
      `;

      res.json({ questions });
    } catch (error) {
      console.error('Error fetching test questions:', error);
      res.status(500).json({ error: 'Failed to fetch test questions' });
    }
  }
);

// POST add questions to test (with visibility check)
router.post('/:id/questions',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  body('questions').isArray({ min: 1 }).withMessage('Questions must be a non-empty array'),
  body('questions.*.question_id').isUUID().withMessage('Each question_id must be a valid UUID'),
  body('questions.*.weight').optional().isInt({ min: 1 }).withMessage('Weight must be a positive integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { questions } = req.body;

      // Get test with visibility
      const tests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests
        WHERE id = ${req.params.id}
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const test = tests[0];

      // Get questions to check visibility
      const questionIds = questions.map(q => q.question_id);
      const questionDetails = await sql`
        SELECT id, title, visibility
        FROM ${sql(dbSchema)}.questions
        WHERE id = ANY(${questionIds})
      `;

      // Check visibility compatibility
      const incompatible = questionDetails.filter(q =>
        !canQuestionBeInTest(q.visibility, test.visibility)
      );

      if (incompatible.length > 0) {
        const questionTitles = incompatible.map(q => q.title).join(', ');
        return res.status(400).json({
          error: `Cannot add questions to ${test.visibility} test: incompatible visibility for: ${questionTitles}`,
          incompatible: incompatible.map(q => ({ id: q.id, title: q.title, visibility: q.visibility }))
        });
      }

      // Build values array for bulk insert
      const values = questions.map(q => ({
        test_id: req.params.id,
        question_id: q.question_id,
        weight: q.weight || 1
      }));

      // Insert all questions
      const inserted = await sql`
        INSERT INTO ${sql(dbSchema)}.test_questions ${sql(values, 'test_id', 'question_id', 'weight')}
        RETURNING *
      `;

      res.json({ message: 'Questions added successfully', added: inserted.length });
    } catch (error) {
      // Check for foreign key constraint violation
      if (error.code === '23503') {
        return res.status(404).json({ error: 'One or more question IDs not found' });
      }
      console.error('Error adding questions to test:', error);
      res.status(500).json({ error: 'Failed to add questions to test' });
    }
  }
);

// DELETE remove question from test
router.delete('/:testId/questions/:questionId',
  authenticateToken,
  param('testId').isUUID(),
  param('questionId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      await sql`
        DELETE FROM ${sql(dbSchema)}.test_questions
        WHERE test_id = ${req.params.testId}
        AND question_id = ${req.params.questionId}
      `;

      res.json({ message: 'Question removed from test' });
    } catch (error) {
      console.error('Error removing question from test:', error);
      res.status(500).json({ error: 'Failed to remove question from test' });
    }
  }
);

export default router;
```

**Step 3: Run existing tests to verify nothing is broken**

Run: `cd backend && npm test`
Expected: All tests pass (or expected failures for new behavior)

**Step 4: Commit**

```bash
git add backend/routes/tests.js backend/tests/api/tests-visibility.test.js
git commit -m "feat(api): add visibility and random slug support to tests routes"
```

---

## Task 8: Update Questions Routes - Add Title, Author, Visibility

**Files:**
- Modify: `backend/routes/questions.js`

**Step 1: Read current questions routes**

Read the file to understand current structure before modifying.

**Step 2: Update the questions routes**

Update `backend/routes/questions.js` to include title, author_id, and visibility:

```javascript
import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { canChangeQuestionVisibility } from '../utils/visibility.js';

const router = express.Router();

// Validation middleware helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Valid visibility values
const VALID_VISIBILITIES = ['public', 'private', 'protected'];

// GET all questions (with optional filters)
router.get('/',
  authenticateToken,
  query('author_id').optional().isUUID().withMessage('author_id must be a valid UUID'),
  query('visibility').optional().isIn(VALID_VISIBILITIES).withMessage('Invalid visibility value'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { author_id, visibility } = req.query;

      let questions;

      if (author_id && visibility) {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.author_id = ${author_id} AND q.visibility = ${visibility}
          ORDER BY q.created_at DESC
        `;
      } else if (author_id) {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.author_id = ${author_id}
          ORDER BY q.created_at DESC
        `;
      } else if (visibility) {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.visibility = ${visibility}
          ORDER BY q.created_at DESC
        `;
      } else {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          ORDER BY q.created_at DESC
        `;
      }

      res.json({ questions, total: questions.length });
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }
);

// GET all authors (for filter dropdown)
router.get('/authors',
  authenticateToken,
  async (req, res) => {
    try {
      const authors = await sql`
        SELECT DISTINCT u.id, u.username
        FROM ${sql(dbSchema)}.users u
        INNER JOIN ${sql(dbSchema)}.questions q ON q.author_id = u.id
        ORDER BY u.username
      `;
      res.json({ authors });
    } catch (error) {
      console.error('Error fetching authors:', error);
      res.status(500).json({ error: 'Failed to fetch authors' });
    }
  }
);

// GET single question by ID
router.get('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const questions = await sql`
        SELECT q.*, u.username as author_username
        FROM ${sql(dbSchema)}.questions q
        LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
        WHERE q.id = ${req.params.id}
      `;

      if (questions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json(questions[0]);
    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ error: 'Failed to fetch question' });
    }
  }
);

// POST create question
router.post('/',
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required').isString().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('text').notEmpty().withMessage('Text is required').isString().withMessage('Text must be a string'),
  body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
  body('visibility').optional().isIn(VALID_VISIBILITIES).withMessage('Visibility must be public, private, or protected'),
  body('options').isArray({ min: 2, max: 10 }).withMessage('Options must be an array with 2-10 items'),
  body('options.*').isString().withMessage('Each option must be a string'),
  body('correct_answers').isArray({ min: 1 }).withMessage('Correct answers must be a non-empty array'),
  body('correct_answers.*').isString().withMessage('Each correct answer must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, text, type, visibility = 'private', options, correct_answers, tags } = req.body;

      // Validate correct_answers are in options
      const invalidAnswers = correct_answers.filter(ans => !options.includes(ans));
      if (invalidAnswers.length > 0) {
        return res.status(400).json({
          error: `Correct answers must be in options. Invalid: ${invalidAnswers.join(', ')}`
        });
      }

      // Get author_id from authenticated user
      const author_id = req.user.id;

      const newQuestions = await sql`
        INSERT INTO ${sql(dbSchema)}.questions (title, text, type, visibility, options, correct_answers, tags, author_id)
        VALUES (${title}, ${text}, ${type}, ${visibility}, ${options}, ${correct_answers}, ${tags || []}, ${author_id})
        RETURNING *
      `;

      res.status(201).json(newQuestions[0]);
    } catch (error) {
      // Check for unique constraint violation (author_id, title)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You already have a question with this title' });
      }
      console.error('Error creating question:', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }
);

// PUT update question
router.put('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  body('title').notEmpty().withMessage('Title is required').isString().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('text').notEmpty().withMessage('Text is required').isString().withMessage('Text must be a string'),
  body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
  body('visibility').optional().isIn(VALID_VISIBILITIES).withMessage('Visibility must be public, private, or protected'),
  body('options').isArray({ min: 2, max: 10 }).withMessage('Options must be an array with 2-10 items'),
  body('options.*').isString().withMessage('Each option must be a string'),
  body('correct_answers').isArray({ min: 1 }).withMessage('Correct answers must be a non-empty array'),
  body('correct_answers.*').isString().withMessage('Each correct answer must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, text, type, visibility, options, correct_answers, tags } = req.body;

      // Validate correct_answers are in options
      const invalidAnswers = correct_answers.filter(ans => !options.includes(ans));
      if (invalidAnswers.length > 0) {
        return res.status(400).json({
          error: `Correct answers must be in options. Invalid: ${invalidAnswers.join(', ')}`
        });
      }

      // Get current question
      const currentQuestions = await sql`
        SELECT * FROM ${sql(dbSchema)}.questions WHERE id = ${req.params.id}
      `;

      if (currentQuestions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      const currentQuestion = currentQuestions[0];

      // If visibility is changing, check compatibility with tests using this question
      if (visibility && visibility !== currentQuestion.visibility) {
        const testsUsingQuestion = await sql`
          SELECT t.id, t.title, t.visibility
          FROM ${sql(dbSchema)}.test_questions tq
          INNER JOIN ${sql(dbSchema)}.tests t ON tq.test_id = t.id
          WHERE tq.question_id = ${req.params.id}
        `;

        const canChange = canChangeQuestionVisibility(currentQuestion.visibility, visibility, testsUsingQuestion);

        if (!canChange.allowed) {
          const testTitles = canChange.blockedBy.map(t => t.title).join(', ');
          return res.status(400).json({
            error: `Cannot change question to ${visibility}: it is used in incompatible tests: ${testTitles}`,
            blockedBy: canChange.blockedBy
          });
        }
      }

      const updatedQuestions = await sql`
        UPDATE ${sql(dbSchema)}.questions
        SET
          title = ${title},
          text = ${text},
          type = ${type},
          visibility = ${visibility || currentQuestion.visibility},
          options = ${options},
          correct_answers = ${correct_answers},
          tags = ${tags || []},
          updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      res.json(updatedQuestions[0]);
    } catch (error) {
      // Check for unique constraint violation (author_id, title)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You already have a question with this title' });
      }
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }
);

// DELETE question
router.delete('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const deletedQuestions = await sql`
        DELETE FROM ${sql(dbSchema)}.questions
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      if (deletedQuestions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json({ message: 'Question deleted successfully', id: req.params.id });
    } catch (error) {
      // Check for foreign key constraint violation (question used in test)
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Cannot delete question: it is used in one or more tests' });
      }
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
);

export default router;
```

**Step 3: Run tests**

Run: `cd backend && npm test`
Expected: Tests pass

**Step 4: Commit**

```bash
git add backend/routes/questions.js
git commit -m "feat(api): add title, author, visibility support to questions routes"
```

---

## Task 9: Update Import Routes - Add Title and Visibility

**Files:**
- Modify: `backend/routes/import.js`

**Step 1: Update the import route to require title and support visibility**

```javascript
import express from 'express';
import multer from 'multer';
import yaml from 'js-yaml';
import { sql, dbSchema } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept only .yaml and .yml files
    if (file.mimetype === 'application/x-yaml' ||
        file.mimetype === 'text/yaml' ||
        file.originalname.endsWith('.yaml') ||
        file.originalname.endsWith('.yml')) {
      cb(null, true);
    } else {
      cb(new Error('Only YAML files (.yaml or .yml) are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Valid visibility values
const VALID_VISIBILITIES = ['public', 'private', 'protected'];

// POST /api/questions/import
router.post('/import', authenticateToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'Only YAML files (.yaml or .yml) are allowed') {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }
      return res.status(400).json({ error: 'File upload failed', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get author_id from authenticated user
    const author_id = req.user.id;

    // Parse YAML
    let parsedData;
    try {
      const fileContent = req.file.buffer.toString('utf8');
      parsedData = yaml.load(fileContent);
    } catch (yamlError) {
      return res.status(400).json({
        error: 'Invalid YAML format',
        details: yamlError.message
      });
    }

    // Validate structure
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return res.status(400).json({
        error: 'YAML must contain an array of questions'
      });
    }

    // Validate each question
    const errors = [];
    const validQuestions = [];
    const titlesInBatch = new Set();

    parsedData.forEach((q, index) => {
      const questionNum = index + 1;
      const errs = [];

      // Required: title
      if (!q.title || typeof q.title !== 'string') {
        errs.push(`Question ${questionNum}: 'title' is required and must be a string`);
      } else if (q.title.length > 200) {
        errs.push(`Question ${questionNum}: 'title' must be 200 characters or less`);
      } else if (titlesInBatch.has(q.title.toLowerCase())) {
        errs.push(`Question ${questionNum}: duplicate 'title' in this import batch: "${q.title}"`);
      } else {
        titlesInBatch.add(q.title.toLowerCase());
      }

      // Required: text
      if (!q.text || typeof q.text !== 'string') {
        errs.push(`Question ${questionNum}: 'text' is required and must be a string`);
      }

      // Required: type
      if (!q.type || !['SINGLE', 'MULTIPLE'].includes(q.type)) {
        errs.push(`Question ${questionNum}: 'type' must be either 'SINGLE' or 'MULTIPLE'`);
      }

      // Optional: visibility
      if (q.visibility && !VALID_VISIBILITIES.includes(q.visibility)) {
        errs.push(`Question ${questionNum}: 'visibility' must be 'public', 'private', or 'protected'`);
      }

      // Required: options
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errs.push(`Question ${questionNum}: 'options' must be an array with at least 2 items`);
      } else {
        // Validate all options are strings
        const invalidOptions = q.options.filter(opt => typeof opt !== 'string');
        if (invalidOptions.length > 0) {
          errs.push(`Question ${questionNum}: all 'options' must be strings`);
        }
      }

      // Required: correct_answers
      if (!Array.isArray(q.correct_answers) || q.correct_answers.length === 0) {
        errs.push(`Question ${questionNum}: 'correct_answers' must be a non-empty array`);
      } else {
        // Validate all correct_answers are strings
        const invalidAnswers = q.correct_answers.filter(ans => typeof ans !== 'string');
        if (invalidAnswers.length > 0) {
          errs.push(`Question ${questionNum}: all 'correct_answers' must be strings`);
        }
        // Validate correct_answers are in options
        if (Array.isArray(q.options)) {
          const invalidCorrectAnswers = q.correct_answers.filter(ans => !q.options.includes(ans));
          if (invalidCorrectAnswers.length > 0) {
            errs.push(`Question ${questionNum}: 'correct_answers' must match items in 'options'. Invalid: ${invalidCorrectAnswers.join(', ')}`);
          }
        }
      }

      // Optional fields validation
      if (q.tags && !Array.isArray(q.tags)) {
        errs.push(`Question ${questionNum}: 'tags' must be an array if provided`);
      } else if (q.tags) {
        const invalidTags = q.tags.filter(tag => typeof tag !== 'string');
        if (invalidTags.length > 0) {
          errs.push(`Question ${questionNum}: all 'tags' must be strings`);
        }
      }

      if (errs.length > 0) {
        errors.push(...errs);
      } else {
        validQuestions.push({
          title: q.title.trim(),
          text: q.text.trim(),
          type: q.type,
          visibility: q.visibility || 'private',
          options: q.options,
          correct_answers: q.correct_answers,
          tags: q.tags || [],
          author_id
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        valid_count: validQuestions.length,
        invalid_count: parsedData.length - validQuestions.length
      });
    }

    // Bulk insert (transactional)
    const inserted = await sql.begin(async sql => {
      const results = [];
      for (const question of validQuestions) {
        const [insertedQuestion] = await sql`
          INSERT INTO ${sql(dbSchema)}.questions (title, text, type, visibility, options, correct_answers, tags, author_id)
          VALUES (${question.title}, ${question.text}, ${question.type}, ${question.visibility}, ${question.options}, ${question.correct_answers}, ${question.tags}, ${question.author_id})
          RETURNING *
        `;
        results.push(insertedQuestion);
      }
      return results;
    });

    res.status(201).json({
      message: 'Questions imported successfully',
      imported_count: inserted.length,
      questions: inserted
    });

  } catch (error) {
    // Check for unique constraint violation (author_id, title)
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Import failed: one or more question titles already exist for this author'
      });
    }
    console.error('Error importing questions:', error);
    res.status(500).json({ error: 'Failed to import questions' });
  }
});

export default router;
```

**Step 2: Run tests**

Run: `cd backend && npm test`
Expected: Tests pass

**Step 3: Commit**

```bash
git add backend/routes/import.js
git commit -m "feat(api): add title and visibility support to YAML import"
```

---

## Task 10: Update Assessments Route - Store access_slug

**Files:**
- Modify: `backend/routes/assessments.js`

**Step 1: Update the start assessment endpoint to store access_slug**

In `backend/routes/assessments.js`, find the `POST /start` endpoint and update the INSERT to include `access_slug`:

Find this section:
```javascript
// Create assessment
const assessments = await sql`
  INSERT INTO ${sql(dbSchema)}.assessments (test_id, candidate_name, status)
  VALUES (${test_id}, ${candidate_name}, 'STARTED')
  RETURNING *
`;
```

Replace with:
```javascript
// Create assessment with access_slug
const assessments = await sql`
  INSERT INTO ${sql(dbSchema)}.assessments (test_id, candidate_name, status, access_slug)
  VALUES (${test_id}, ${candidate_name}, 'STARTED', ${test.slug})
  RETURNING *
`;
```

**Step 2: Run tests**

Run: `cd backend && npm test`
Expected: Tests pass

**Step 3: Commit**

```bash
git add backend/routes/assessments.js
git commit -m "feat(api): store access_slug when starting assessment"
```

---

## Task 11: Update YAML Example File

**Files:**
- Modify: `frontend/public/questions-example.yaml`

**Step 1: Update the example YAML to include title and visibility**

```yaml
# Example Questions YAML File
# Use this template to bulk import questions into Clever Badge
#
# YAML Format Guidelines:
# - Root element must be an array (list) of questions
# - Each question is an object with required fields
# - title: Short identifier for the question (1-200 characters, required, must be unique per author)
# - text: The full question text (can include markdown)
# - type: Either "SINGLE" or "MULTIPLE"
# - visibility: "public", "private" (default), or "protected"
#   - public: Can be used in any test
#   - private: Can only be used in private or protected tests
#   - protected: Can only be used in protected tests
# - options: Array of 2-10 answer choices
# - correct_answers: Array containing the correct answer(s)
# - tags: Optional array of tags for organization

# Example 1: Single choice question (public)
- title: "Capital of France"
  text: "What is the capital of France?"
  type: "SINGLE"
  visibility: "public"
  options:
    - "London"
    - "Paris"
    - "Berlin"
    - "Madrid"
  correct_answers:
    - "Paris"
  tags:
    - "geography"
    - "europe"

# Example 2: Multiple choice question (private - default)
- title: "Programming Languages"
  text: "Which of the following are programming languages? (Select all that apply)"
  type: "MULTIPLE"
  options:
    - "Python"
    - "HTML"
    - "JavaScript"
    - "CSS"
    - "SQL"
  correct_answers:
    - "Python"
    - "JavaScript"
    - "SQL"
  tags:
    - "programming"
    - "computer-science"

# Example 3: JavaScript question (private)
- title: "typeof null"
  text: "What is the output of: console.log(typeof null)?"
  type: "SINGLE"
  visibility: "private"
  options:
    - "null"
    - "undefined"
    - "object"
    - "number"
  correct_answers:
    - "object"
  tags:
    - "javascript"
    - "fundamentals"

# Example 4: Protected question (only for protected tests)
- title: "HTTP Methods"
  text: "Which of the following are valid HTTP methods?"
  type: "MULTIPLE"
  visibility: "protected"
  options:
    - "GET"
    - "RECEIVE"
    - "POST"
    - "SEND"
    - "DELETE"
    - "REMOVE"
  correct_answers:
    - "GET"
    - "POST"
    - "DELETE"
  tags:
    - "http"
    - "web-development"

# Example 5: Question without tags (defaults to private visibility)
- title: "CSS Acronym"
  text: "What does CSS stand for?"
  type: "SINGLE"
  options:
    - "Creative Style Sheets"
    - "Cascading Style Sheets"
    - "Computer Style Sheets"
    - "Colorful Style Sheets"
  correct_answers:
    - "Cascading Style Sheets"

# Example 6: Complex multiple choice with markdown
- title: "React Truths"
  text: |
    Which of the following statements about **React** are true?

    Consider the core features of the library.
  type: "MULTIPLE"
  visibility: "public"
  options:
    - "React is a JavaScript library for building user interfaces"
    - "React was developed by Facebook"
    - "React uses a virtual DOM"
    - "React can only be used for web applications"
    - "React components can be written as functions or classes"
  correct_answers:
    - "React is a JavaScript library for building user interfaces"
    - "React was developed by Facebook"
    - "React uses a virtual DOM"
    - "React components can be written as functions or classes"
  tags:
    - "react"
    - "javascript"
    - "frontend"

# Example 7: Database question
- title: "SQL WHERE Clause"
  text: "In SQL, which clause is used to filter records?"
  type: "SINGLE"
  visibility: "private"
  options:
    - "SELECT"
    - "WHERE"
    - "FROM"
    - "FILTER"
  correct_answers:
    - "WHERE"
  tags:
    - "sql"
    - "database"

# Example 8: Git question
- title: "Git Save Commands"
  text: "Which Git commands are used to save changes? (Select all that apply)"
  type: "MULTIPLE"
  visibility: "public"
  options:
    - "git add"
    - "git save"
    - "git commit"
    - "git push"
    - "git store"
  correct_answers:
    - "git add"
    - "git commit"
  tags:
    - "git"
    - "version-control"
```

**Step 2: Commit**

```bash
git add frontend/public/questions-example.yaml
git commit -m "docs: update YAML example with title and visibility fields"
```

---

## Task 12: Update Frontend TestForm Component

**Files:**
- Modify: `frontend/src/pages/admin/TestForm.jsx`

**Step 1: Update TestForm to remove slug input and add visibility dropdown**

```javascript
import React, { useState, useEffect } from 'react';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const TestForm = ({ test, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'private',
    is_enabled: false,
    pass_threshold: 0
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (test) {
      setFormData({
        title: test.title || '',
        description: test.description || '',
        visibility: test.visibility || 'private',
        is_enabled: test.is_enabled || false,
        pass_threshold: test.pass_threshold ?? 0
      });
    }
  }, [test]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    const threshold = parseInt(formData.pass_threshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      newErrors.pass_threshold = 'Pass threshold must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      // Handle specific errors
      if (error.message.includes('incompatible questions')) {
        setErrors({ visibility: error.message });
      } else {
        setErrors({ general: error.message || 'Failed to save test' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibilityOptions = [
    { value: 'public', label: 'Public - Will be listed on home page (v2)' },
    { value: 'private', label: 'Private - Accessible via link only' },
    { value: 'protected', label: 'Protected - Requires login (v2)' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.general}
        </div>
      )}

      <Input
        label="Title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        error={errors.title}
        required
        placeholder="e.g., JavaScript Fundamentals"
      />

      <Textarea
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        error={errors.description}
        rows={3}
        placeholder="Brief description of the test..."
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Visibility
        </label>
        <select
          name="visibility"
          value={formData.visibility}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
            errors.visibility ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          {visibilityOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {errors.visibility && (
          <p className="mt-1 text-sm text-red-600">{errors.visibility}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {formData.visibility === 'protected' && 'Protected tests show "Access restricted" until login is implemented.'}
        </p>
      </div>

      <Input
        label="Pass Threshold (%)"
        name="pass_threshold"
        type="number"
        min="0"
        max="100"
        value={formData.pass_threshold}
        onChange={handleChange}
        error={errors.pass_threshold}
        placeholder="0"
        help="Set to 0 for neutral scoring (no pass/fail). Set to 1-100 to show pass/fail based on score."
      />

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_enabled"
          name="is_enabled"
          checked={formData.is_enabled}
          onChange={handleChange}
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <label htmlFor="is_enabled" className="ml-2 block text-sm text-gray-700">
          Enable test (allow candidates to take it)
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
        >
          {test ? 'Update Test' : 'Create Test'}
        </Button>
      </div>
    </form>
  );
};

export default TestForm;
```

**Step 2: Run frontend tests**

Run: `cd frontend && npm test`
Expected: Tests pass

**Step 3: Commit**

```bash
git add frontend/src/pages/admin/TestForm.jsx
git commit -m "feat(ui): update TestForm with visibility dropdown, remove slug input"
```

---

## Task 13: Update Frontend TestsTab - Add Slug Display and Regenerate

**Files:**
- Modify: `frontend/src/pages/admin/TestsTab.jsx` (or wherever tests are listed)

**Step 1: Read the current TestsTab file to understand its structure**

**Step 2: Add slug display with copy button and regenerate functionality**

Add to the test list item display:
- Show slug with a "Copy Link" button
- Add "Regenerate Link" button that opens a confirmation modal
- Show visibility badge

**Step 3: Add regenerate confirmation modal**

The modal should warn: "Regenerating the link will make the current link invalid. Candidates with the old link will no longer be able to access this test."

**Step 4: Implement the regenerate API call**

```javascript
const handleRegenerateSlug = async (testId) => {
  try {
    const result = await apiRequest(`/api/tests/${testId}/regenerate-slug`, {
      method: 'POST'
    });
    showSuccess(`Link regenerated successfully. New link: ${result.new_slug}`);
    loadTests();
  } catch (error) {
    showError(error.message || 'Failed to regenerate link');
  }
};
```

**Step 5: Run frontend tests**

Run: `cd frontend && npm test`
Expected: Tests pass

**Step 6: Commit**

```bash
git add frontend/src/pages/admin/TestsTab.jsx
git commit -m "feat(ui): add slug display, copy link, and regenerate functionality"
```

---

## Task 14: Update Frontend QuestionsTab - Add Title, Author, Visibility

**Files:**
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx`

**Step 1: Update the questions list to show title as primary identifier**

**Step 2: Add author filter dropdown**

Fetch authors from `/api/questions/authors` and add a filter dropdown.

**Step 3: Add visibility filter and badge**

Show visibility badge with color coding:
- public: green
- private: blue
- protected: yellow/orange

**Step 4: Run frontend tests**

Run: `cd frontend && npm test`
Expected: Tests pass

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat(ui): add title, author filter, and visibility to questions list"
```

---

## Task 15: Update Frontend QuestionForm - Add Title and Visibility

**Files:**
- Modify: `frontend/src/pages/admin/QuestionForm.jsx`

**Step 1: Add title field (required)**

**Step 2: Add visibility dropdown**

**Step 3: Run frontend tests**

Run: `cd frontend && npm test`
Expected: Tests pass

**Step 4: Commit**

```bash
git add frontend/src/pages/admin/QuestionForm.jsx
git commit -m "feat(ui): add title and visibility fields to QuestionForm"
```

---

## Task 16: Update ManageTestQuestions - Filter by Visibility Compatibility

**Files:**
- Modify: `frontend/src/pages/admin/ManageTestQuestions.jsx`

**Step 1: Filter available questions by visibility compatibility**

When displaying questions to add to a test, only show questions that are compatible with the test's visibility level.

**Step 2: Show visibility badge on questions**

**Step 3: Run frontend tests**

Run: `cd frontend && npm test`
Expected: Tests pass

**Step 4: Commit**

```bash
git add frontend/src/pages/admin/ManageTestQuestions.jsx
git commit -m "feat(ui): filter questions by visibility compatibility in test management"
```

---

## Task 17: Update TestLanding - Handle Protected Tests

**Files:**
- Modify: `frontend/src/pages/TestLanding.jsx`

**Step 1: Handle the PROTECTED_TEST error code**

When the API returns `code: 'PROTECTED_TEST'`, show a friendly "Access Restricted" message instead of a generic error.

**Step 2: Run E2E tests**

Run: `cd frontend && npm run test:e2e -- --reporter=line`
Expected: Tests pass

**Step 3: Commit**

```bash
git add frontend/src/pages/TestLanding.jsx
git commit -m "feat(ui): show friendly message for protected tests"
```

---

## Task 18: Update Backend Test Setup for New Schema

**Files:**
- Modify: `backend/tests/setup.js`

**Step 1: Update test setup to run all migrations including new ones**

The setup should now run migrations 003, 004, 005, 006 in addition to 001, 002.

**Step 2: Update seed data to include title, author_id, visibility**

**Step 3: Run all backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add backend/tests/setup.js
git commit -m "test: update test setup for new schema columns"
```

---

## Task 19: Write Integration Tests for Visibility Matrix

**Files:**
- Create: `backend/tests/integration/visibility.test.js`

**Step 1: Write tests for visibility enforcement**

```javascript
import { describe, it, expect } from 'vitest';
import { getTestDb, getTestSchema } from '../setup.js';

describe('Visibility Matrix Integration', () => {
  const sql = getTestDb();
  const schema = getTestSchema();

  it('should prevent adding private question to public test', async () => {
    // Test implementation
  });

  it('should prevent changing test to public if it has private questions', async () => {
    // Test implementation
  });

  it('should allow adding public question to any test', async () => {
    // Test implementation
  });
});
```

**Step 2: Run tests**

Run: `cd backend && npm test -- tests/integration/visibility.test.js`
Expected: All tests pass

**Step 3: Commit**

```bash
git add backend/tests/integration/visibility.test.js
git commit -m "test: add integration tests for visibility matrix"
```

---

## Task 20: Write E2E Tests for New Features

**Files:**
- Create: `frontend/tests/e2e/visibility.spec.js`

**Step 1: Write E2E tests for visibility features**

```javascript
import { test, expect } from '@playwright/test';

test.describe('Test Visibility', () => {
  test('should create test with random slug', async ({ page }) => {
    // Login as admin
    // Create new test
    // Verify slug is auto-generated (8 chars, alphanumeric)
  });

  test('should regenerate test slug with warning', async ({ page }) => {
    // Navigate to test details
    // Click regenerate
    // Verify warning modal appears
    // Confirm regeneration
    // Verify new slug
  });

  test('should block access to protected tests', async ({ page }) => {
    // Try to access protected test
    // Verify "Access restricted" message
  });
});
```

**Step 2: Run E2E tests**

Run: `cd frontend && npm run test:e2e -- --reporter=line`
Expected: All tests pass

**Step 3: Commit**

```bash
git add frontend/tests/e2e/visibility.spec.js
git commit -m "test: add E2E tests for visibility features"
```

---

## Task 21: Update Documentation

**Files:**
- Modify: `docs/DATABASE.md`
- Modify: `docs/API.md`

**Step 1: Update DATABASE.md with new columns**

Add documentation for:
- `visibility_type` enum
- New columns on `questions`, `tests`, `assessments`
- Visibility matrix explanation

**Step 2: Update API.md with new endpoints and fields**

Document:
- `POST /api/tests/:id/regenerate-slug`
- `GET /api/questions/authors`
- New `visibility` field on tests and questions
- New `title` and `author_id` fields on questions

**Step 3: Commit**

```bash
git add docs/DATABASE.md docs/API.md
git commit -m "docs: update documentation for visibility and title features"
```

---

## Task 22: Update Package Versions

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

**Step 1: Increment minor version (new features)**

Backend: Increment from current to next minor version
Frontend: Increment from current to next minor version

**Step 2: Commit**

```bash
git add backend/package.json frontend/package.json
git commit -m "chore: bump version for visibility and title features"
```

---

## Task 23: Final Verification

**Step 1: Run all backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 2: Run all frontend tests**

Run: `cd frontend && npm test`
Expected: All tests pass

**Step 3: Run E2E tests**

Run: `cd frontend && npm run test:e2e -- --reporter=line`
Expected: All tests pass

**Step 4: Manual smoke test**

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Login to admin
4. Create a new test - verify random slug generated
5. Create a new question with title and visibility
6. Import questions via YAML with title and visibility
7. Try changing test visibility - verify matrix enforcement
8. Regenerate test slug - verify warning and new slug
9. Access protected test as candidate - verify "Access restricted"

**Step 5: Final commit if any fixes needed**

---

## Summary

This plan implements:

1. **Database migrations** (Tasks 1-4): Add `visibility_type` enum, `visibility` column to tests and questions, `access_slug` to assessments, `title` and `author_id` to questions

2. **Backend utilities** (Tasks 5-6): Slug generation and visibility matrix enforcement

3. **Backend API updates** (Tasks 7-10): Tests routes with visibility and random slugs, questions routes with title/author/visibility, import routes, assessments with access_slug

4. **Frontend updates** (Tasks 11-17): Updated forms, list views, filters, and protected test handling

5. **Testing** (Tasks 18-20): Unit tests, integration tests, and E2E tests

6. **Documentation** (Tasks 21-22): Updated docs and version bump

Total: 23 tasks, each with clear steps and verification.

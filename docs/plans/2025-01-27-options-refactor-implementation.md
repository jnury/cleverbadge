# Options Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor question options to support answer randomization, embedded correctness with explanations, configurable feedback visibility, LocalStorage persistence, and admin test preview.

**Architecture:** Store options as dict with stable integer keys, each containing text/is_correct/explanation. Remove correct_answers column. Add test-level settings for feedback visibility. Secure /details endpoint. Add LocalStorage for assessment persistence and modal-based test preview.

**Tech Stack:** Node.js/Express, postgres-js, React/Vite, Tailwind CSS, Vitest, Playwright

**Design Document:** `docs/plans/2025-01-27-options-refactor-design.md`

---

## Phase 1: Database Migration

### Task 1.1: Create Migration File

**Files:**
- Create: `backend/db/migrations/009_options_refactor.sql`

**Step 1: Write the migration**

```sql
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
```

**Step 2: Verify migration file syntax**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/backend && cat db/migrations/009_options_refactor.sql`
Expected: File contents displayed without syntax errors

**Step 3: Commit**

```bash
git add backend/db/migrations/009_options_refactor.sql
git commit -m "feat(db): add migration for options refactor

- Add show_explanations enum (never/after_each_question/after_submit)
- Add explanation_scope enum (selected_only/all_answers)
- Add columns to tests table with safe defaults
- Drop correct_answers column from questions"
```

---

## Phase 2: Backend - Utility Functions

### Task 2.1: Create Options Utility

**Files:**
- Create: `backend/utils/options.js`
- Test: `backend/tests/unit/options.test.js`

**Step 1: Write the failing tests**

Create `backend/tests/unit/options.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import {
  convertArrayToDict,
  shuffleOptions,
  stripAnswersFromOptions,
  getCorrectOptionIds,
  validateOptionsFormat
} from '../../utils/options.js';

describe('Options Utility', () => {
  describe('convertArrayToDict', () => {
    it('should convert array of option objects to dict', () => {
      const input = [
        { text: 'London', is_correct: false },
        { text: 'Paris', is_correct: true, explanation: 'Capital of France' },
        { text: 'Berlin', is_correct: false }
      ];
      const result = convertArrayToDict(input);
      expect(result).toEqual({
        '0': { text: 'London', is_correct: false },
        '1': { text: 'Paris', is_correct: true, explanation: 'Capital of France' },
        '2': { text: 'Berlin', is_correct: false }
      });
    });

    it('should handle empty array', () => {
      const result = convertArrayToDict([]);
      expect(result).toEqual({});
    });
  });

  describe('shuffleOptions', () => {
    it('should return array with id and text only', () => {
      const input = {
        '0': { text: 'A', is_correct: true, explanation: 'Correct!' },
        '1': { text: 'B', is_correct: false }
      };
      const result = shuffleOptions(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).not.toHaveProperty('is_correct');
      expect(result[0]).not.toHaveProperty('explanation');
    });

    it('should include all options', () => {
      const input = {
        '0': { text: 'A', is_correct: false },
        '1': { text: 'B', is_correct: true },
        '2': { text: 'C', is_correct: false }
      };
      const result = shuffleOptions(input);
      const ids = result.map(o => o.id).sort();
      expect(ids).toEqual(['0', '1', '2']);
    });
  });

  describe('stripAnswersFromOptions', () => {
    it('should remove is_correct and explanation', () => {
      const input = {
        '0': { text: 'A', is_correct: true, explanation: 'Yes' },
        '1': { text: 'B', is_correct: false }
      };
      const result = stripAnswersFromOptions(input);
      expect(result).toEqual({
        '0': { text: 'A' },
        '1': { text: 'B' }
      });
    });
  });

  describe('getCorrectOptionIds', () => {
    it('should return array of correct option ids', () => {
      const input = {
        '0': { text: 'A', is_correct: false },
        '1': { text: 'B', is_correct: true },
        '2': { text: 'C', is_correct: true }
      };
      const result = getCorrectOptionIds(input);
      expect(result.sort()).toEqual(['1', '2']);
    });

    it('should return empty array if no correct options', () => {
      const input = {
        '0': { text: 'A', is_correct: false }
      };
      const result = getCorrectOptionIds(input);
      expect(result).toEqual([]);
    });
  });

  describe('validateOptionsFormat', () => {
    it('should return valid for correct SINGLE format', () => {
      const options = {
        '0': { text: 'A', is_correct: false },
        '1': { text: 'B', is_correct: true }
      };
      const result = validateOptionsFormat(options, 'SINGLE');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid for SINGLE with multiple correct', () => {
      const options = {
        '0': { text: 'A', is_correct: true },
        '1': { text: 'B', is_correct: true }
      };
      const result = validateOptionsFormat(options, 'SINGLE');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SINGLE type questions must have exactly 1 correct answer');
    });

    it('should return valid for MULTIPLE with multiple correct', () => {
      const options = {
        '0': { text: 'A', is_correct: true },
        '1': { text: 'B', is_correct: true },
        '2': { text: 'C', is_correct: false }
      };
      const result = validateOptionsFormat(options, 'MULTIPLE');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for MULTIPLE with no correct', () => {
      const options = {
        '0': { text: 'A', is_correct: false },
        '1': { text: 'B', is_correct: false }
      };
      const result = validateOptionsFormat(options, 'MULTIPLE');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MULTIPLE type questions must have at least 1 correct answer');
    });

    it('should return invalid for less than 2 options', () => {
      const options = {
        '0': { text: 'A', is_correct: true }
      };
      const result = validateOptionsFormat(options, 'SINGLE');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Questions must have between 2 and 10 options');
    });

    it('should return invalid for missing text', () => {
      const options = {
        '0': { is_correct: true },
        '1': { text: 'B', is_correct: false }
      };
      const result = validateOptionsFormat(options, 'SINGLE');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Option 0 is missing text');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/backend && npm test -- tests/unit/options.test.js`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `backend/utils/options.js`:

```javascript
/**
 * Options utility functions for the new options format
 * Options are stored as: { "0": { text, is_correct, explanation? }, "1": { ... } }
 */

/**
 * Convert array of option objects to dict format
 * @param {Array} options - Array of { text, is_correct, explanation? }
 * @returns {Object} Dict with string keys "0", "1", etc.
 */
export function convertArrayToDict(options) {
  const dict = {};
  options.forEach((opt, index) => {
    dict[String(index)] = { ...opt };
  });
  return dict;
}

/**
 * Shuffle options and return array with id and text only (for candidates)
 * @param {Object} options - Dict format options
 * @returns {Array} Shuffled array of { id, text }
 */
export function shuffleOptions(options) {
  const entries = Object.entries(options).map(([id, opt]) => ({
    id,
    text: opt.text
  }));

  // Fisher-Yates shuffle
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  return entries;
}

/**
 * Strip is_correct and explanation from options (for sending to candidates)
 * @param {Object} options - Dict format options
 * @returns {Object} Dict with only { text } per option
 */
export function stripAnswersFromOptions(options) {
  const stripped = {};
  for (const [id, opt] of Object.entries(options)) {
    stripped[id] = { text: opt.text };
  }
  return stripped;
}

/**
 * Get array of option IDs that are correct
 * @param {Object} options - Dict format options
 * @returns {Array} Array of string IDs
 */
export function getCorrectOptionIds(options) {
  return Object.entries(options)
    .filter(([_, opt]) => opt.is_correct)
    .map(([id]) => id);
}

/**
 * Validate options format and correctness rules
 * @param {Object} options - Dict format options
 * @param {string} type - 'SINGLE' or 'MULTIPLE'
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateOptionsFormat(options, type) {
  const errors = [];
  const entries = Object.entries(options);

  // Check option count
  if (entries.length < 2 || entries.length > 10) {
    errors.push('Questions must have between 2 and 10 options');
  }

  // Check each option has text
  for (const [id, opt] of entries) {
    if (!opt.text || typeof opt.text !== 'string') {
      errors.push(`Option ${id} is missing text`);
    }
    if (typeof opt.is_correct !== 'boolean') {
      errors.push(`Option ${id} is missing is_correct boolean`);
    }
  }

  // Check correct answer count based on type
  const correctCount = entries.filter(([_, opt]) => opt.is_correct).length;

  if (type === 'SINGLE' && correctCount !== 1) {
    errors.push('SINGLE type questions must have exactly 1 correct answer');
  }

  if (type === 'MULTIPLE' && correctCount < 1) {
    errors.push('MULTIPLE type questions must have at least 1 correct answer');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/backend && npm test -- tests/unit/options.test.js`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add backend/utils/options.js backend/tests/unit/options.test.js
git commit -m "feat(utils): add options utility functions

- convertArrayToDict: YAML array to storage format
- shuffleOptions: randomize for candidates
- stripAnswersFromOptions: remove answers for candidates
- getCorrectOptionIds: extract correct answer IDs
- validateOptionsFormat: validate SINGLE/MULTIPLE rules"
```

---

### Task 2.2: Update Scoring Utility

**Files:**
- Modify: `backend/utils/scoring.js`
- Modify: `backend/tests/unit/scoring.test.js`

**Step 1: Update tests for new format**

The scoring function now receives string IDs instead of numeric indices. Update `backend/tests/unit/scoring.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { isAnswerCorrect, calculateScore } from '../../utils/scoring.js';

describe('Scoring Logic', () => {
  describe('isAnswerCorrect - SINGLE choice', () => {
    it('should return true for correct single choice (string IDs)', () => {
      const result = isAnswerCorrect('SINGLE', ['1'], ['1']);
      expect(result).toBe(true);
    });

    it('should return false for incorrect single choice', () => {
      const result = isAnswerCorrect('SINGLE', ['0'], ['1']);
      expect(result).toBe(false);
    });

    it('should return false when multiple selected for single choice', () => {
      const result = isAnswerCorrect('SINGLE', ['0', '1'], ['1']);
      expect(result).toBe(false);
    });
  });

  describe('isAnswerCorrect - MULTIPLE choice', () => {
    it('should return true when all correct options selected', () => {
      const result = isAnswerCorrect('MULTIPLE', ['1', '2'], ['1', '2']);
      expect(result).toBe(true);
    });

    it('should return true regardless of order', () => {
      const result = isAnswerCorrect('MULTIPLE', ['2', '1'], ['1', '2']);
      expect(result).toBe(true);
    });

    it('should return false when missing a correct option', () => {
      const result = isAnswerCorrect('MULTIPLE', ['1'], ['1', '2']);
      expect(result).toBe(false);
    });

    it('should return false when extra incorrect option selected', () => {
      const result = isAnswerCorrect('MULTIPLE', ['1', '2', '3'], ['1', '2']);
      expect(result).toBe(false);
    });
  });

  describe('calculateScore', () => {
    it('should calculate weighted percentage', () => {
      const answers = [
        { isCorrect: true, weight: 2 },
        { isCorrect: false, weight: 1 },
        { isCorrect: true, weight: 1 }
      ];
      // 3 out of 4 points = 75%
      const result = calculateScore(answers);
      expect(result).toBe(75);
    });

    it('should return 0 for all incorrect', () => {
      const answers = [
        { isCorrect: false, weight: 1 },
        { isCorrect: false, weight: 2 }
      ];
      const result = calculateScore(answers);
      expect(result).toBe(0);
    });

    it('should return 100 for all correct', () => {
      const answers = [
        { isCorrect: true, weight: 1 },
        { isCorrect: true, weight: 2 }
      ];
      const result = calculateScore(answers);
      expect(result).toBe(100);
    });

    it('should handle empty array', () => {
      const result = calculateScore([]);
      expect(result).toBe(0);
    });
  });
});
```

**Step 2: Run tests to check current state**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/backend && npm test -- tests/unit/scoring.test.js`
Expected: Some tests may fail due to format change

**Step 3: Update implementation**

Update `backend/utils/scoring.js`:

```javascript
/**
 * Check if a candidate's answer is correct
 * @param {string} type - 'SINGLE' or 'MULTIPLE'
 * @param {Array<string>} selectedOptions - Array of option IDs selected by candidate
 * @param {Array<string>} correctOptions - Array of correct option IDs
 * @returns {boolean}
 */
export function isAnswerCorrect(type, selectedOptions, correctOptions) {
  // Normalize to arrays of strings
  const selected = selectedOptions.map(String).sort();
  const correct = correctOptions.map(String).sort();

  if (type === 'SINGLE') {
    // For single choice, must select exactly one and it must be correct
    return selected.length === 1 && selected[0] === correct[0];
  }

  // For multiple choice, must select exactly the correct options
  if (selected.length !== correct.length) {
    return false;
  }

  return selected.every((val, idx) => val === correct[idx]);
}

/**
 * Calculate weighted score percentage
 * @param {Array<{isCorrect: boolean, weight: number}>} answers
 * @returns {number} Percentage 0-100
 */
export function calculateScore(answers) {
  if (answers.length === 0) return 0;

  const totalWeight = answers.reduce((sum, a) => sum + a.weight, 0);
  const earnedWeight = answers
    .filter(a => a.isCorrect)
    .reduce((sum, a) => sum + a.weight, 0);

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/backend && npm test -- tests/unit/scoring.test.js`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add backend/utils/scoring.js backend/tests/unit/scoring.test.js
git commit -m "refactor(scoring): update for string option IDs

- isAnswerCorrect now compares string IDs instead of numeric indices
- Normalize inputs to strings for consistent comparison
- Update tests for new format"
```

---

## Phase 3: Backend - Routes Update

### Task 3.1: Update Questions Route

**Files:**
- Modify: `backend/routes/questions.js`

**Step 1: Update validation and creation logic**

In `backend/routes/questions.js`, replace the options/correct_answers validation with new format:

Find the POST `/` route (around line 182) and update:

```javascript
// POST create question - NEW VALIDATION
router.post('/',
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required')
    .isString().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('text').notEmpty().withMessage('Text is required')
    .isString().withMessage('Text must be a string'),
  body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
  body('visibility').optional().isIn(['public', 'private', 'protected'])
    .withMessage('Visibility must be public, private, or protected'),
  body('options').isObject().withMessage('Options must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, text, type, options, visibility = 'private', tags = [] } = req.body;
      const author_id = req.user.id;

      // Validate options format
      const { validateOptionsFormat } = await import('../utils/options.js');
      const validation = validateOptionsFormat(options, type);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid options format',
          details: validation.errors
        });
      }

      // Check for duplicate title by same author
      const existing = await sql`
        SELECT id FROM ${sql(dbSchema)}.questions
        WHERE title = ${title} AND author_id = ${author_id} AND is_deleted = false
      `;
      if (existing.length > 0) {
        return res.status(400).json({
          error: 'You already have a question with this title'
        });
      }

      // Insert question (no correct_answers column anymore)
      const questions = await sql`
        INSERT INTO ${sql(dbSchema)}.questions
        (title, text, type, options, visibility, tags, author_id)
        VALUES (${title}, ${text}, ${type}, ${JSON.stringify(options)}, ${visibility}, ${JSON.stringify(tags)}, ${author_id})
        RETURNING *
      `;

      res.status(201).json(questions[0]);
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }
);
```

Also update the PUT `/:id` route similarly for editing.

**Step 2: Update GET routes to not reference correct_answers**

The SELECT statements no longer need to exclude `correct_answers` since the column doesn't exist.

**Step 3: Run backend tests**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/backend && npm test`
Expected: Tests pass (some may need updates)

**Step 4: Commit**

```bash
git add backend/routes/questions.js
git commit -m "refactor(questions): update validation for new options format

- Options now dict with is_correct/explanation per option
- Remove correct_answers validation (column removed)
- Use validateOptionsFormat utility for SINGLE/MULTIPLE rules"
```

---

### Task 3.2: Update Import Route

**Files:**
- Modify: `backend/routes/import.js`

**Step 1: Update YAML parsing logic**

```javascript
// In backend/routes/import.js, update the question processing:

import { convertArrayToDict, validateOptionsFormat } from '../utils/options.js';

// Inside the POST /import handler, replace options processing:

// Parse and validate each question
const processedQuestions = [];
const errors = [];

for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  const questionErrors = [];

  // Required fields
  if (!q.title || typeof q.title !== 'string') {
    questionErrors.push('title is required and must be a string');
  }
  if (!q.text || typeof q.text !== 'string') {
    questionErrors.push('text is required and must be a string');
  }
  if (!['SINGLE', 'MULTIPLE'].includes(q.type)) {
    questionErrors.push('type must be SINGLE or MULTIPLE');
  }

  // Options must be array of objects with text and is_correct
  if (!Array.isArray(q.options)) {
    questionErrors.push('options must be an array');
  } else {
    // Validate each option has required fields
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      if (typeof opt !== 'object' || !opt.text) {
        questionErrors.push(`option ${j} must have a text field`);
      }
      if (typeof opt.is_correct !== 'boolean') {
        questionErrors.push(`option ${j} must have is_correct boolean`);
      }
    }

    // Convert array to dict format
    if (questionErrors.length === 0) {
      const optionsDict = convertArrayToDict(q.options);
      const validation = validateOptionsFormat(optionsDict, q.type);
      if (!validation.valid) {
        questionErrors.push(...validation.errors);
      } else {
        q.options = optionsDict; // Replace with dict format
      }
    }
  }

  if (questionErrors.length > 0) {
    errors.push(`Question ${i + 1} (${q.title || 'untitled'}): ${questionErrors.join(', ')}`);
  } else {
    processedQuestions.push(q);
  }
}

if (errors.length > 0) {
  return res.status(400).json({
    error: 'Validation failed',
    details: errors
  });
}

// Insert questions (no correct_answers column)
for (const q of processedQuestions) {
  await sql`
    INSERT INTO ${sql(dbSchema)}.questions
    (title, text, type, options, visibility, tags, author_id)
    VALUES (
      ${q.title},
      ${q.text},
      ${q.type},
      ${JSON.stringify(q.options)},
      ${q.visibility || 'private'},
      ${JSON.stringify(q.tags || [])},
      ${author_id}
    )
  `;
}
```

**Step 2: Run import tests**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/backend && npm test -- tests/unit/import.test.js`
Expected: Tests pass or need updates

**Step 3: Commit**

```bash
git add backend/routes/import.js
git commit -m "refactor(import): update YAML import for new options format

- Expect options as array of { text, is_correct, explanation? }
- Convert to dict format on import
- Validate SINGLE/MULTIPLE correct answer rules
- Remove correct_answers field handling"
```

---

### Task 3.3: Update Tests Route

**Files:**
- Modify: `backend/routes/tests.js`

**Step 1: Add new columns to create/update**

Update the POST and PUT routes to handle `show_explanations` and `explanation_scope`:

```javascript
// In POST create test
router.post('/',
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('visibility').optional().isIn(['public', 'private', 'protected']),
  body('pass_threshold').optional().isInt({ min: 0, max: 100 }),
  body('show_explanations').optional().isIn(['never', 'after_each_question', 'after_submit']),
  body('explanation_scope').optional().isIn(['selected_only', 'all_answers']),
  handleValidationErrors,
  async (req, res) => {
    const {
      title,
      description = '',
      visibility = 'private',
      pass_threshold = 0,
      show_explanations = 'never',
      explanation_scope = 'selected_only'
    } = req.body;

    // ... slug generation ...

    const tests = await sql`
      INSERT INTO ${sql(dbSchema)}.tests
      (title, slug, description, visibility, pass_threshold, show_explanations, explanation_scope, author_id)
      VALUES (${title}, ${slug}, ${description}, ${visibility}, ${pass_threshold}, ${show_explanations}, ${explanation_scope}, ${req.user.id})
      RETURNING *
    `;

    res.status(201).json(tests[0]);
  }
);
```

Similarly update the PUT `/:id` route.

**Step 2: Update GET to include new columns**

Ensure SELECT queries include `show_explanations` and `explanation_scope`.

**Step 3: Commit**

```bash
git add backend/routes/tests.js
git commit -m "feat(tests): add show_explanations and explanation_scope fields

- Add validation for new enum fields
- Default: never + selected_only (most restrictive)
- Include in create/update/get responses"
```

---

### Task 3.4: Update Assessments Route

**Files:**
- Modify: `backend/routes/assessments.js`

**Step 1: Update /start to shuffle options**

```javascript
import { shuffleOptions, getCorrectOptionIds } from '../utils/options.js';

// In POST /start, after fetching questions:
const questionsWithNumbers = testQuestionsData.map((q, index) => {
  // Parse options if stored as JSON string
  const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;

  return {
    id: q.id,
    title: q.title,
    text: q.text,
    type: q.type,
    options: shuffleOptions(options), // Shuffled array with id/text only
    weight: q.weight,
    question_number: index + 1
  };
});
```

**Step 2: Update /answer to include feedback based on test settings**

```javascript
// In POST /:assessmentId/answer, after recording answer:

// Get test settings
const testSettings = await sql`
  SELECT show_explanations, explanation_scope
  FROM ${sql(dbSchema)}.tests
  WHERE id = ${assessment.test_id}
`;

let feedback = null;

if (testSettings[0].show_explanations === 'after_each_question') {
  // Get question options
  const questions = await sql`
    SELECT options FROM ${sql(dbSchema)}.questions WHERE id = ${question_id}
  `;
  const options = typeof questions[0].options === 'string'
    ? JSON.parse(questions[0].options)
    : questions[0].options;

  // Build feedback based on scope
  const selectedFeedback = selected_options.map(id => ({
    id: String(id),
    text: options[String(id)]?.text,
    is_correct: options[String(id)]?.is_correct || false,
    explanation: options[String(id)]?.explanation
  }));

  feedback = {
    selected: selectedFeedback,
    all: testSettings[0].explanation_scope === 'all_answers'
      ? Object.entries(options).map(([id, opt]) => ({
          id,
          text: opt.text,
          is_correct: opt.is_correct,
          explanation: opt.explanation
        }))
      : null
  };
}

res.json({
  message: 'Answer recorded',
  question_id,
  answered_questions: parseInt(answeredQuestions[0].count),
  total_questions: parseInt(totalQuestions[0].count),
  feedback
});
```

**Step 3: Update /submit to include feedback**

Similar logic for the submit endpoint, checking `show_explanations === 'after_submit'`.

**Step 4: Secure /details endpoint**

Add `authenticateToken` middleware to the GET `/:id/details` route:

```javascript
router.get('/:id/details',
  authenticateToken,  // ADD THIS
  param('id').isUUID().withMessage('id must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    // ... existing logic ...
  }
);
```

**Step 5: Update scoring logic for new format**

```javascript
// In POST /:assessmentId/submit, update scoring:
import { getCorrectOptionIds } from '../utils/options.js';
import { isAnswerCorrect } from '../utils/scoring.js';

// For each answer:
const options = typeof answer.options === 'string'
  ? JSON.parse(answer.options)
  : answer.options;
const correctIds = getCorrectOptionIds(options);
const selectedIds = answer.selected_options.map(String);

const correct = isAnswerCorrect(answer.type, selectedIds, correctIds);
```

**Step 6: Commit**

```bash
git add backend/routes/assessments.js
git commit -m "refactor(assessments): implement new options format and feedback

- Shuffle options on /start (strip is_correct/explanation)
- Add feedback to /answer based on test settings
- Add feedback to /submit based on test settings
- Secure /details endpoint with authentication
- Update scoring for string option IDs"
```

---

## Phase 4: Frontend Updates

### Task 4.1: Update QuestionForm Component

**Files:**
- Modify: `frontend/src/pages/admin/QuestionForm.jsx`

**Step 1: Update form state for new options format**

```jsx
// Initialize form with new format
const [formData, setFormData] = useState({
  title: question?.title || '',
  text: question?.text || '',
  type: question?.type || 'SINGLE',
  visibility: question?.visibility || 'private',
  options: initializeOptions(question?.options),
  tags: Array.isArray(question?.tags) ? question.tags.join(', ') : ''
});

// Helper to initialize options from either format
function initializeOptions(options) {
  if (!options) {
    return [
      { text: '', is_correct: false, explanation: '' },
      { text: '', is_correct: false, explanation: '' }
    ];
  }

  // If dict format, convert to array for editing
  if (typeof options === 'object' && !Array.isArray(options)) {
    return Object.entries(options)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([_, opt]) => ({
        text: opt.text || '',
        is_correct: opt.is_correct || false,
        explanation: opt.explanation || ''
      }));
  }

  return options;
}
```

**Step 2: Update option rendering**

```jsx
{/* Options section */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Options (first option is index 0)
  </label>
  {formData.options.map((option, index) => (
    <div key={index} className="flex gap-2 items-start">
      <input
        type={formData.type === 'SINGLE' ? 'radio' : 'checkbox'}
        checked={option.is_correct}
        onChange={(e) => handleOptionCorrectChange(index, e.target.checked)}
        className="mt-3"
      />
      <div className="flex-1 space-y-1">
        <Input
          value={option.text}
          onChange={(e) => handleOptionTextChange(index, e.target.value)}
          placeholder={`Option ${index}`}
        />
        <Input
          value={option.explanation || ''}
          onChange={(e) => handleOptionExplanationChange(index, e.target.value)}
          placeholder="Explanation (optional)"
          className="text-sm"
        />
      </div>
      {formData.options.length > 2 && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => removeOption(index)}
        >
          Remove
        </Button>
      )}
    </div>
  ))}
</div>
```

**Step 3: Update handlers**

```jsx
const handleOptionCorrectChange = (index, isCorrect) => {
  setFormData(prev => {
    const newOptions = [...prev.options];

    if (prev.type === 'SINGLE') {
      // Uncheck all others for SINGLE type
      newOptions.forEach((opt, i) => {
        opt.is_correct = i === index ? isCorrect : false;
      });
    } else {
      newOptions[index].is_correct = isCorrect;
    }

    return { ...prev, options: newOptions };
  });
};

const handleOptionTextChange = (index, text) => {
  setFormData(prev => {
    const newOptions = [...prev.options];
    newOptions[index].text = text;
    return { ...prev, options: newOptions };
  });
};

const handleOptionExplanationChange = (index, explanation) => {
  setFormData(prev => {
    const newOptions = [...prev.options];
    newOptions[index].explanation = explanation;
    return { ...prev, options: newOptions };
  });
};
```

**Step 4: Update submit to convert to dict**

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  // Convert options array to dict format for API
  const optionsDict = {};
  formData.options.forEach((opt, index) => {
    optionsDict[String(index)] = {
      text: opt.text.trim(),
      is_correct: opt.is_correct,
      ...(opt.explanation?.trim() && { explanation: opt.explanation.trim() })
    };
  });

  await onSubmit({
    ...formData,
    options: optionsDict,
    tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
  });
};
```

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/QuestionForm.jsx
git commit -m "refactor(QuestionForm): update for new options format

- Options as array of { text, is_correct, explanation }
- Add explanation field per option
- Convert to dict format on submit
- Handle SINGLE type radio button behavior"
```

---

### Task 4.2: Update TestForm Component

**Files:**
- Modify: `frontend/src/pages/admin/TestForm.jsx`

**Step 1: Add new form fields**

```jsx
const [formData, setFormData] = useState({
  title: test?.title || '',
  description: test?.description || '',
  visibility: test?.visibility || 'private',
  pass_threshold: test?.pass_threshold || 0,
  show_explanations: test?.show_explanations || 'never',
  explanation_scope: test?.explanation_scope || 'selected_only'
});

// In the form JSX, add:
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Show Explanations
    </label>
    <Select
      value={formData.show_explanations}
      onChange={(e) => setFormData({ ...formData, show_explanations: e.target.value })}
    >
      <option value="never">Never - Candidates see score only</option>
      <option value="after_each_question">After Each Question</option>
      <option value="after_submit">After Test Submission</option>
    </Select>
  </div>

  {formData.show_explanations !== 'never' && (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Explanation Scope
      </label>
      <Select
        value={formData.explanation_scope}
        onChange={(e) => setFormData({ ...formData, explanation_scope: e.target.value })}
      >
        <option value="selected_only">Selected Answers Only</option>
        <option value="all_answers">All Answer Options</option>
      </Select>
    </div>
  )}
</div>
```

**Step 2: Commit**

```bash
git add frontend/src/pages/admin/TestForm.jsx
git commit -m "feat(TestForm): add show_explanations and explanation_scope fields

- Add dropdown for show_explanations (never/after_each_question/after_submit)
- Add dropdown for explanation_scope (selected_only/all_answers)
- Show scope only when explanations enabled"
```

---

### Task 4.3: Create TestPreviewModal Component

**Files:**
- Create: `frontend/src/components/TestPreviewModal.jsx`

**Step 1: Create the component**

```jsx
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import MarkdownRenderer from './MarkdownRenderer';

const TestPreviewModal = ({ isOpen, onClose, testId, testTitle }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen && testId) {
      fetchQuestions();
    }
  }, [isOpen, testId]);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/api/tests/${testId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch questions');
      const data = await response.json();

      // Shuffle options for each question (simulating candidate view)
      const shuffledQuestions = data.questions.map(q => ({
        ...q,
        shuffledOptions: shuffleArray(
          Object.entries(q.options).map(([id, opt]) => ({ id, ...opt }))
        )
      }));

      setQuestions(shuffledQuestions);
      setCurrentIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const currentQuestion = questions[currentIndex];

  const handleClose = () => {
    setCurrentIndex(0);
    setShowAnswers(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Preview: ${testTitle}`} size="lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showAnswers}
            onChange={(e) => setShowAnswers(e.target.checked)}
            className="rounded border-gray-300 text-tech focus:ring-tech"
          />
          <span className="text-sm font-medium text-gray-700">Show Answers</span>
        </label>
        <span className="text-sm text-gray-500">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {loading && <div className="text-center py-8">Loading questions...</div>}

      {error && (
        <div className="text-center py-8 text-red-600">{error}</div>
      )}

      {!loading && !error && currentQuestion && (
        <div className="space-y-4">
          {/* Question */}
          <div>
            {currentQuestion.title && (
              <h3 className="font-semibold text-gray-800 mb-2">{currentQuestion.title}</h3>
            )}
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer content={currentQuestion.text} />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.shuffledOptions.map((option) => (
              <div
                key={option.id}
                className={`p-3 rounded-lg border-2 ${
                  showAnswers && option.is_correct
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                    showAnswers && option.is_correct
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300'
                  }`}>
                    {currentQuestion.type === 'SINGLE' ? '○' : '□'}
                  </span>
                  <div className="flex-1">
                    <span>{option.text}</span>
                    {showAnswers && option.explanation && (
                      <p className="mt-1 text-sm text-gray-600 italic">
                        {option.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TestPreviewModal;
```

**Step 2: Commit**

```bash
git add frontend/src/components/TestPreviewModal.jsx
git commit -m "feat(TestPreviewModal): add test preview modal component

- Display questions one at a time with navigation
- Toggle to show/hide correct answers and explanations
- Shuffle options to simulate candidate view
- Uses existing Modal and MarkdownRenderer components"
```

---

### Task 4.4: Integrate Preview into TestsTab

**Files:**
- Modify: `frontend/src/pages/admin/TestsTab.jsx`

**Step 1: Add state and import**

```jsx
import TestPreviewModal from '../../components/TestPreviewModal';

// Add state
const [previewTest, setPreviewTest] = useState(null);
```

**Step 2: Add Preview button to test actions**

```jsx
// In the test row actions, add Preview button:
<Button
  variant="secondary"
  size="sm"
  onClick={() => setPreviewTest(test)}
  title="Preview test"
>
  Preview
</Button>
```

**Step 3: Add modal to JSX**

```jsx
{/* At the end of the component, before closing fragment */}
<TestPreviewModal
  isOpen={!!previewTest}
  onClose={() => setPreviewTest(null)}
  testId={previewTest?.id}
  testTitle={previewTest?.title}
/>
```

**Step 4: Commit**

```bash
git add frontend/src/pages/admin/TestsTab.jsx
git commit -m "feat(TestsTab): add Preview button to open TestPreviewModal

- Add Preview button in test row actions
- Integrate TestPreviewModal component"
```

---

### Task 4.5: Add LocalStorage Persistence

**Files:**
- Modify: `frontend/src/pages/TestLanding.jsx`
- Modify: `frontend/src/pages/QuestionRunner.jsx`

**Step 1: Create assessment storage utility**

Create `frontend/src/utils/assessmentStorage.js`:

```javascript
const STORAGE_PREFIX = 'cleverbadge_assessment_';

export function getStorageKey(testSlug) {
  return `${STORAGE_PREFIX}${testSlug}`;
}

export function saveAssessment(testSlug, data) {
  const key = getStorageKey(testSlug);
  localStorage.setItem(key, JSON.stringify({
    ...data,
    savedAt: new Date().toISOString()
  }));
}

export function loadAssessment(testSlug) {
  const key = getStorageKey(testSlug);
  const data = localStorage.getItem(key);
  if (!data) return null;

  try {
    const parsed = JSON.parse(data);

    // Check if expired (24 hours)
    const savedAt = new Date(parsed.savedAt);
    const now = new Date();
    const hoursDiff = (now - savedAt) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      clearAssessment(testSlug);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearAssessment(testSlug) {
  const key = getStorageKey(testSlug);
  localStorage.removeItem(key);
}
```

**Step 2: Update TestLanding to check for existing assessment**

```jsx
import { loadAssessment, clearAssessment } from '../utils/assessmentStorage';

// In TestLanding component:
const [existingAssessment, setExistingAssessment] = useState(null);

useEffect(() => {
  if (test?.slug) {
    const saved = loadAssessment(test.slug);
    if (saved) {
      setExistingAssessment(saved);
    }
  }
}, [test?.slug]);

// Show resume prompt if existing assessment found
{existingAssessment && (
  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p className="text-yellow-800 font-medium">
      You have an in-progress assessment as "{existingAssessment.candidateName}"
    </p>
    <div className="mt-2 flex gap-2">
      <Button onClick={handleResume}>Resume</Button>
      <Button variant="secondary" onClick={() => {
        clearAssessment(test.slug);
        setExistingAssessment(null);
      }}>
        Start Fresh
      </Button>
    </div>
  </div>
)}
```

**Step 3: Update QuestionRunner to save progress**

```jsx
import { saveAssessment, clearAssessment } from '../utils/assessmentStorage';

// Save progress after each answer
useEffect(() => {
  if (assessmentId && testSlug) {
    saveAssessment(testSlug, {
      assessmentId,
      candidateName,
      currentQuestionIndex: currentQuestion,
      answers,
      questions,
      startedAt
    });
  }
}, [answers, currentQuestion]);

// Clear on successful submit
const handleSubmit = async () => {
  // ... submit logic ...
  clearAssessment(testSlug);
  // Navigate to results
};
```

**Step 4: Commit**

```bash
git add frontend/src/utils/assessmentStorage.js frontend/src/pages/TestLanding.jsx frontend/src/pages/QuestionRunner.jsx
git commit -m "feat(persistence): add LocalStorage assessment persistence

- Save assessment progress to LocalStorage
- Resume prompt on TestLanding if existing assessment found
- Clear storage on successful submit
- Auto-expire after 24 hours"
```

---

## Phase 5: Update YAML Example and Documentation

### Task 5.1: Update Example YAML File

**Files:**
- Modify: `frontend/public/questions-example.yaml`

**Step 1: Update to new format**

```yaml
# Example YAML format for importing questions
# Options use 0-based indexing (first option is index 0)

- title: "Capital of France"
  text: "What is the capital of France?"
  type: "SINGLE"
  visibility: "public"
  options:
    - text: "London"
      is_correct: false
      explanation: "London is the capital of the United Kingdom."
    - text: "Paris"
      is_correct: true
      explanation: "Paris has been the capital of France since the 10th century."
    - text: "Berlin"
      is_correct: false
      explanation: "Berlin is the capital of Germany."
    - text: "Madrid"
      is_correct: false
      explanation: "Madrid is the capital of Spain."
  tags: ["geography", "europe"]

- title: "Prime Numbers"
  text: "Select all **prime numbers** from the list below."
  type: "MULTIPLE"
  visibility: "private"
  options:
    - text: "2"
      is_correct: true
      explanation: "2 is the only even prime number."
    - text: "3"
      is_correct: true
    - text: "4"
      is_correct: false
      explanation: "4 = 2 x 2, so it's composite."
    - text: "5"
      is_correct: true
    - text: "6"
      is_correct: false
      explanation: "6 = 2 x 3, so it's composite."
  tags: ["math", "numbers"]

- title: "JavaScript typeof null"
  text: |
    What is the output of the following code?

    ```javascript
    console.log(typeof null);
    ```
  type: "SINGLE"
  visibility: "protected"
  options:
    - text: "\"null\""
      is_correct: false
      explanation: "This would be intuitive but is incorrect."
    - text: "\"undefined\""
      is_correct: false
    - text: "\"object\""
      is_correct: true
      explanation: "This is a famous JavaScript quirk - typeof null returns 'object' due to a legacy bug."
    - text: "\"string\""
      is_correct: false
  tags: ["javascript", "quirks"]
```

**Step 2: Commit**

```bash
git add frontend/public/questions-example.yaml
git commit -m "docs: update example YAML to new options format

- Options as array of { text, is_correct, explanation? }
- Add explanations to demonstrate the feature
- Include examples of SINGLE and MULTIPLE types"
```

---

### Task 5.2: Update YamlUpload Documentation

**Files:**
- Modify: `frontend/src/components/YamlUpload.jsx`

**Step 1: Update EXAMPLE_YAML and format reference**

```jsx
const EXAMPLE_YAML = `# Example YAML format - root array of questions
- title: "Basic Addition"
  text: "What is 2+2?"
  type: "SINGLE"
  visibility: "public"
  options:
    - text: "3"
      is_correct: false
    - text: "4"
      is_correct: true
      explanation: "2+2=4"
    - text: "5"
      is_correct: false
  tags: ["math", "easy"]

- title: "Prime Numbers Selection"
  text: "Select all prime numbers"
  type: "MULTIPLE"
  visibility: "private"
  options:
    - text: "2"
      is_correct: true
    - text: "3"
      is_correct: true
    - text: "4"
      is_correct: false
    - text: "5"
      is_correct: true
  tags: ["math"]`;
```

Update the format reference tab content:

```jsx
{/* Reference tab - update field descriptions */}
<p className="text-sm text-gray-800 font-medium mt-3 mb-1">Required fields:</p>
<ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
  <li><code className="bg-gray-100 px-1 rounded font-mono">title</code> - Short descriptive title (1-200 chars, unique per author)</li>
  <li><code className="bg-gray-100 px-1 rounded font-mono">text</code> - The question text (supports Markdown)</li>
  <li><code className="bg-gray-100 px-1 rounded font-mono">type</code> - Either "SINGLE" or "MULTIPLE"</li>
  <li><code className="bg-gray-100 px-1 rounded font-mono">options</code> - Array of option objects (2-10 options)</li>
</ul>

<p className="text-sm text-gray-800 font-medium mt-3 mb-1">Option object fields:</p>
<ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
  <li><code className="bg-gray-100 px-1 rounded font-mono">text</code> - The option text (required)</li>
  <li><code className="bg-gray-100 px-1 rounded font-mono">is_correct</code> - Boolean true/false (required)</li>
  <li><code className="bg-gray-100 px-1 rounded font-mono">explanation</code> - Why this answer is right/wrong (optional)</li>
</ul>

<div className="bg-amber-50 border border-amber-200 rounded p-3 mt-3">
  <p className="text-sm text-amber-800">
    <strong>Important:</strong> Option indices are 0-based. The first option is index 0, second is index 1, etc.
    For SINGLE type, exactly one option must have <code>is_correct: true</code>.
    For MULTIPLE type, at least one option must have <code>is_correct: true</code>.
  </p>
</div>
```

**Step 2: Commit**

```bash
git add frontend/src/components/YamlUpload.jsx
git commit -m "docs: update YamlUpload for new options format

- Update example YAML with new structure
- Document option object fields (text, is_correct, explanation)
- Add 0-based indexing warning
- Document SINGLE vs MULTIPLE validation rules"
```

---

## Phase 6: Update Tests

### Task 6.1: Update Backend Seed Data

**Files:**
- Modify: `backend/tests/setup.js`

**Step 1: Update seed data to new options format**

```javascript
// Update question seed data
const mathQuestion = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  title: 'Math Addition Question',
  text: 'What is 2 + 2?',
  type: 'SINGLE',
  options: JSON.stringify({
    '0': { text: '3', is_correct: false },
    '1': { text: '4', is_correct: true, explanation: 'Basic arithmetic' },
    '2': { text: '5', is_correct: false },
    '3': { text: '6', is_correct: false }
  }),
  tags: JSON.stringify(['math', 'easy']),
  author_id: adminId,
  visibility: 'private'
};

// Remove correct_answers from INSERT statements
// Update all other seed questions similarly
```

**Step 2: Update INSERT statements to not include correct_answers**

**Step 3: Commit**

```bash
git add backend/tests/setup.js
git commit -m "test: update seed data for new options format

- Options as dict with is_correct per option
- Remove correct_answers from seed data
- Add explanations to some options for testing"
```

---

### Task 6.2: Update E2E Tests

**Files:**
- Modify: `frontend/tests/e2e/candidate-flow.spec.js`
- Modify: `frontend/tests/e2e/questions-management.spec.js`

**Step 1: Update question creation in E2E tests**

The E2E tests that create questions via the UI need to use the new form with checkboxes for is_correct.

**Step 2: Update assertions for new response format**

Options now come as array of `{ id, text }` in candidate view.

**Step 3: Run E2E tests**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge && ./scripts/e2e-tests.sh`
Expected: All tests pass

**Step 4: Commit**

```bash
git add frontend/tests/e2e/
git commit -m "test(e2e): update for new options format

- Update question creation tests for new form fields
- Update assertions for shuffled options response
- Verify feedback display based on test settings"
```

---

## Phase 7: Run Migration and Final Verification

### Task 7.1: Run Migration

**Step 1: Run migration on development schema**

```bash
cd /Users/jnury-perso/Repositories/CleverBadge/backend && npm run migrate
```

**Step 2: Verify schema changes**

```bash
PGPASSWORD=cleverbadge_dev psql -h localhost -U cleverbadge_dev -d cleverbadge -c "\d development.questions"
PGPASSWORD=cleverbadge_dev psql -h localhost -U cleverbadge_dev -d cleverbadge -c "\d development.tests"
```

Expected:
- `questions` table should NOT have `correct_answers` column
- `tests` table should have `show_explanations` and `explanation_scope` columns

---

### Task 7.2: Run All Tests

**Step 1: Run backend unit tests**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/backend && npm test`
Expected: All tests pass

**Step 2: Run frontend unit tests**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge/frontend && npm test`
Expected: All tests pass

**Step 3: Run E2E tests**

Run: `cd /Users/jnury-perso/Repositories/CleverBadge && ./scripts/e2e-tests.sh`
Expected: All tests pass

---

### Task 7.3: Update Package Versions

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

**Step 1: Bump minor version (new feature)**

Backend: `1.2.1` → `1.3.0`
Frontend: `1.2.1` → `1.3.0`

**Step 2: Commit**

```bash
git add backend/package.json frontend/package.json
git commit -m "chore: bump version to 1.3.0 for options refactor"
```

---

## Summary

This plan implements the options refactor in these phases:

1. **Database Migration** - Add test settings columns, remove correct_answers
2. **Backend Utilities** - Options conversion, validation, shuffling
3. **Backend Routes** - Update questions, tests, assessments endpoints
4. **Frontend Components** - QuestionForm, TestForm, TestPreviewModal
5. **Documentation** - YAML example, format reference
6. **Tests** - Seed data, E2E tests
7. **Final Verification** - Migration, all tests passing

Total estimated tasks: ~20 discrete commits

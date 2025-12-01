import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateRandomSlug } from '../utils/slug.js';
import { canChangeTestVisibility, getIncompatibleQuestions, canQuestionBeInTest } from '../utils/visibility.js';

const router = express.Router();

// Protected demo test slug - cannot be deleted or have slug regenerated
const PROTECTED_DEMO_SLUG = 'demo';

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

// GET all tests (excludes archived)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const allTests = await sql`
      SELECT * FROM ${sql(dbSchema)}.tests
      WHERE is_archived = false
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
        WHERE id = ${req.params.id} AND is_archived = false
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
        WHERE slug = ${req.params.slug} AND is_archived = false
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const test = tests[0];

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

      // Return test data including is_enabled so frontend can show appropriate UI
      res.json({
        id: test.id,
        title: test.title,
        description: test.description,
        slug: test.slug,
        visibility: test.visibility,
        is_enabled: test.is_enabled,
        question_count: parseInt(questionCountResult[0].count),
        show_explanations: test.show_explanations,
        explanation_scope: test.explanation_scope
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
  body('show_explanations').optional().isIn(['never', 'after_each_question', 'after_submit']).withMessage('show_explanations must be never, after_each_question, or after_submit'),
  body('explanation_scope').optional().isIn(['selected_only', 'all_answers']).withMessage('explanation_scope must be selected_only or all_answers'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, visibility = 'private', is_enabled, pass_threshold, show_explanations = 'never', explanation_scope = 'selected_only' } = req.body;

      // Generate unique random slug
      const slug = await generateUniqueSlug();

      const newTests = await sql`
        INSERT INTO ${sql(dbSchema)}.tests (title, description, slug, visibility, is_enabled, pass_threshold, show_explanations, explanation_scope)
        VALUES (${title}, ${description || null}, ${slug}, ${visibility}, ${is_enabled ?? false}, ${pass_threshold ?? 0}, ${show_explanations}, ${explanation_scope})
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
  body('show_explanations').optional().isIn(['never', 'after_each_question', 'after_submit']).withMessage('show_explanations must be never, after_each_question, or after_submit'),
  body('explanation_scope').optional().isIn(['selected_only', 'all_answers']).withMessage('explanation_scope must be selected_only or all_answers'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, visibility, is_enabled, pass_threshold, show_explanations, explanation_scope } = req.body;

      // Get current test
      const currentTests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests WHERE id = ${req.params.id}
      `;

      if (currentTests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const currentTest = currentTests[0];

      // Prevent disabling the demo test
      if (currentTest.slug === PROTECTED_DEMO_SLUG && is_enabled === false) {
        return res.status(403).json({
          error: 'Cannot disable the demo test',
          code: 'PROTECTED_TEST'
        });
      }

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
          show_explanations = ${show_explanations || currentTest.show_explanations},
          explanation_scope = ${explanation_scope || currentTest.explanation_scope},
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

      // Check if this is the protected demo test
      if (oldSlug === PROTECTED_DEMO_SLUG) {
        return res.status(403).json({
          error: 'Cannot regenerate slug for the demo test',
          code: 'PROTECTED_TEST'
        });
      }

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

// DELETE test (soft delete - archives the test)
router.delete('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if this is the protected demo test
      const testCheck = await sql`
        SELECT slug FROM ${sql(dbSchema)}.tests WHERE id = ${req.params.id}
      `;

      if (testCheck.length > 0 && testCheck[0].slug === PROTECTED_DEMO_SLUG) {
        return res.status(403).json({
          error: 'Cannot delete the demo test',
          code: 'PROTECTED_TEST'
        });
      }

      // First, remove all questions from the test
      await sql`
        DELETE FROM ${sql(dbSchema)}.test_questions
        WHERE test_id = ${req.params.id}
      `;

      // Soft delete - set is_archived to true
      const archivedTests = await sql`
        UPDATE ${sql(dbSchema)}.tests
        SET is_archived = true, is_enabled = false, updated_at = NOW()
        WHERE id = ${req.params.id} AND is_archived = false
        RETURNING *
      `;

      if (archivedTests.length === 0) {
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

// POST bulk add questions to test (simplified - skips duplicates)
router.post('/:id/questions/bulk-add',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  body('question_ids').isArray({ min: 1 }).withMessage('question_ids must be a non-empty array'),
  body('question_ids.*').isUUID().withMessage('Each question_id must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { question_ids } = req.body;
      const testId = req.params.id;

      // Get test with visibility
      const tests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests
        WHERE id = ${testId} AND is_archived = false
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const test = tests[0];

      // Get questions to check visibility
      const questionDetails = await sql`
        SELECT id, title, visibility
        FROM ${sql(dbSchema)}.questions
        WHERE id = ANY(${question_ids}) AND is_archived = false
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

      // Get existing questions in test
      const existing = await sql`
        SELECT question_id FROM ${sql(dbSchema)}.test_questions
        WHERE test_id = ${testId}
      `;
      const existingIds = new Set(existing.map(e => e.question_id));

      // Filter to only new questions
      const newQuestionIds = question_ids.filter(id => !existingIds.has(id));
      const skipped = question_ids.length - newQuestionIds.length;

      if (newQuestionIds.length > 0) {
        // Build values for insert
        const values = newQuestionIds.map(qid => ({
          test_id: testId,
          question_id: qid,
          weight: 1
        }));

        await sql`
          INSERT INTO ${sql(dbSchema)}.test_questions ${sql(values, 'test_id', 'question_id', 'weight')}
        `;
      }

      res.json({ added: newQuestionIds.length, skipped });
    } catch (error) {
      console.error('Error bulk adding questions to test:', error);
      res.status(500).json({ error: 'Failed to bulk add questions to test' });
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

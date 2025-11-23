import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

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

      // Get questions for this test
      const testQuestionsData = await sql`
        SELECT
          tq.question_id,
          tq.weight,
          q.text,
          q.type,
          q.options,
          q.tags
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

      if (tests.length === 0 || !tests[0].is_enabled) {
        return res.status(404).json({ error: 'Test not found or disabled' });
      }

      const test = tests[0];

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
        question_count: parseInt(questionCountResult[0].count)
      });
    } catch (error) {
      console.error('Error fetching test by slug:', error);
      res.status(500).json({ error: 'Failed to fetch test' });
    }
  }
);

// POST create test
router.post('/',
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required').isString().withMessage('Title must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('slug').notEmpty().withMessage('Slug is required').isString().withMessage('Slug must be a string')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('is_enabled').optional().isBoolean().withMessage('is_enabled must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, slug, is_enabled } = req.body;

      const newTests = await sql`
        INSERT INTO ${sql(dbSchema)}.tests (title, description, slug, is_enabled)
        VALUES (${title}, ${description || null}, ${slug}, ${is_enabled ?? false})
        RETURNING *
      `;

      res.status(201).json(newTests[0]);
    } catch (error) {
      // Check for unique constraint violation on slug
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Test with this slug already exists' });
      }
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
  body('is_enabled').optional().isBoolean().withMessage('is_enabled must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, is_enabled } = req.body;

      const updatedTests = await sql`
        UPDATE ${sql(dbSchema)}.tests
        SET
          title = ${title},
          description = ${description},
          is_enabled = ${is_enabled},
          updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      if (updatedTests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      res.json(updatedTests[0]);
    } catch (error) {
      console.error('Error updating test:', error);
      res.status(500).json({ error: 'Failed to update test' });
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

// POST add questions to test
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

      // Verify test exists
      const tests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests
        WHERE id = ${req.params.id}
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
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

export default router;

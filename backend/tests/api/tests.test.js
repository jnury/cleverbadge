import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { getTestDb, getTestSchema } from '../setup.js';

// Create test-specific routes that use the test database
const createTestRouter = (sql, schema) => {
  const router = express.Router();

  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

  // GET all tests
  router.get('/', async (req, res) => {
    try {
      const allTests = await sql`
        SELECT * FROM ${sql(schema)}.tests
        ORDER BY created_at DESC
      `;
      res.json({ tests: allTests, total: allTests.length });
    } catch (error) {
      console.error('Error fetching tests:', error);
      res.status(500).json({ error: 'Failed to fetch tests' });
    }
  });

  // GET test by slug (public view)
  router.get('/slug/:slug',
    param('slug').notEmpty().withMessage('Slug is required'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const tests = await sql`
          SELECT * FROM ${sql(schema)}.tests
          WHERE slug = ${req.params.slug}
        `;

        if (tests.length === 0 || !tests[0].is_enabled) {
          return res.status(404).json({ error: 'Test not found or disabled' });
        }

        const test = tests[0];

        const questionCountResult = await sql`
          SELECT COUNT(*) as count
          FROM ${sql(schema)}.test_questions
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

  // GET test by ID
  router.get('/:id',
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const tests = await sql`
          SELECT * FROM ${sql(schema)}.tests
          WHERE id = ${req.params.id}
        `;

        if (tests.length === 0) {
          return res.status(404).json({ error: 'Test not found' });
        }

        const testQuestionsData = await sql`
          SELECT
            tq.question_id,
            tq.weight,
            q.text,
            q.type,
            q.options,
            q.tags
          FROM ${sql(schema)}.test_questions tq
          INNER JOIN ${sql(schema)}.questions q ON tq.question_id = q.id
          WHERE tq.test_id = ${req.params.id}
        `;

        res.json({ ...tests[0], questions: testQuestionsData });
      } catch (error) {
        console.error('Error fetching test:', error);
        res.status(500).json({ error: 'Failed to fetch test' });
      }
    }
  );

  return router;
};

describe('Tests API Endpoints', () => {
  let app;
  const sql = getTestDb();
  const schema = getTestSchema();

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tests', createTestRouter(sql, schema));
  });

  it('should GET /api/tests - return all tests', async () => {
    const response = await request(app)
      .get('/api/tests')
      .expect(200);

    expect(response.body).toHaveProperty('tests');
    expect(response.body).toHaveProperty('total');
    expect(response.body.tests).toHaveLength(3);
    expect(response.body.total).toBe(3);

    const firstTest = response.body.tests.find(t => t.slug === 'math-geo');
    expect(firstTest).toBeDefined();
    expect(firstTest.title).toBe('Math & Geography Test');
    expect(firstTest.is_enabled).toBe(true);
  });

  it('should GET /api/tests/slug/:slug - return enabled test by slug', async () => {
    const response = await request(app)
      .get('/api/tests/slug/math-geo')
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('description');
    expect(response.body).toHaveProperty('slug');
    expect(response.body).toHaveProperty('question_count');

    expect(response.body.title).toBe('Math & Geography Test');
    expect(response.body.slug).toBe('math-geo');
    expect(response.body.question_count).toBe(3);

    expect(response.body.is_enabled).toBeUndefined();
  });

  it('should GET /api/tests/slug/:slug - return 404 for disabled test', async () => {
    const response = await request(app)
      .get('/api/tests/slug/disabled-test')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Test not found or disabled');
  });

  it('should GET /api/tests/slug/:slug - return 404 for non-existent test', async () => {
    const response = await request(app)
      .get('/api/tests/slug/nonexistent-slug')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Test not found or disabled');
  });

  it('should GET /api/tests/:id - return test by id with questions', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';

    const response = await request(app)
      .get(`/api/tests/${testId}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('questions');

    expect(response.body.id).toBe(testId);
    expect(response.body.title).toBe('Math & Geography Test');
    expect(response.body.questions).toHaveLength(3);

    const firstQuestion = response.body.questions[0];
    expect(firstQuestion).toHaveProperty('question_id');
    expect(firstQuestion).toHaveProperty('weight');
    expect(firstQuestion).toHaveProperty('text');
    expect(firstQuestion).toHaveProperty('type');
    expect(firstQuestion).toHaveProperty('options');
  });

  it('should GET /api/tests/:id - return 400 for invalid UUID', async () => {
    const response = await request(app)
      .get('/api/tests/invalid-uuid')
      .expect(400);

    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toBeInstanceOf(Array);
    expect(response.body.errors[0]).toHaveProperty('msg', 'ID must be a valid UUID');
  });
});

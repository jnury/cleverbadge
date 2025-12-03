import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { getTestDb, getTestSchema } from '../setup.js';
import { signToken, verifyToken } from '../../utils/jwt.js';
import { generateRandomSlug } from '../../utils/slug.js';
import { canChangeTestVisibility, canQuestionBeInTest } from '../../utils/visibility.js';

const PROTECTED_DEMO_SLUG = 'demo';

// Test-specific router using test database
const createTestsRouter = (sql, schema) => {
  const router = express.Router();

  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const payload = verifyToken(token);
      req.user = payload;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  const VALID_VISIBILITIES = ['public', 'private', 'protected'];

  async function generateUniqueSlug() {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const slug = generateRandomSlug();
      const existing = await sql`
        SELECT id FROM ${sql(schema)}.tests WHERE slug = ${slug}
      `;
      if (existing.length === 0) {
        return slug;
      }
    }
    throw new Error('Failed to generate unique slug');
  }

  // POST create test
  router.post('/',
    authenticateToken,
    body('title').notEmpty().withMessage('Title is required').isString(),
    body('description').optional().isString(),
    body('visibility').optional().isIn(VALID_VISIBILITIES),
    body('is_enabled').optional().isBoolean(),
    body('pass_threshold').optional().isInt({ min: 0, max: 100 }),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { title, description, visibility = 'private', is_enabled, pass_threshold } = req.body;
        const slug = await generateUniqueSlug();

        const newTests = await sql`
          INSERT INTO ${sql(schema)}.tests (title, description, slug, visibility, is_enabled, pass_threshold)
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
    body('title').notEmpty().withMessage('Title is required').isString(),
    body('description').optional().isString(),
    body('visibility').optional().isIn(VALID_VISIBILITIES),
    body('is_enabled').optional().isBoolean(),
    body('pass_threshold').optional().isInt({ min: 0, max: 100 }),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { title, description, visibility, is_enabled, pass_threshold } = req.body;

        const currentTests = await sql`
          SELECT * FROM ${sql(schema)}.tests WHERE id = ${req.params.id}
        `;

        if (currentTests.length === 0) {
          return res.status(404).json({ error: 'Test not found' });
        }

        const currentTest = currentTests[0];

        // Prevent disabling demo test
        if (currentTest.slug === PROTECTED_DEMO_SLUG && is_enabled === false) {
          return res.status(403).json({
            error: 'Cannot disable the demo test',
            code: 'PROTECTED_TEST'
          });
        }

        // Check visibility change compatibility
        if (visibility && visibility !== currentTest.visibility) {
          const questionsInTest = await sql`
            SELECT q.id, q.title, q.visibility
            FROM ${sql(schema)}.test_questions tq
            INNER JOIN ${sql(schema)}.questions q ON tq.question_id = q.id
            WHERE tq.test_id = ${req.params.id}
          `;

          const canChange = canChangeTestVisibility(currentTest.visibility, visibility, questionsInTest);

          if (!canChange.allowed) {
            return res.status(400).json({
              error: `Cannot change test to ${visibility}: incompatible questions`,
              blockedBy: canChange.blockedBy
            });
          }
        }

        const updatedTests = await sql`
          UPDATE ${sql(schema)}.tests
          SET
            title = ${title},
            description = ${description !== undefined ? description : currentTest.description},
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

  // POST regenerate slug
  router.post('/:id/regenerate-slug',
    authenticateToken,
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const tests = await sql`
          SELECT * FROM ${sql(schema)}.tests WHERE id = ${req.params.id}
        `;

        if (tests.length === 0) {
          return res.status(404).json({ error: 'Test not found' });
        }

        const oldSlug = tests[0].slug;

        if (oldSlug === PROTECTED_DEMO_SLUG) {
          return res.status(403).json({
            error: 'Cannot regenerate slug for the demo test',
            code: 'PROTECTED_TEST'
          });
        }

        const newSlug = await generateUniqueSlug();

        const updatedTests = await sql`
          UPDATE ${sql(schema)}.tests
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
        res.status(500).json({ error: 'Failed to regenerate slug' });
      }
    }
  );

  // DELETE test (soft delete)
  router.delete('/:id',
    authenticateToken,
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const testCheck = await sql`
          SELECT slug FROM ${sql(schema)}.tests WHERE id = ${req.params.id}
        `;

        if (testCheck.length > 0 && testCheck[0].slug === PROTECTED_DEMO_SLUG) {
          return res.status(403).json({
            error: 'Cannot delete the demo test',
            code: 'PROTECTED_TEST'
          });
        }

        // Remove questions from test
        await sql`
          DELETE FROM ${sql(schema)}.test_questions
          WHERE test_id = ${req.params.id}
        `;

        // Soft delete
        const archivedTests = await sql`
          UPDATE ${sql(schema)}.tests
          SET is_archived = true, is_enabled = false, updated_at = NOW()
          WHERE id = ${req.params.id} AND is_archived = false
          RETURNING *
        `;

        if (archivedTests.length === 0) {
          return res.status(404).json({ error: 'Test not found' });
        }

        res.json({ message: 'Test deleted successfully', id: req.params.id });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete test' });
      }
    }
  );

  // GET questions for test
  router.get('/:testId/questions',
    authenticateToken,
    param('testId').isUUID(),
    handleValidationErrors,
    async (req, res) => {
      try {
        const questions = await sql`
          SELECT q.*, tq.weight
          FROM ${sql(schema)}.test_questions tq
          JOIN ${sql(schema)}.questions q ON q.id = tq.question_id
          WHERE tq.test_id = ${req.params.testId}
          ORDER BY q.created_at ASC
        `;

        res.json({ questions });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch test questions' });
      }
    }
  );

  // POST add questions to test
  router.post('/:id/questions',
    authenticateToken,
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    body('questions').isArray({ min: 1 }),
    body('questions.*.question_id').isUUID(),
    body('questions.*.weight').optional().isInt({ min: 1 }),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { questions } = req.body;

        const tests = await sql`
          SELECT * FROM ${sql(schema)}.tests WHERE id = ${req.params.id}
        `;

        if (tests.length === 0) {
          return res.status(404).json({ error: 'Test not found' });
        }

        const test = tests[0];
        const questionIds = questions.map(q => q.question_id);

        const questionDetails = await sql`
          SELECT id, title, visibility
          FROM ${sql(schema)}.questions
          WHERE id = ANY(${questionIds})
        `;

        // Check visibility compatibility
        const incompatible = questionDetails.filter(q =>
          !canQuestionBeInTest(q.visibility, test.visibility)
        );

        if (incompatible.length > 0) {
          return res.status(400).json({
            error: `Cannot add questions: incompatible visibility`,
            incompatible: incompatible.map(q => ({ id: q.id, title: q.title, visibility: q.visibility }))
          });
        }

        const values = questions.map(q => ({
          test_id: req.params.id,
          question_id: q.question_id,
          weight: q.weight || 1
        }));

        const inserted = await sql`
          INSERT INTO ${sql(schema)}.test_questions ${sql(values, 'test_id', 'question_id', 'weight')}
          RETURNING *
        `;

        res.json({ message: 'Questions added successfully', added: inserted.length });
      } catch (error) {
        if (error.code === '23503') {
          return res.status(404).json({ error: 'One or more question IDs not found' });
        }
        res.status(500).json({ error: 'Failed to add questions to test' });
      }
    }
  );

  // POST bulk add questions
  router.post('/:id/questions/bulk-add',
    authenticateToken,
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    body('question_ids').isArray({ min: 1 }),
    body('question_ids.*').isUUID(),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { question_ids } = req.body;
        const testId = req.params.id;

        const tests = await sql`
          SELECT * FROM ${sql(schema)}.tests
          WHERE id = ${testId} AND is_archived = false
        `;

        if (tests.length === 0) {
          return res.status(404).json({ error: 'Test not found' });
        }

        const test = tests[0];

        const questionDetails = await sql`
          SELECT id, title, visibility
          FROM ${sql(schema)}.questions
          WHERE id = ANY(${question_ids}) AND is_archived = false
        `;

        // Check visibility compatibility
        const incompatible = questionDetails.filter(q =>
          !canQuestionBeInTest(q.visibility, test.visibility)
        );

        if (incompatible.length > 0) {
          return res.status(400).json({
            error: `Cannot add questions: incompatible visibility`,
            incompatible: incompatible.map(q => ({ id: q.id, title: q.title, visibility: q.visibility }))
          });
        }

        // Get existing
        const existing = await sql`
          SELECT question_id FROM ${sql(schema)}.test_questions WHERE test_id = ${testId}
        `;
        const existingIds = new Set(existing.map(e => e.question_id));

        const newQuestionIds = question_ids.filter(id => !existingIds.has(id));
        const skipped = question_ids.length - newQuestionIds.length;

        if (newQuestionIds.length > 0) {
          const values = newQuestionIds.map(qid => ({
            test_id: testId,
            question_id: qid,
            weight: 1
          }));

          await sql`
            INSERT INTO ${sql(schema)}.test_questions ${sql(values, 'test_id', 'question_id', 'weight')}
          `;
        }

        res.json({ added: newQuestionIds.length, skipped });
      } catch (error) {
        res.status(500).json({ error: 'Failed to bulk add questions' });
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
          DELETE FROM ${sql(schema)}.test_questions
          WHERE test_id = ${req.params.testId}
          AND question_id = ${req.params.questionId}
        `;

        res.json({ message: 'Question removed from test' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to remove question from test' });
      }
    }
  );

  return router;
};

let app;
let authToken;
const sql = getTestDb();
const schema = getTestSchema();

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/tests', createTestsRouter(sql, schema));

  authToken = signToken({
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'testadmin',
    role: 'ADMIN'
  });
});

describe('POST /api/tests - Create Test', () => {
  it('should create a new test with auto-generated slug', async () => {
    const response = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'New Test',
        description: 'A new test description',
        visibility: 'private',
        is_enabled: false
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('slug');
    expect(response.body.title).toBe('New Test');
    expect(response.body.slug).toMatch(/^[a-z0-9]{8}$/); // Random 8-char slug
  });

  it('should use default values', async () => {
    const response = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Minimal Test'
      })
      .expect(201);

    expect(response.body.visibility).toBe('private');
    expect(response.body.is_enabled).toBe(false);
    expect(response.body.pass_threshold).toBe(0);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/tests')
      .send({ title: 'Unauthorized Test' })
      .expect(401);

    expect(response.body.error).toBe('Authentication required');
  });
});

describe('PUT /api/tests/:id - Update Test', () => {
  it('should update test title and description', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020'; // math-geo test

    const response = await request(app)
      .put(`/api/tests/${testId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Updated Math Test',
        description: 'Updated description'
      })
      .expect(200);

    expect(response.body.title).toBe('Updated Math Test');
    expect(response.body.description).toBe('Updated description');
  });

  it('should update pass_threshold', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';

    const response = await request(app)
      .put(`/api/tests/${testId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test with Threshold',
        pass_threshold: 70
      })
      .expect(200);

    expect(response.body.pass_threshold).toBe(70);
  });

  it('should return 404 for non-existent test', async () => {
    const response = await request(app)
      .put('/api/tests/550e8400-e29b-41d4-a716-446655440099')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Non-existent' })
      .expect(404);

    expect(response.body.error).toBe('Test not found');
  });
});

describe('POST /api/tests/:id/regenerate-slug - Regenerate Slug', () => {
  it('should regenerate slug for a test', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';

    const response = await request(app)
      .post(`/api/tests/${testId}/regenerate-slug`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.message).toBe('Slug regenerated successfully');
    expect(response.body.old_slug).toBeDefined();
    expect(response.body.new_slug).toBeDefined();
    expect(response.body.old_slug).not.toBe(response.body.new_slug);
  });

  it('should return 404 for non-existent test', async () => {
    const response = await request(app)
      .post('/api/tests/550e8400-e29b-41d4-a716-446655440099/regenerate-slug')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.error).toBe('Test not found');
  });
});

describe('DELETE /api/tests/:id - Delete Test', () => {
  it('should soft delete a test', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440022'; // empty-test

    const response = await request(app)
      .delete(`/api/tests/${testId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.message).toBe('Test deleted successfully');
    expect(response.body.id).toBe(testId);
  });

  it('should return 404 for non-existent test', async () => {
    const response = await request(app)
      .delete('/api/tests/550e8400-e29b-41d4-a716-446655440099')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.error).toBe('Test not found');
  });
});

describe('GET /api/tests/:testId/questions - Get Test Questions', () => {
  it('should return questions with weights', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020'; // math-geo test

    const response = await request(app)
      .get(`/api/tests/${testId}/questions`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('questions');
    expect(response.body.questions.length).toBe(3);
    response.body.questions.forEach(q => {
      expect(q).toHaveProperty('weight');
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
    });
  });
});

describe('POST /api/tests/:id/questions - Add Questions to Test', () => {
  it('should add questions with weights', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440022'; // empty-test

    const response = await request(app)
      .post(`/api/tests/${testId}/questions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questions: [
          { question_id: '550e8400-e29b-41d4-a716-446655440013', weight: 2 },
          { question_id: '550e8400-e29b-41d4-a716-446655440014', weight: 1 }
        ]
      })
      .expect(200);

    expect(response.body.message).toBe('Questions added successfully');
    expect(response.body.added).toBe(2);
  });

  it('should return 404 for non-existent test', async () => {
    const response = await request(app)
      .post('/api/tests/550e8400-e29b-41d4-a716-446655440099/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questions: [{ question_id: '550e8400-e29b-41d4-a716-446655440010', weight: 1 }]
      })
      .expect(404);

    expect(response.body.error).toBe('Test not found');
  });
});

describe('POST /api/tests/:id/questions/bulk-add - Bulk Add Questions', () => {
  it('should add questions and skip duplicates', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020'; // math-geo (already has 3 questions)

    const response = await request(app)
      .post(`/api/tests/${testId}/questions/bulk-add`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question_ids: [
          '550e8400-e29b-41d4-a716-446655440010', // Already in test
          '550e8400-e29b-41d4-a716-446655440013'  // Not in test
        ]
      })
      .expect(200);

    expect(response.body.added).toBe(1);
    expect(response.body.skipped).toBe(1);
  });

  it('should return 404 for non-existent test', async () => {
    const response = await request(app)
      .post('/api/tests/550e8400-e29b-41d4-a716-446655440099/questions/bulk-add')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question_ids: ['550e8400-e29b-41d4-a716-446655440010']
      })
      .expect(404);

    expect(response.body.error).toBe('Test not found');
  });
});

describe('DELETE /api/tests/:testId/questions/:questionId - Remove Question', () => {
  it('should remove question from test', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';
    const questionId = '550e8400-e29b-41d4-a716-446655440010';

    const response = await request(app)
      .delete(`/api/tests/${testId}/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.message).toBe('Question removed from test');
  });
});

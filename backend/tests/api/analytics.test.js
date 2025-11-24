import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { param, validationResult } from 'express-validator';
import { getTestDb, getTestSchema } from '../setup.js';

// Create test-specific router
const createAnalyticsRouter = (sql, schema) => {
  const router = express.Router();

  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

  // GET question analytics for a test
  router.get('/:testId/analytics/questions',
    param('testId').isUUID().withMessage('testId must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        // Verify test exists
        const tests = await sql`
          SELECT id, title FROM ${sql(schema)}.tests
          WHERE id = ${req.params.testId}
        `;

        if (tests.length === 0) {
          return res.status(404).json({ error: 'Test not found' });
        }

        // Count completed assessments
        const completedCount = await sql`
          SELECT COUNT(*) as count
          FROM ${sql(schema)}.assessments
          WHERE test_id = ${req.params.testId}
          AND status = 'COMPLETED'
        `;

        // Get per-question statistics
        const questionStats = await sql`
          SELECT
            q.id as question_id,
            q.text as question_text,
            q.type as question_type,
            tq.weight,
            COUNT(aa.id) as total_attempts,
            SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::integer as correct_attempts,
            CASE
              WHEN COUNT(aa.id) > 0 THEN
                ROUND(SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::decimal / COUNT(aa.id)::decimal * 100, 1)
              ELSE 0
            END as success_rate
          FROM ${sql(schema)}.test_questions tq
          JOIN ${sql(schema)}.questions q ON q.id = tq.question_id
          LEFT JOIN ${sql(schema)}.assessments a ON a.test_id = tq.test_id AND a.status = 'COMPLETED'
          LEFT JOIN ${sql(schema)}.assessment_answers aa ON aa.assessment_id = a.id AND aa.question_id = q.id
          WHERE tq.test_id = ${req.params.testId}
          GROUP BY q.id, q.text, q.type, tq.weight
          ORDER BY success_rate ASC
        `;

        res.json({
          test_id: tests[0].id,
          test_title: tests[0].title,
          total_assessments: parseInt(completedCount[0].count),
          question_stats: questionStats.map(qs => ({
            question_id: qs.question_id,
            question_text: qs.question_text,
            question_type: qs.question_type,
            weight: qs.weight,
            total_attempts: parseInt(qs.total_attempts),
            correct_attempts: parseInt(qs.correct_attempts),
            success_rate: parseFloat(qs.success_rate)
          }))
        });
      } catch (error) {
        console.error('Error fetching question analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
      }
    }
  );

  return router;
};

describe('Analytics API Endpoints', () => {
  let app;
  const sql = getTestDb();
  const schema = getTestSchema();

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tests', createAnalyticsRouter(sql, schema));
  });

  it('should GET /api/tests/:testId/analytics/questions - return question stats', async () => {
    // Using the test with completed assessment from test fixtures
    const testId = '550e8400-e29b-41d4-a716-446655440020'; // math-geo test

    const response = await request(app)
      .get(`/api/tests/${testId}/analytics/questions`)
      .expect(200);

    expect(response.body).toHaveProperty('test_id', testId);
    expect(response.body).toHaveProperty('test_title', 'Math & Geography Test');
    expect(response.body).toHaveProperty('total_assessments');
    expect(response.body).toHaveProperty('question_stats');
    expect(response.body.question_stats).toBeInstanceOf(Array);

    // Verify question stats structure
    if (response.body.question_stats.length > 0) {
      const stat = response.body.question_stats[0];
      expect(stat).toHaveProperty('question_id');
      expect(stat).toHaveProperty('question_text');
      expect(stat).toHaveProperty('question_type');
      expect(stat).toHaveProperty('weight');
      expect(stat).toHaveProperty('total_attempts');
      expect(stat).toHaveProperty('correct_attempts');
      expect(stat).toHaveProperty('success_rate');
    }
  });

  it('should GET /api/tests/:testId/analytics/questions - return 404 for non-existent test', async () => {
    const response = await request(app)
      .get('/api/tests/00000000-0000-0000-0000-000000000000/analytics/questions')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Test not found');
  });

  it('should GET /api/tests/:testId/analytics/questions - return 400 for invalid UUID', async () => {
    const response = await request(app)
      .get('/api/tests/invalid-uuid/analytics/questions')
      .expect(400);

    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0]).toHaveProperty('msg', 'testId must be a valid UUID');
  });

  it('should return questions sorted by success_rate ascending (hardest first)', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';

    const response = await request(app)
      .get(`/api/tests/${testId}/analytics/questions`)
      .expect(200);

    const stats = response.body.question_stats;
    if (stats.length >= 2) {
      for (let i = 1; i < stats.length; i++) {
        expect(stats[i].success_rate).toBeGreaterThanOrEqual(stats[i - 1].success_rate);
      }
    }
  });

  it('should only count COMPLETED assessments, not STARTED', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';

    const response = await request(app)
      .get(`/api/tests/${testId}/analytics/questions`)
      .expect(200);

    // The test fixture has 2 COMPLETED assessments and 1 STARTED
    expect(response.body.total_assessments).toBe(2);
  });

  it('should return 0 attempts for test with no completed assessments', async () => {
    // Use empty-test which has no assessments
    const testId = '550e8400-e29b-41d4-a716-446655440022'; // empty-test

    const response = await request(app)
      .get(`/api/tests/${testId}/analytics/questions`)
      .expect(200);

    expect(response.body.total_assessments).toBe(0);
    // Empty test has no questions, so question_stats should be empty
    expect(response.body.question_stats).toHaveLength(0);
  });
});

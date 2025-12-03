import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { getTestDb, getTestSchema } from '../setup.js';
import { signToken, verifyToken } from '../../utils/jwt.js';
import { getCorrectOptionIds } from '../../utils/options.js';

const ASSESSMENT_TIMEOUT_HOURS = 2;

function isAssessmentExpired(startedAt) {
  const started = new Date(startedAt);
  const now = new Date();
  const hoursDiff = (now - started) / (1000 * 60 * 60);
  return hoursDiff > ASSESSMENT_TIMEOUT_HOURS;
}

// Test-specific router using test database
const createAssessmentsRouter = (sql, schema) => {
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

  // GET all assessments (admin)
  router.get('/',
    authenticateToken,
    query('test_id').optional().isUUID().withMessage('test_id must be a valid UUID'),
    query('status').optional().isIn(['STARTED', 'COMPLETED', 'ABANDONED']),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { test_id, status } = req.query;

        let conditions = [sql`1=1`];

        if (test_id) {
          conditions.push(sql`a.test_id = ${test_id}`);
        }

        if (status) {
          conditions.push(sql`a.status = ${status}`);
        }

        const assessments = await sql`
          SELECT
            a.id, a.candidate_name, a.status, a.score_percentage,
            a.started_at, a.completed_at,
            t.id as test_id, t.title as test_title, t.slug as test_slug
          FROM ${sql(schema)}.assessments a
          INNER JOIN ${sql(schema)}.tests t ON a.test_id = t.id
          WHERE ${conditions.reduce((acc, cond, i) => i === 0 ? cond : sql`${acc} AND ${cond}`)}
          ORDER BY a.started_at DESC
        `;

        res.json({ assessments, total: assessments.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assessments' });
      }
    }
  );

  // GET verify assessment status
  router.get('/:assessmentId/verify',
    param('assessmentId').isUUID().withMessage('assessmentId must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { assessmentId } = req.params;

        const assessments = await sql`
          SELECT id, status, started_at FROM ${sql(schema)}.assessments
          WHERE id = ${assessmentId}
        `;

        if (assessments.length === 0) {
          return res.status(404).json({ error: 'Assessment not found', code: 'ASSESSMENT_NOT_FOUND' });
        }

        const assessment = assessments[0];

        if (assessment.status === 'COMPLETED') {
          return res.status(400).json({ error: 'Assessment already completed', code: 'ASSESSMENT_COMPLETED' });
        }

        if (assessment.status === 'ABANDONED') {
          return res.status(400).json({ error: 'Assessment has been abandoned', code: 'ASSESSMENT_ABANDONED' });
        }

        if (isAssessmentExpired(assessment.started_at)) {
          await sql`
            UPDATE ${sql(schema)}.assessments SET status = 'ABANDONED' WHERE id = ${assessmentId}
          `;
          return res.status(400).json({
            error: 'Assessment has expired',
            code: 'ASSESSMENT_EXPIRED'
          });
        }

        res.json({ valid: true, status: assessment.status });
      } catch (error) {
        res.status(500).json({ error: 'Failed to verify assessment' });
      }
    }
  );

  // GET assessment details (admin)
  router.get('/:id/details',
    authenticateToken,
    param('id').isUUID().withMessage('id must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { id } = req.params;

        const assessments = await sql`
          SELECT
            a.id, a.test_id, a.candidate_name, a.status, a.score_percentage,
            a.started_at, a.completed_at, t.title as test_title
          FROM ${sql(schema)}.assessments a
          INNER JOIN ${sql(schema)}.tests t ON a.test_id = t.id
          WHERE a.id = ${id}
        `;

        if (assessments.length === 0) {
          return res.status(404).json({ error: 'Assessment not found' });
        }

        const assessment = assessments[0];

        const answers = await sql`
          SELECT
            aa.id as answer_id, aa.question_id, aa.selected_options, aa.is_correct, aa.answered_at,
            q.text as question_text, q.type as question_type, q.options as question_options,
            tq.weight
          FROM ${sql(schema)}.assessment_answers aa
          INNER JOIN ${sql(schema)}.questions q ON aa.question_id = q.id
          INNER JOIN ${sql(schema)}.test_questions tq ON tq.question_id = q.id AND tq.test_id = ${assessment.test_id}
          WHERE aa.assessment_id = ${id}
          ORDER BY aa.answered_at
        `;

        const totalQuestions = answers.length;
        const correctAnswers = answers.filter(a => a.is_correct).length;
        const totalWeight = answers.reduce((sum, a) => sum + a.weight, 0);
        const earnedWeight = answers.filter(a => a.is_correct).reduce((sum, a) => sum + a.weight, 0);

        res.json({
          assessment: {
            id: assessment.id,
            test_title: assessment.test_title,
            candidate_name: assessment.candidate_name,
            status: assessment.status,
            score_percentage: parseFloat(assessment.score_percentage),
            started_at: assessment.started_at,
            completed_at: assessment.completed_at,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            total_weight: totalWeight,
            earned_weight: earnedWeight
          },
          answers: answers.map(a => {
            const options = typeof a.question_options === 'string'
              ? JSON.parse(a.question_options)
              : a.question_options;

            return {
              question_id: a.question_id,
              question_text: a.question_text,
              question_type: a.question_type,
              options: options,
              correct_option_ids: getCorrectOptionIds(options),
              selected_options: a.selected_options,
              is_correct: a.is_correct,
              weight: a.weight
            };
          })
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assessment details' });
      }
    }
  );

  // POST bulk archive assessments
  router.post('/bulk-archive',
    authenticateToken,
    body('assessment_ids').isArray({ min: 1 }),
    body('assessment_ids.*').isUUID(),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { assessment_ids } = req.body;

        const result = await sql`
          UPDATE ${sql(schema)}.assessments
          SET is_archived = true
          WHERE id = ANY(${assessment_ids}) AND is_archived = false
          RETURNING id
        `;

        res.json({
          archived: result.length,
          message: `${result.length} assessment(s) archived successfully`
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to archive assessments' });
      }
    }
  );

  // POST bulk delete assessments (permanent)
  router.post('/bulk-delete',
    authenticateToken,
    body('assessment_ids').isArray({ min: 1 }),
    body('assessment_ids.*').isUUID(),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { assessment_ids } = req.body;

        const result = await sql`
          DELETE FROM ${sql(schema)}.assessments
          WHERE id = ANY(${assessment_ids})
          RETURNING id
        `;

        res.json({
          deleted: result.length,
          message: `${result.length} assessment(s) permanently deleted`
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete assessments' });
      }
    }
  );

  // POST submit answer - test expired assessment
  router.post('/:assessmentId/answer',
    param('assessmentId').isUUID().withMessage('assessmentId must be a valid UUID'),
    body('question_id').isUUID(),
    body('selected_options').isArray({ min: 1 }),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { assessmentId } = req.params;
        const { question_id, selected_options } = req.body;

        const assessments = await sql`
          SELECT * FROM ${sql(schema)}.assessments WHERE id = ${assessmentId}
        `;

        if (assessments.length === 0) {
          return res.status(404).json({ error: 'Assessment not found' });
        }

        const assessment = assessments[0];

        if (assessment.status === 'COMPLETED') {
          return res.status(400).json({ error: 'Assessment already completed' });
        }

        if (assessment.status === 'ABANDONED') {
          return res.status(400).json({ error: 'Assessment has been abandoned', code: 'ASSESSMENT_ABANDONED' });
        }

        if (isAssessmentExpired(assessment.started_at)) {
          await sql`
            UPDATE ${sql(schema)}.assessments SET status = 'ABANDONED' WHERE id = ${assessmentId}
          `;
          return res.status(400).json({
            error: 'Assessment has expired',
            code: 'ASSESSMENT_EXPIRED'
          });
        }

        // Save or update answer
        const existingAnswers = await sql`
          SELECT * FROM ${sql(schema)}.assessment_answers
          WHERE assessment_id = ${assessmentId} AND question_id = ${question_id}
        `;

        if (existingAnswers.length > 0) {
          await sql`
            UPDATE ${sql(schema)}.assessment_answers
            SET selected_options = ${selected_options}, answered_at = NOW()
            WHERE id = ${existingAnswers[0].id}
          `;
        } else {
          await sql`
            INSERT INTO ${sql(schema)}.assessment_answers (assessment_id, question_id, selected_options)
            VALUES (${assessmentId}, ${question_id}, ${selected_options})
          `;
        }

        const answeredQuestions = await sql`
          SELECT COUNT(*) as count FROM ${sql(schema)}.assessment_answers
          WHERE assessment_id = ${assessmentId}
        `;

        const totalQuestions = await sql`
          SELECT COUNT(*) as count FROM ${sql(schema)}.test_questions
          WHERE test_id = ${assessment.test_id}
        `;

        res.json({
          message: 'Answer recorded',
          question_id,
          answered_questions: parseInt(answeredQuestions[0].count),
          total_questions: parseInt(totalQuestions[0].count)
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to submit answer' });
      }
    }
  );

  // POST submit assessment - test expired
  router.post('/:assessmentId/submit',
    param('assessmentId').isUUID().withMessage('assessmentId must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { assessmentId } = req.params;

        const assessments = await sql`
          SELECT * FROM ${sql(schema)}.assessments WHERE id = ${assessmentId}
        `;

        if (assessments.length === 0) {
          return res.status(404).json({ error: 'Assessment not found' });
        }

        const assessment = assessments[0];

        if (assessment.status === 'COMPLETED') {
          return res.status(400).json({ error: 'Assessment already completed' });
        }

        if (assessment.status === 'ABANDONED') {
          return res.status(400).json({ error: 'Assessment has been abandoned', code: 'ASSESSMENT_ABANDONED' });
        }

        if (isAssessmentExpired(assessment.started_at)) {
          await sql`
            UPDATE ${sql(schema)}.assessments SET status = 'ABANDONED' WHERE id = ${assessmentId}
          `;
          return res.status(400).json({
            error: 'Assessment has expired',
            code: 'ASSESSMENT_EXPIRED'
          });
        }

        // Complete the assessment (simplified - no scoring for this test)
        await sql`
          UPDATE ${sql(schema)}.assessments
          SET status = 'COMPLETED', score_percentage = 0, completed_at = NOW()
          WHERE id = ${assessmentId}
        `;

        res.json({
          assessment_id: assessmentId,
          score_percentage: 0,
          status: 'COMPLETED'
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to submit assessment' });
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
  app.use('/api/assessments', createAssessmentsRouter(sql, schema));

  authToken = signToken({
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'testadmin',
    role: 'ADMIN'
  });
});

describe('GET /api/assessments - List Assessments', () => {
  it('should return all assessments', async () => {
    const response = await request(app)
      .get('/api/assessments')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('assessments');
    expect(response.body).toHaveProperty('total');
    expect(response.body.assessments.length).toBe(3);
  });

  it('should filter by test_id', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';
    const response = await request(app)
      .get(`/api/assessments?test_id=${testId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    response.body.assessments.forEach(a => {
      expect(a.test_id).toBe(testId);
    });
  });

  it('should filter by status', async () => {
    const response = await request(app)
      .get('/api/assessments?status=COMPLETED')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    response.body.assessments.forEach(a => {
      expect(a.status).toBe('COMPLETED');
    });
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/assessments')
      .expect(401);

    expect(response.body.error).toBe('Authentication required');
  });
});

describe('GET /api/assessments/:assessmentId/verify - Verify Assessment', () => {
  it('should return valid for STARTED assessment', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440032'; // In-progress

    const response = await request(app)
      .get(`/api/assessments/${assessmentId}/verify`)
      .expect(200);

    expect(response.body.valid).toBe(true);
    expect(response.body.status).toBe('STARTED');
  });

  it('should return error for COMPLETED assessment', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440030'; // Perfect Student

    const response = await request(app)
      .get(`/api/assessments/${assessmentId}/verify`)
      .expect(400);

    expect(response.body.error).toBe('Assessment already completed');
    expect(response.body.code).toBe('ASSESSMENT_COMPLETED');
  });

  it('should return 404 for non-existent assessment', async () => {
    const response = await request(app)
      .get('/api/assessments/550e8400-e29b-41d4-a716-446655440099/verify')
      .expect(404);

    expect(response.body.error).toBe('Assessment not found');
    expect(response.body.code).toBe('ASSESSMENT_NOT_FOUND');
  });
});

describe('GET /api/assessments/:id/details - Assessment Details', () => {
  it('should return assessment details with answers', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440030'; // Perfect Student

    const response = await request(app)
      .get(`/api/assessments/${assessmentId}/details`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('assessment');
    expect(response.body).toHaveProperty('answers');

    expect(response.body.assessment.id).toBe(assessmentId);
    expect(response.body.assessment.candidate_name).toBe('Perfect Student');
    expect(response.body.assessment.status).toBe('COMPLETED');
    expect(response.body.assessment.score_percentage).toBe(100);

    expect(response.body.assessment).toHaveProperty('total_questions');
    expect(response.body.assessment).toHaveProperty('correct_answers');
    expect(response.body.assessment).toHaveProperty('total_weight');
    expect(response.body.assessment).toHaveProperty('earned_weight');

    expect(response.body.answers.length).toBe(3);
    response.body.answers.forEach(a => {
      expect(a).toHaveProperty('question_id');
      expect(a).toHaveProperty('question_text');
      expect(a).toHaveProperty('options');
      expect(a).toHaveProperty('correct_option_ids');
      expect(a).toHaveProperty('selected_options');
      expect(a).toHaveProperty('is_correct');
      expect(a).toHaveProperty('weight');
    });
  });

  it('should return 404 for non-existent assessment', async () => {
    const response = await request(app)
      .get('/api/assessments/550e8400-e29b-41d4-a716-446655440099/details')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.error).toBe('Assessment not found');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/assessments/550e8400-e29b-41d4-a716-446655440030/details')
      .expect(401);

    expect(response.body.error).toBe('Authentication required');
  });
});

describe('POST /api/assessments/bulk-archive - Bulk Archive', () => {
  it('should archive multiple assessments', async () => {
    const response = await request(app)
      .post('/api/assessments/bulk-archive')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        assessment_ids: [
          '550e8400-e29b-41d4-a716-446655440030',
          '550e8400-e29b-41d4-a716-446655440031'
        ]
      })
      .expect(200);

    expect(response.body).toHaveProperty('archived');
    expect(response.body).toHaveProperty('message');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/assessments/bulk-archive')
      .send({ assessment_ids: ['550e8400-e29b-41d4-a716-446655440030'] })
      .expect(401);

    expect(response.body.error).toBe('Authentication required');
  });
});

describe('POST /api/assessments/bulk-delete - Bulk Delete', () => {
  it('should permanently delete assessments', async () => {
    const response = await request(app)
      .post('/api/assessments/bulk-delete')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        assessment_ids: ['550e8400-e29b-41d4-a716-446655440031'] // Average Student
      })
      .expect(200);

    expect(response.body).toHaveProperty('deleted');
    expect(response.body).toHaveProperty('message');
  });
});

describe('POST /api/assessments/:assessmentId/answer - Submit Answer Edge Cases', () => {
  it('should reject answer for completed assessment', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440030'; // Completed

    const response = await request(app)
      .post(`/api/assessments/${assessmentId}/answer`)
      .send({
        question_id: '550e8400-e29b-41d4-a716-446655440010',
        selected_options: [1]
      })
      .expect(400);

    expect(response.body.error).toBe('Assessment already completed');
  });

  it('should return 404 for non-existent assessment', async () => {
    const response = await request(app)
      .post('/api/assessments/550e8400-e29b-41d4-a716-446655440099/answer')
      .send({
        question_id: '550e8400-e29b-41d4-a716-446655440010',
        selected_options: [1]
      })
      .expect(404);

    expect(response.body.error).toBe('Assessment not found');
  });
});

describe('POST /api/assessments/:assessmentId/submit - Submit Assessment Edge Cases', () => {
  it('should reject submission for completed assessment', async () => {
    const assessmentId = '550e8400-e29b-41d4-a716-446655440030'; // Already completed

    const response = await request(app)
      .post(`/api/assessments/${assessmentId}/submit`)
      .expect(400);

    expect(response.body.error).toBe('Assessment already completed');
  });

  it('should return 404 for non-existent assessment', async () => {
    const response = await request(app)
      .post('/api/assessments/550e8400-e29b-41d4-a716-446655440099/submit')
      .expect(404);

    expect(response.body.error).toBe('Assessment not found');
  });
});

import express from 'express';
import { param, validationResult } from 'express-validator';
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

// GET /api/tests/:testId/analytics/questions - per-question success rates
router.get('/:testId/analytics/questions',
  authenticateToken,
  param('testId').isUUID().withMessage('testId must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      // Verify test exists
      const tests = await sql`
        SELECT id, title FROM ${sql(dbSchema)}.tests
        WHERE id = ${req.params.testId}
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Count completed assessments for this test
      const completedCount = await sql`
        SELECT COUNT(*) as count
        FROM ${sql(dbSchema)}.assessments
        WHERE test_id = ${req.params.testId}
        AND status = 'COMPLETED'
      `;

      // Get per-question statistics
      // Only counts answers from COMPLETED assessments
      // Orders by success_rate ascending (hardest questions first)
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
        FROM ${sql(dbSchema)}.test_questions tq
        JOIN ${sql(dbSchema)}.questions q ON q.id = tq.question_id
        LEFT JOIN ${sql(dbSchema)}.assessments a ON a.test_id = tq.test_id AND a.status = 'COMPLETED'
        LEFT JOIN ${sql(dbSchema)}.assessment_answers aa ON aa.assessment_id = a.id AND aa.question_id = q.id
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

export default router;

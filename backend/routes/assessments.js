import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { isAnswerCorrect } from '../utils/scoring.js';
import { shuffleOptions, getCorrectOptionIds } from '../utils/options.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Assessment timeout in hours
const ASSESSMENT_TIMEOUT_HOURS = 2;

/**
 * Check if an assessment has expired (exceeded timeout)
 * @param {Date} startedAt - When the assessment was started
 * @returns {boolean} - True if expired
 */
function isAssessmentExpired(startedAt) {
  const started = new Date(startedAt);
  const now = new Date();
  const hoursDiff = (now - started) / (1000 * 60 * 60);
  return hoursDiff > ASSESSMENT_TIMEOUT_HOURS;
}

// Validation middleware helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET all assessments (admin only)
router.get('/',
  authenticateToken,
  query('test_id').optional().isUUID().withMessage('test_id must be a valid UUID'),
  query('status').optional().isIn(['STARTED', 'COMPLETED', 'ABANDONED']).withMessage('status must be STARTED, COMPLETED, or ABANDONED'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { test_id, status } = req.query;

      // Build dynamic query with filters
      let conditions = [sql`1=1`]; // Always true - placeholder for dynamic conditions

      if (test_id) {
        conditions.push(sql`a.test_id = ${test_id}`);
      }

      if (status) {
        conditions.push(sql`a.status = ${status}`);
      }

      const assessments = await sql`
        SELECT
          a.id,
          a.candidate_name,
          a.status,
          a.score_percentage,
          a.started_at,
          a.completed_at,
          t.id as test_id,
          t.title as test_title,
          t.slug as test_slug
        FROM ${sql(dbSchema)}.assessments a
        INNER JOIN ${sql(dbSchema)}.tests t ON a.test_id = t.id
        WHERE ${conditions.reduce((acc, cond, i) => i === 0 ? cond : sql`${acc} AND ${cond}`)}
        ORDER BY a.started_at DESC
      `;

      res.json({ assessments, total: assessments.length });
    } catch (error) {
      console.error('Error fetching assessments:', error);
      res.status(500).json({ error: 'Failed to fetch assessments' });
    }
  }
);

// POST start assessment
router.post('/start',
  body('test_id').isUUID().withMessage('test_id must be a valid UUID'),
  body('candidate_name').notEmpty().withMessage('Candidate name is required')
    .isString().withMessage('Candidate name must be a string')
    .isLength({ min: 2, max: 100 }).withMessage('Candidate name must be between 2 and 100 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { test_id, candidate_name } = req.body;

      // Check if test exists and is enabled
      const tests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests
        WHERE id = ${test_id}
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const test = tests[0];

      if (!test.is_enabled) {
        return res.status(403).json({
          error: 'This test is currently disabled and cannot be started.'
        });
      }

      // Create assessment with access_slug
      const assessments = await sql`
        INSERT INTO ${sql(dbSchema)}.assessments (test_id, candidate_name, status, access_slug)
        VALUES (${test_id}, ${candidate_name}, 'STARTED', ${test.slug})
        RETURNING *
      `;

      const assessment = assessments[0];

      // Get all questions for this test (WITHOUT correct_answers)
      // Order by test_questions.id to maintain insertion order
      const testQuestionsData = await sql`
        SELECT
          q.id,
          q.title,
          q.text,
          q.type,
          q.options,
          tq.weight
        FROM ${sql(dbSchema)}.test_questions tq
        INNER JOIN ${sql(dbSchema)}.questions q ON tq.question_id = q.id
        WHERE tq.test_id = ${test_id}
        ORDER BY tq.id
      `;

      // Add question numbers and shuffle options
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

      res.status(201).json({
        assessment_id: assessment.id,
        test: {
          id: test.id,
          title: test.title,
          description: test.description,
          show_explanations: test.show_explanations,
          explanation_scope: test.explanation_scope
        },
        questions: questionsWithNumbers,
        total_questions: questionsWithNumbers.length,
        started_at: assessment.started_at
      });
    } catch (error) {
      console.error('Error starting assessment:', error);
      res.status(500).json({ error: 'Failed to start assessment' });
    }
  }
);

// POST submit answer (upsert pattern)
router.post('/:assessmentId/answer',
  param('assessmentId').isUUID().withMessage('assessmentId must be a valid UUID'),
  body('question_id').isUUID().withMessage('question_id must be a valid UUID'),
  body('selected_options').isArray({ min: 1 }).withMessage('selected_options must be a non-empty array'),
  body('selected_options.*').isInt({ min: 0 }).withMessage('Each selected option must be a non-negative integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { assessmentId } = req.params;
      const { question_id, selected_options } = req.body;

      // Check if assessment exists and is not completed
      const assessments = await sql`
        SELECT * FROM ${sql(dbSchema)}.assessments
        WHERE id = ${assessmentId}
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

      // Check if assessment has expired (2 hour timeout)
      if (isAssessmentExpired(assessment.started_at)) {
        // Mark assessment as ABANDONED
        await sql`
          UPDATE ${sql(dbSchema)}.assessments
          SET status = 'ABANDONED'
          WHERE id = ${assessmentId}
        `;
        return res.status(400).json({
          error: 'Assessment has expired. The 2-hour time limit has been exceeded.',
          code: 'ASSESSMENT_EXPIRED'
        });
      }

      // Check if answer already exists (for upsert)
      const existingAnswers = await sql`
        SELECT * FROM ${sql(dbSchema)}.assessment_answers
        WHERE assessment_id = ${assessmentId} AND question_id = ${question_id}
      `;

      if (existingAnswers.length > 0) {
        // Update existing answer
        await sql`
          UPDATE ${sql(dbSchema)}.assessment_answers
          SET
            selected_options = ${selected_options},
            answered_at = NOW()
          WHERE id = ${existingAnswers[0].id}
        `;
      } else {
        // Create new answer
        await sql`
          INSERT INTO ${sql(dbSchema)}.assessment_answers (assessment_id, question_id, selected_options)
          VALUES (${assessmentId}, ${question_id}, ${selected_options})
        `;
      }

      // Count answered questions
      const answeredQuestions = await sql`
        SELECT COUNT(*) as count
        FROM ${sql(dbSchema)}.assessment_answers
        WHERE assessment_id = ${assessmentId}
      `;

      // Get total questions for this test
      const totalQuestions = await sql`
        SELECT COUNT(*) as count
        FROM ${sql(dbSchema)}.test_questions
        WHERE test_id = ${assessment.test_id}
      `;

      // Get test settings for feedback
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
    } catch (error) {
      console.error('Error submitting answer:', error);
      res.status(500).json({ error: 'Failed to submit answer' });
    }
  }
);

// POST submit assessment (finalize and score)
router.post('/:assessmentId/submit',
  param('assessmentId').isUUID().withMessage('assessmentId must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { assessmentId } = req.params;

      // Get assessment
      const assessments = await sql`
        SELECT * FROM ${sql(dbSchema)}.assessments
        WHERE id = ${assessmentId}
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

      // Check if assessment has expired (2 hour timeout)
      if (isAssessmentExpired(assessment.started_at)) {
        // Mark assessment as ABANDONED
        await sql`
          UPDATE ${sql(dbSchema)}.assessments
          SET status = 'ABANDONED'
          WHERE id = ${assessmentId}
        `;
        return res.status(400).json({
          error: 'Assessment has expired. The 2-hour time limit has been exceeded.',
          code: 'ASSESSMENT_EXPIRED'
        });
      }

      // Get all answers with options and weights
      const answers = await sql`
        SELECT
          aa.id,
          aa.question_id,
          aa.selected_options,
          q.options,
          q.type,
          tq.weight
        FROM ${sql(dbSchema)}.assessment_answers aa
        INNER JOIN ${sql(dbSchema)}.questions q ON aa.question_id = q.id
        INNER JOIN ${sql(dbSchema)}.test_questions tq ON tq.question_id = q.id AND tq.test_id = ${assessment.test_id}
        WHERE aa.assessment_id = ${assessmentId}
      `;

      // Calculate scores and update is_correct
      let totalScore = 0;
      let maxScore = 0;

      for (const answer of answers) {
        maxScore += answer.weight;

        // Parse options if stored as JSON string
        const options = typeof answer.options === 'string'
          ? JSON.parse(answer.options)
          : answer.options;

        // Get correct option IDs from options dict
        const correctIds = getCorrectOptionIds(options);
        const selectedIds = answer.selected_options.map(String);

        // Check if answer is correct using utility function
        const correct = isAnswerCorrect(
          answer.type,
          selectedIds,
          correctIds
        );

        if (correct) {
          totalScore += answer.weight;
        }

        // Update answer with is_correct
        await sql`
          UPDATE ${sql(dbSchema)}.assessment_answers
          SET is_correct = ${correct}
          WHERE id = ${answer.id}
        `;
      }

      // Calculate percentage
      const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      // Update assessment
      const updatedAssessments = await sql`
        UPDATE ${sql(dbSchema)}.assessments
        SET
          status = 'COMPLETED',
          score_percentage = ${scorePercentage.toFixed(2)},
          completed_at = NOW()
        WHERE id = ${assessmentId}
        RETURNING *
      `;

      // Get test settings
      const tests = await sql`
        SELECT pass_threshold, show_explanations, explanation_scope FROM ${sql(dbSchema)}.tests
        WHERE id = ${assessment.test_id}
      `;

      let feedback = null;

      if (tests[0].show_explanations === 'after_submit') {
        // Build feedback for all questions
        feedback = [];

        for (const answer of answers) {
          const options = typeof answer.options === 'string'
            ? JSON.parse(answer.options)
            : answer.options;

          const selectedIds = answer.selected_options.map(String);
          const selectedFeedback = selectedIds.map(id => ({
            id,
            text: options[id]?.text,
            is_correct: options[id]?.is_correct || false,
            explanation: options[id]?.explanation
          }));

          feedback.push({
            question_id: answer.question_id,
            selected: selectedFeedback,
            all: tests[0].explanation_scope === 'all_answers'
              ? Object.entries(options).map(([id, opt]) => ({
                  id,
                  text: opt.text,
                  is_correct: opt.is_correct,
                  explanation: opt.explanation
                }))
              : null
          });
        }
      }

      res.json({
        assessment_id: assessmentId,
        score_percentage: parseFloat(updatedAssessments[0].score_percentage),
        total_questions: answers.length,
        status: 'COMPLETED',
        completed_at: updatedAssessments[0].completed_at,
        pass_threshold: tests[0]?.pass_threshold ?? 0,
        feedback
      });
    } catch (error) {
      console.error('Error submitting assessment:', error);
      res.status(500).json({ error: 'Failed to submit assessment' });
    }
  }
);

// GET verify assessment status (for resume)
router.get('/:assessmentId/verify',
  param('assessmentId').isUUID().withMessage('assessmentId must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { assessmentId } = req.params;

      const assessments = await sql`
        SELECT id, status, started_at FROM ${sql(dbSchema)}.assessments
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

      // Check if assessment has expired (2 hour timeout)
      if (isAssessmentExpired(assessment.started_at)) {
        // Mark assessment as ABANDONED
        await sql`
          UPDATE ${sql(dbSchema)}.assessments
          SET status = 'ABANDONED'
          WHERE id = ${assessmentId}
        `;
        return res.status(400).json({
          error: 'Assessment has expired. The 2-hour time limit has been exceeded.',
          code: 'ASSESSMENT_EXPIRED'
        });
      }

      res.json({ valid: true, status: assessment.status });
    } catch (error) {
      console.error('Error verifying assessment:', error);
      res.status(500).json({ error: 'Failed to verify assessment' });
    }
  }
);

// POST bulk archive assessments (soft delete)
router.post('/bulk-archive',
  authenticateToken,
  body('assessment_ids').isArray({ min: 1 }).withMessage('assessment_ids must be a non-empty array'),
  body('assessment_ids.*').isUUID().withMessage('Each assessment_id must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { assessment_ids } = req.body;

      const result = await sql`
        UPDATE ${sql(dbSchema)}.assessments
        SET is_archived = true
        WHERE id = ANY(${assessment_ids}) AND is_archived = false
        RETURNING id
      `;

      res.json({
        archived: result.length,
        message: `${result.length} assessment(s) archived successfully`
      });
    } catch (error) {
      console.error('Error archiving assessments:', error);
      res.status(500).json({ error: 'Failed to archive assessments' });
    }
  }
);

// POST bulk delete assessments (permanent delete)
router.post('/bulk-delete',
  authenticateToken,
  body('assessment_ids').isArray({ min: 1 }).withMessage('assessment_ids must be a non-empty array'),
  body('assessment_ids.*').isUUID().withMessage('Each assessment_id must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { assessment_ids } = req.body;

      // Delete assessments - assessment_answers will be deleted via CASCADE
      const result = await sql`
        DELETE FROM ${sql(dbSchema)}.assessments
        WHERE id = ANY(${assessment_ids})
        RETURNING id
      `;

      res.json({
        deleted: result.length,
        message: `${result.length} assessment(s) permanently deleted`
      });
    } catch (error) {
      console.error('Error deleting assessments:', error);
      res.status(500).json({ error: 'Failed to delete assessments' });
    }
  }
);

// GET assessment details (admin only)
router.get('/:id/details',
  authenticateToken,
  param('id').isUUID().withMessage('id must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get assessment with test info
      const assessments = await sql`
        SELECT
          a.id,
          a.test_id,
          a.candidate_name,
          a.status,
          a.score_percentage,
          a.started_at,
          a.completed_at,
          t.title as test_title
        FROM ${sql(dbSchema)}.assessments a
        INNER JOIN ${sql(dbSchema)}.tests t ON a.test_id = t.id
        WHERE a.id = ${id}
      `;

      if (assessments.length === 0) {
        return res.status(404).json({ error: 'Assessment not found' });
      }

      const assessment = assessments[0];

      // Get all answers with question details
      const answers = await sql`
        SELECT
          aa.id as answer_id,
          aa.question_id,
          aa.selected_options,
          aa.is_correct,
          aa.answered_at,
          q.text as question_text,
          q.type as question_type,
          q.options as question_options,
          tq.weight
        FROM ${sql(dbSchema)}.assessment_answers aa
        INNER JOIN ${sql(dbSchema)}.questions q ON aa.question_id = q.id
        INNER JOIN ${sql(dbSchema)}.test_questions tq
          ON tq.question_id = q.id AND tq.test_id = ${assessment.test_id}
        WHERE aa.assessment_id = ${id}
        ORDER BY aa.answered_at
      `;

      // Calculate summary statistics
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
          // Parse options if stored as JSON string
          const options = typeof a.question_options === 'string'
            ? JSON.parse(a.question_options)
            : a.question_options;

          // Get correct option IDs from options dict
          const correctOptionIds = getCorrectOptionIds(options);

          return {
            question_id: a.question_id,
            question_text: a.question_text,
            question_type: a.question_type,
            options: options,
            correct_option_ids: correctOptionIds,
            selected_options: a.selected_options,
            is_correct: a.is_correct,
            weight: a.weight,
            answered_at: a.answered_at
          };
        })
      });
    } catch (error) {
      console.error('Error fetching assessment details:', error);
      res.status(500).json({ error: 'Failed to fetch assessment details' });
    }
  }
);

export default router;

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';

const router = express.Router();

// Validation middleware helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

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

      if (tests.length === 0 || !tests[0].is_enabled) {
        return res.status(404).json({ error: 'Test not found or disabled' });
      }

      const test = tests[0];

      // Create assessment
      const assessments = await sql`
        INSERT INTO ${sql(dbSchema)}.assessments (test_id, candidate_name, status)
        VALUES (${test_id}, ${candidate_name}, 'STARTED')
        RETURNING *
      `;

      const assessment = assessments[0];

      // Get all questions for this test (WITHOUT correct_answers)
      const testQuestionsData = await sql`
        SELECT
          q.id,
          q.text,
          q.type,
          q.options,
          tq.weight
        FROM ${sql(dbSchema)}.test_questions tq
        INNER JOIN ${sql(dbSchema)}.questions q ON tq.question_id = q.id
        WHERE tq.test_id = ${test_id}
        ORDER BY tq.id
      `;

      // Add question numbers
      const questionsWithNumbers = testQuestionsData.map((q, index) => ({
        ...q,
        question_number: index + 1
      }));

      res.status(201).json({
        assessment_id: assessment.id,
        test: {
          id: test.id,
          title: test.title,
          description: test.description
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

      res.json({
        message: 'Answer recorded',
        question_id,
        answered_questions: parseInt(answeredQuestions[0].count),
        total_questions: parseInt(totalQuestions[0].count)
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

      // Get all answers with correct answers and weights
      const answers = await sql`
        SELECT
          aa.id,
          aa.question_id,
          aa.selected_options,
          q.correct_answers,
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

        // Check if answer is correct
        let isCorrect = false;

        if (answer.type === 'SINGLE') {
          // SINGLE: correct if selected_options has exactly 1 item AND it's in correct_answers
          isCorrect = answer.selected_options.length === 1 &&
                     answer.correct_answers.includes(answer.selected_options[0]);
        } else {
          // MULTIPLE: arrays must match (order-independent)
          const selectedSorted = [...answer.selected_options].sort((a, b) => a - b);
          const correctSorted = [...answer.correct_answers].sort((a, b) => a - b);
          isCorrect = JSON.stringify(selectedSorted) === JSON.stringify(correctSorted);
        }

        if (isCorrect) {
          totalScore += answer.weight;
        }

        // Update answer with is_correct
        await sql`
          UPDATE ${sql(dbSchema)}.assessment_answers
          SET is_correct = ${isCorrect}
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

      res.json({
        assessment_id: assessmentId,
        score_percentage: parseFloat(updatedAssessments[0].score_percentage),
        total_questions: answers.length,
        status: 'COMPLETED',
        completed_at: updatedAssessments[0].completed_at
      });
    } catch (error) {
      console.error('Error submitting assessment:', error);
      res.status(500).json({ error: 'Failed to submit assessment' });
    }
  }
);

export default router;

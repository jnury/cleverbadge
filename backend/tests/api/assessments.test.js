import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { getTestDb, getTestSchema } from '../setup.js';
import { isAnswerCorrect } from '../../utils/scoring.js';
import { getCorrectOptionIds } from '../../utils/options.js';

// Create test-specific routes that use the test database
const createAssessmentsRouter = (sql, schema) => {
  const router = express.Router();

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

        const tests = await sql`
          SELECT * FROM ${sql(schema)}.tests
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

        const assessments = await sql`
          INSERT INTO ${sql(schema)}.assessments (test_id, candidate_name, status, access_slug)
          VALUES (${test_id}, ${candidate_name}, 'STARTED', ${test.slug})
          RETURNING *
        `;

        const assessment = assessments[0];

        const testQuestionsData = await sql`
          SELECT
            q.id,
            q.text,
            q.type,
            q.options,
            tq.weight
          FROM ${sql(schema)}.test_questions tq
          INNER JOIN ${sql(schema)}.questions q ON tq.question_id = q.id
          WHERE tq.test_id = ${test_id}
          ORDER BY tq.id
        `;

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

  // POST submit answer
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

        const assessments = await sql`
          SELECT * FROM ${sql(schema)}.assessments
          WHERE id = ${assessmentId}
        `;

        if (assessments.length === 0) {
          return res.status(404).json({ error: 'Assessment not found' });
        }

        const assessment = assessments[0];

        if (assessment.status === 'COMPLETED') {
          return res.status(400).json({ error: 'Assessment already completed' });
        }

        const existingAnswers = await sql`
          SELECT * FROM ${sql(schema)}.assessment_answers
          WHERE assessment_id = ${assessmentId} AND question_id = ${question_id}
        `;

        if (existingAnswers.length > 0) {
          await sql`
            UPDATE ${sql(schema)}.assessment_answers
            SET
              selected_options = ${selected_options},
              answered_at = NOW()
            WHERE id = ${existingAnswers[0].id}
          `;
        } else {
          await sql`
            INSERT INTO ${sql(schema)}.assessment_answers (assessment_id, question_id, selected_options)
            VALUES (${assessmentId}, ${question_id}, ${selected_options})
          `;
        }

        const answeredQuestions = await sql`
          SELECT COUNT(*) as count
          FROM ${sql(schema)}.assessment_answers
          WHERE assessment_id = ${assessmentId}
        `;

        const totalQuestions = await sql`
          SELECT COUNT(*) as count
          FROM ${sql(schema)}.test_questions
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

  // POST submit assessment
  router.post('/:assessmentId/submit',
    param('assessmentId').isUUID().withMessage('assessmentId must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { assessmentId } = req.params;

        const assessments = await sql`
          SELECT * FROM ${sql(schema)}.assessments
          WHERE id = ${assessmentId}
        `;

        if (assessments.length === 0) {
          return res.status(404).json({ error: 'Assessment not found' });
        }

        const assessment = assessments[0];

        if (assessment.status === 'COMPLETED') {
          return res.status(400).json({ error: 'Assessment already completed' });
        }

        // Get ALL questions from the test to calculate max score
        const allTestQuestions = await sql`
          SELECT tq.question_id, tq.weight
          FROM ${sql(schema)}.test_questions tq
          WHERE tq.test_id = ${assessment.test_id}
        `;

        // Calculate max score from ALL questions in the test
        const maxScore = allTestQuestions.reduce((sum, q) => sum + q.weight, 0);

        const answers = await sql`
          SELECT
            aa.id,
            aa.question_id,
            aa.selected_options,
            q.options,
            q.type,
            tq.weight
          FROM ${sql(schema)}.assessment_answers aa
          INNER JOIN ${sql(schema)}.questions q ON aa.question_id = q.id
          INNER JOIN ${sql(schema)}.test_questions tq ON tq.question_id = q.id AND tq.test_id = ${assessment.test_id}
          WHERE aa.assessment_id = ${assessmentId}
        `;

        let totalScore = 0;

        for (const answer of answers) {

          const correctAnswers = getCorrectOptionIds(answer.options);
          const correct = isAnswerCorrect(
            answer.type,
            answer.selected_options,
            correctAnswers
          );

          if (correct) {
            totalScore += answer.weight;
          }

          await sql`
            UPDATE ${sql(schema)}.assessment_answers
            SET is_correct = ${correct}
            WHERE id = ${answer.id}
          `;
        }

        const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        const updatedAssessments = await sql`
          UPDATE ${sql(schema)}.assessments
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

  return router;
};

describe('Assessments API Endpoints', () => {
  let app;
  const sql = getTestDb();
  const schema = getTestSchema();

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/assessments', createAssessmentsRouter(sql, schema));
  });

  it('should POST /api/assessments/start - create assessment', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';
    const candidateName = 'API Test Candidate';

    const response = await request(app)
      .post('/api/assessments/start')
      .send({
        test_id: testId,
        candidate_name: candidateName
      })
      .expect(201);

    expect(response.body).toHaveProperty('assessment_id');
    expect(response.body).toHaveProperty('test');
    expect(response.body).toHaveProperty('questions');
    expect(response.body).toHaveProperty('total_questions');
    expect(response.body).toHaveProperty('started_at');

    expect(response.body.test.id).toBe(testId);
    expect(response.body.test.title).toBe('Math & Geography Test');

    expect(response.body.questions).toHaveLength(3);
    expect(response.body.total_questions).toBe(3);

    expect(response.body.questions[0].question_number).toBe(1);
    expect(response.body.questions[1].question_number).toBe(2);
    expect(response.body.questions[2].question_number).toBe(3);

    // CRITICAL: Verify questions do NOT include correct_answers
    response.body.questions.forEach(q => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      expect(q).toHaveProperty('type');
      expect(q).toHaveProperty('options');
      expect(q).toHaveProperty('weight');
      expect(q).not.toHaveProperty('correct_answers');
    });
  });

  it('should POST /api/assessments/start - return 404 for non-existent test', async () => {
    const response = await request(app)
      .post('/api/assessments/start')
      .send({
        test_id: '550e8400-e29b-41d4-a716-446655440999',
        candidate_name: 'Test Candidate'
      })
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Test not found');
  });

  it('should POST /api/assessments/start - return 403 for disabled test', async () => {
    const disabledTestId = '550e8400-e29b-41d4-a716-446655440021'; // From seed data
    const response = await request(app)
      .post('/api/assessments/start')
      .send({
        test_id: disabledTestId,
        candidate_name: 'Test Candidate'
      })
      .expect(403);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('This test is currently disabled and cannot be started.');
  });

  it('should POST /api/assessments/:id/answer - save answer', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';
    const startResponse = await request(app)
      .post('/api/assessments/start')
      .send({
        test_id: testId,
        candidate_name: 'Answer Test Candidate'
      });

    const assessmentId = startResponse.body.assessment_id;
    const questionId = startResponse.body.questions[0].id;

    const response = await request(app)
      .post(`/api/assessments/${assessmentId}/answer`)
      .send({
        question_id: questionId,
        selected_options: [1]
      })
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('question_id');
    expect(response.body).toHaveProperty('answered_questions');
    expect(response.body).toHaveProperty('total_questions');

    expect(response.body.message).toBe('Answer recorded');
    expect(response.body.question_id).toBe(questionId);
    expect(response.body.answered_questions).toBe(1);
    expect(response.body.total_questions).toBe(3);
  });

  it('should POST /api/assessments/:id/submit - complete and score assessment', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';
    const startResponse = await request(app)
      .post('/api/assessments/start')
      .send({
        test_id: testId,
        candidate_name: 'Submit Test Candidate'
      });

    const assessmentId = startResponse.body.assessment_id;
    const questions = startResponse.body.questions;

    // Find specific questions by text to answer correctly
    const q1 = questions.find(q => q.text === 'What is 2 + 2?');
    const q2 = questions.find(q => q.text === 'What is the capital of France?');
    const q3 = questions.find(q => q.text === 'Select all even numbers:');

    // Submit all answers (all correct)
    // Q1: correct answer is [1] (option '4')
    await request(app)
      .post(`/api/assessments/${assessmentId}/answer`)
      .send({
        question_id: q1.id,
        selected_options: [1]
      });

    // Q2: correct answer is [1] (option 'Paris')
    await request(app)
      .post(`/api/assessments/${assessmentId}/answer`)
      .send({
        question_id: q2.id,
        selected_options: [1]
      });

    // Q3: correct answer is [1, 3] (options '2' and '4')
    await request(app)
      .post(`/api/assessments/${assessmentId}/answer`)
      .send({
        question_id: q3.id,
        selected_options: [1, 3]
      });

    const response = await request(app)
      .post(`/api/assessments/${assessmentId}/submit`)
      .expect(200);

    expect(response.body).toHaveProperty('assessment_id');
    expect(response.body).toHaveProperty('score_percentage');
    expect(response.body).toHaveProperty('total_questions');
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('completed_at');

    expect(response.body.assessment_id).toBe(assessmentId);
    expect(response.body.score_percentage).toBe(100);
    expect(response.body.total_questions).toBe(3);
    expect(response.body.status).toBe('COMPLETED');
  });

  it('should score unanswered questions as wrong (not ignored)', async () => {
    // Regression test: answering 1 of 3 questions correctly should give ~33%, not 100%
    const testId = '550e8400-e29b-41d4-a716-446655440020';
    const startResponse = await request(app)
      .post('/api/assessments/start')
      .send({
        test_id: testId,
        candidate_name: 'Partial Answer Candidate'
      });

    const assessmentId = startResponse.body.assessment_id;
    const questions = startResponse.body.questions;

    // Find Q1 and answer it correctly
    const q1 = questions.find(q => q.text === 'What is 2 + 2?');

    // Only answer Q1 correctly, leave Q2 and Q3 unanswered
    await request(app)
      .post(`/api/assessments/${assessmentId}/answer`)
      .send({
        question_id: q1.id,
        selected_options: [1] // Correct answer
      });

    // Submit without answering other questions
    const response = await request(app)
      .post(`/api/assessments/${assessmentId}/submit`)
      .expect(200);

    // Q1 weight=1, Q2 weight=2, Q3 weight=2 (total=5)
    // Answered correctly: Q1 (weight=1)
    // Expected score: 1/5 = 20%
    expect(response.body.score_percentage).toBe(20);
    expect(response.body.status).toBe('COMPLETED');
  });

  it('should POST /api/assessments/:id/answer - update existing answer (upsert)', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020';
    const startResponse = await request(app)
      .post('/api/assessments/start')
      .send({
        test_id: testId,
        candidate_name: 'Update Test Candidate'
      });

    const assessmentId = startResponse.body.assessment_id;
    const questionId = startResponse.body.questions[0].id;

    // Submit first answer
    await request(app)
      .post(`/api/assessments/${assessmentId}/answer`)
      .send({
        question_id: questionId,
        selected_options: [0]
      })
      .expect(200);

    // Update answer
    const response = await request(app)
      .post(`/api/assessments/${assessmentId}/answer`)
      .send({
        question_id: questionId,
        selected_options: [1]
      })
      .expect(200);

    expect(response.body.message).toBe('Answer recorded');
    expect(response.body.answered_questions).toBe(1);
  });
});

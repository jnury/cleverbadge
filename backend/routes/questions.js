import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { canChangeQuestionVisibility } from '../utils/visibility.js';

const router = express.Router();

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

// GET all questions (with optional filters)
router.get('/',
  authenticateToken,
  query('author_id').optional().isUUID().withMessage('author_id must be a valid UUID'),
  query('visibility').optional().isIn(VALID_VISIBILITIES).withMessage('Invalid visibility value'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { author_id, visibility } = req.query;

      let questions;

      if (author_id && visibility) {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.author_id = ${author_id} AND q.visibility = ${visibility}
          ORDER BY q.created_at DESC
        `;
      } else if (author_id) {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.author_id = ${author_id}
          ORDER BY q.created_at DESC
        `;
      } else if (visibility) {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.visibility = ${visibility}
          ORDER BY q.created_at DESC
        `;
      } else {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          ORDER BY q.created_at DESC
        `;
      }

      res.json({ questions, total: questions.length });
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }
);

// GET all authors (for filter dropdown)
router.get('/authors',
  authenticateToken,
  async (req, res) => {
    try {
      const authors = await sql`
        SELECT DISTINCT u.id, u.username
        FROM ${sql(dbSchema)}.users u
        INNER JOIN ${sql(dbSchema)}.questions q ON q.author_id = u.id
        ORDER BY u.username
      `;
      res.json({ authors });
    } catch (error) {
      console.error('Error fetching authors:', error);
      res.status(500).json({ error: 'Failed to fetch authors' });
    }
  }
);

// GET single question by ID
router.get('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const questions = await sql`
        SELECT q.*, u.username as author_username
        FROM ${sql(dbSchema)}.questions q
        LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
        WHERE q.id = ${req.params.id}
      `;

      if (questions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json(questions[0]);
    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ error: 'Failed to fetch question' });
    }
  }
);

// POST create question
router.post('/',
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required').isString().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('text').notEmpty().withMessage('Text is required').isString().withMessage('Text must be a string'),
  body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
  body('visibility').optional().isIn(VALID_VISIBILITIES).withMessage('Visibility must be public, private, or protected'),
  body('options').isArray({ min: 2, max: 10 }).withMessage('Options must be an array with 2-10 items'),
  body('options.*').isString().withMessage('Each option must be a string'),
  body('correct_answers').isArray({ min: 1 }).withMessage('Correct answers must be a non-empty array'),
  body('correct_answers.*').isString().withMessage('Each correct answer must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, text, type, visibility = 'private', options, correct_answers, tags } = req.body;

      // Validate correct_answers are in options
      const invalidAnswers = correct_answers.filter(ans => !options.includes(ans));
      if (invalidAnswers.length > 0) {
        return res.status(400).json({
          error: `Correct answers must be in options. Invalid: ${invalidAnswers.join(', ')}`
        });
      }

      // Get author_id from authenticated user
      const author_id = req.user.id;

      const newQuestions = await sql`
        INSERT INTO ${sql(dbSchema)}.questions (title, text, type, visibility, options, correct_answers, tags, author_id)
        VALUES (${title}, ${text}, ${type}, ${visibility}, ${options}, ${correct_answers}, ${tags || []}, ${author_id})
        RETURNING *
      `;

      res.status(201).json(newQuestions[0]);
    } catch (error) {
      // Check for unique constraint violation (author_id, title)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You already have a question with this title' });
      }
      console.error('Error creating question:', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }
);

// PUT update question
router.put('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  body('title').notEmpty().withMessage('Title is required').isString().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('text').notEmpty().withMessage('Text is required').isString().withMessage('Text must be a string'),
  body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
  body('visibility').optional().isIn(VALID_VISIBILITIES).withMessage('Visibility must be public, private, or protected'),
  body('options').isArray({ min: 2, max: 10 }).withMessage('Options must be an array with 2-10 items'),
  body('options.*').isString().withMessage('Each option must be a string'),
  body('correct_answers').isArray({ min: 1 }).withMessage('Correct answers must be a non-empty array'),
  body('correct_answers.*').isString().withMessage('Each correct answer must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, text, type, visibility, options, correct_answers, tags } = req.body;

      // Validate correct_answers are in options
      const invalidAnswers = correct_answers.filter(ans => !options.includes(ans));
      if (invalidAnswers.length > 0) {
        return res.status(400).json({
          error: `Correct answers must be in options. Invalid: ${invalidAnswers.join(', ')}`
        });
      }

      // Get current question
      const currentQuestions = await sql`
        SELECT * FROM ${sql(dbSchema)}.questions WHERE id = ${req.params.id}
      `;

      if (currentQuestions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      const currentQuestion = currentQuestions[0];

      // If visibility is changing, check compatibility with tests using this question
      if (visibility && visibility !== currentQuestion.visibility) {
        const testsUsingQuestion = await sql`
          SELECT t.id, t.title, t.visibility
          FROM ${sql(dbSchema)}.test_questions tq
          INNER JOIN ${sql(dbSchema)}.tests t ON tq.test_id = t.id
          WHERE tq.question_id = ${req.params.id}
        `;

        const canChange = canChangeQuestionVisibility(currentQuestion.visibility, visibility, testsUsingQuestion);

        if (!canChange.allowed) {
          const testTitles = canChange.blockedBy.map(t => t.title).join(', ');
          return res.status(400).json({
            error: `Cannot change question to ${visibility}: it is used in incompatible tests: ${testTitles}`,
            blockedBy: canChange.blockedBy
          });
        }
      }

      const updatedQuestions = await sql`
        UPDATE ${sql(dbSchema)}.questions
        SET
          title = ${title},
          text = ${text},
          type = ${type},
          visibility = ${visibility || currentQuestion.visibility},
          options = ${options},
          correct_answers = ${correct_answers},
          tags = ${tags || []},
          updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      res.json(updatedQuestions[0]);
    } catch (error) {
      // Check for unique constraint violation (author_id, title)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You already have a question with this title' });
      }
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }
);

// DELETE question
router.delete('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const deletedQuestions = await sql`
        DELETE FROM ${sql(dbSchema)}.questions
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      if (deletedQuestions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json({ message: 'Question deleted successfully', id: req.params.id });
    } catch (error) {
      // Check for foreign key constraint violation (question used in test)
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Cannot delete question: it is used in one or more tests' });
      }
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
);

export default router;

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

// GET all questions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const allQuestions = await sql`
      SELECT * FROM ${sql(dbSchema)}.questions
      ORDER BY created_at DESC
    `;
    res.json({ questions: allQuestions, total: allQuestions.length });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET question by ID
router.get('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const questions = await sql`
        SELECT * FROM ${sql(dbSchema)}.questions
        WHERE id = ${req.params.id}
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
  body('text').notEmpty().withMessage('Text is required').isString().withMessage('Text must be a string'),
  body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
  body('options').isArray({ min: 1 }).withMessage('Options must be a non-empty array'),
  body('options.*').isString().withMessage('Each option must be a string'),
  body('correct_answers').isArray({ min: 1 }).withMessage('Correct answers must be a non-empty array'),
  body('correct_answers.*').isInt({ min: 0 }).withMessage('Each correct answer must be a non-negative integer'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { text, type, options, correct_answers, tags } = req.body;

      const newQuestions = await sql`
        INSERT INTO ${sql(dbSchema)}.questions (text, type, options, correct_answers, tags)
        VALUES (${text}, ${type}, ${options}, ${correct_answers}, ${tags || []})
        RETURNING *
      `;

      res.status(201).json(newQuestions[0]);
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }
);

// PUT update question
router.put('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  body('text').notEmpty().withMessage('Text is required').isString().withMessage('Text must be a string'),
  body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
  body('options').isArray({ min: 1 }).withMessage('Options must be a non-empty array'),
  body('options.*').isString().withMessage('Each option must be a string'),
  body('correct_answers').isArray({ min: 1 }).withMessage('Correct answers must be a non-empty array'),
  body('correct_answers.*').isInt({ min: 0 }).withMessage('Each correct answer must be a non-negative integer'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { text, type, options, correct_answers, tags } = req.body;

      const updatedQuestions = await sql`
        UPDATE ${sql(dbSchema)}.questions
        SET
          text = ${text},
          type = ${type},
          options = ${options},
          correct_answers = ${correct_answers},
          tags = ${tags},
          updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      if (updatedQuestions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json(updatedQuestions[0]);
    } catch (error) {
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
      // Check if question is used in any test
      const usageCheck = await sql`
        SELECT test_id FROM ${sql(dbSchema)}.test_questions
        WHERE question_id = ${req.params.id}
        LIMIT 1
      `;

      if (usageCheck.length > 0) {
        return res.status(409).json({
          error: 'Cannot delete question that is used in one or more tests. Remove it from all tests first.'
        });
      }

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
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
);

export default router;

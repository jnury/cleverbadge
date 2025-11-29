import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { canChangeQuestionVisibility } from '../utils/visibility.js';
import { validateOptionsFormat } from '../utils/options.js';

const router = express.Router();

// Validation middleware helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Valid visibility values
const VALID_VISIBILITIES = ['public', 'private', 'protected'];

// Helper to generate archived title with proper numbering
// Returns "Title (Archived)" or "Title (Archived #N)" if there are already archived questions with same base title
async function generateArchivedTitle(currentTitle) {
  // Strip any existing "(Archived)" or "(Archived #N)" suffix
  const baseTitle = currentTitle.replace(/\s*\(Archived(?:\s*#\d+)?\)\s*$/, '').trim();

  // Count existing archived questions with same base title
  const existingArchived = await sql`
    SELECT title FROM ${sql(dbSchema)}.questions
    WHERE is_archived = true
    AND (
      title = ${baseTitle + ' (Archived)'}
      OR title ~ ${'^' + baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\(Archived #\\d+\\)$'}
    )
  `;

  if (existingArchived.length === 0) {
    return `${baseTitle} (Archived)`;
  }

  // Find the highest existing number
  let maxNum = 1; // "(Archived)" counts as #1
  for (const q of existingArchived) {
    const match = q.title.match(/\(Archived #(\d+)\)$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }

  return `${baseTitle} (Archived #${maxNum + 1})`;
}

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
          WHERE q.author_id = ${author_id} AND q.visibility = ${visibility} AND q.is_archived = false
          ORDER BY q.created_at DESC
        `;
      } else if (author_id) {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.author_id = ${author_id} AND q.is_archived = false
          ORDER BY q.created_at DESC
        `;
      } else if (visibility) {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.visibility = ${visibility} AND q.is_archived = false
          ORDER BY q.created_at DESC
        `;
      } else {
        questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(dbSchema)}.questions q
          LEFT JOIN ${sql(dbSchema)}.users u ON q.author_id = u.id
          WHERE q.is_archived = false
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
        WHERE q.is_archived = false
        ORDER BY u.username
      `;
      res.json({ authors });
    } catch (error) {
      console.error('Error fetching authors:', error);
      res.status(500).json({ error: 'Failed to fetch authors' });
    }
  }
);

// GET global success rates for all questions
router.get('/success-rates',
  authenticateToken,
  async (req, res) => {
    try {
      const successRates = await sql`
        SELECT
          q.id as question_id,
          COUNT(aa.id) as total_attempts,
          SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::integer as correct_attempts,
          CASE
            WHEN COUNT(aa.id) > 0 THEN
              ROUND(SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::decimal / COUNT(aa.id)::decimal * 100, 0)
            ELSE NULL
          END as success_rate
        FROM ${sql(dbSchema)}.questions q
        LEFT JOIN ${sql(dbSchema)}.assessment_answers aa ON aa.question_id = q.id
        LEFT JOIN ${sql(dbSchema)}.assessments a ON a.id = aa.assessment_id AND a.status = 'COMPLETED'
        WHERE q.is_archived = false
        GROUP BY q.id
      `;

      // Convert to a map for easy lookup
      const ratesMap = {};
      for (const row of successRates) {
        ratesMap[row.question_id] = {
          total_attempts: parseInt(row.total_attempts) || 0,
          correct_attempts: parseInt(row.correct_attempts) || 0,
          success_rate: row.success_rate !== null ? parseFloat(row.success_rate) : null
        };
      }

      res.json({ success_rates: ratesMap });
    } catch (error) {
      console.error('Error fetching success rates:', error);
      res.status(500).json({ error: 'Failed to fetch success rates' });
    }
  }
);

// GET all users (for change author dropdown)
router.get('/users',
  authenticateToken,
  async (req, res) => {
    try {
      const users = await sql`
        SELECT id, username
        FROM ${sql(dbSchema)}.users
        ORDER BY username
      `;
      res.json({ users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
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
        WHERE q.id = ${req.params.id} AND q.is_archived = false
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
  body('options').isObject().withMessage('Options must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, text, type, visibility = 'private', options, tags } = req.body;

      // Validate options format
      const validation = validateOptionsFormat(options, type);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid options format',
          details: validation.errors
        });
      }

      // Get author_id from authenticated user
      const author_id = req.user.id;

      const newQuestions = await sql`
        INSERT INTO ${sql(dbSchema)}.questions (title, text, type, visibility, options, tags, author_id)
        VALUES (${title}, ${text}, ${type}, ${visibility}, ${sql.json(options)}, ${tags || []}, ${author_id})
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
  body('options').isObject().withMessage('Options must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, text, type, visibility, options, tags } = req.body;

      // Validate options format
      const validation = validateOptionsFormat(options, type);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid options format',
          details: validation.errors
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
          options = ${sql.json(options)},
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

// DELETE question (soft delete - archives the question)
router.delete('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if question is used in any tests
      const testsUsingQuestion = await sql`
        SELECT t.id, t.title
        FROM ${sql(dbSchema)}.test_questions tq
        INNER JOIN ${sql(dbSchema)}.tests t ON tq.test_id = t.id
        WHERE tq.question_id = ${req.params.id} AND t.is_archived = false
      `;

      if (testsUsingQuestion.length > 0) {
        const testTitles = testsUsingQuestion.map(t => t.title).join(', ');
        return res.status(400).json({
          error: `Cannot delete question: it is used in tests: ${testTitles}`,
          testsUsing: testsUsingQuestion
        });
      }

      // Get current question title
      const currentQuestion = await sql`
        SELECT title FROM ${sql(dbSchema)}.questions
        WHERE id = ${req.params.id} AND is_archived = false
      `;

      if (currentQuestion.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Generate archived title with proper numbering
      const archivedTitle = await generateArchivedTitle(currentQuestion[0].title);

      // Soft delete - set is_archived to true and update title
      const archivedQuestions = await sql`
        UPDATE ${sql(dbSchema)}.questions
        SET is_archived = true, title = ${archivedTitle}, updated_at = NOW()
        WHERE id = ${req.params.id} AND is_archived = false
        RETURNING *
      `;

      if (archivedQuestions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json({ message: 'Question deleted successfully', id: req.params.id });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
);

// POST bulk delete questions
router.post('/bulk-delete',
  authenticateToken,
  body('question_ids').isArray({ min: 1 }).withMessage('question_ids must be a non-empty array'),
  body('question_ids.*').isUUID().withMessage('Each question_id must be a valid UUID'),
  body('force_remove_from_tests').optional().isBoolean().withMessage('force_remove_from_tests must be boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { question_ids, force_remove_from_tests = false } = req.body;

      let deleted = 0;
      let skipped = 0;
      const skipped_ids = [];

      for (const id of question_ids) {
        // Check if question is used in any tests
        const testsUsingQuestion = await sql`
          SELECT t.id, t.title
          FROM ${sql(dbSchema)}.test_questions tq
          INNER JOIN ${sql(dbSchema)}.tests t ON tq.test_id = t.id
          WHERE tq.question_id = ${id} AND t.is_archived = false
        `;

        if (testsUsingQuestion.length > 0) {
          if (force_remove_from_tests) {
            // Remove from all tests first
            await sql`
              DELETE FROM ${sql(dbSchema)}.test_questions
              WHERE question_id = ${id}
            `;
          } else {
            // Skip this question
            skipped++;
            skipped_ids.push(id);
            continue;
          }
        }

        // Get current question title
        const currentQuestion = await sql`
          SELECT title FROM ${sql(dbSchema)}.questions
          WHERE id = ${id} AND is_archived = false
        `;

        if (currentQuestion.length === 0) {
          skipped++;
          skipped_ids.push(id);
          continue;
        }

        // Generate archived title with proper numbering
        const archivedTitle = await generateArchivedTitle(currentQuestion[0].title);

        // Soft delete with title update
        const result = await sql`
          UPDATE ${sql(dbSchema)}.questions
          SET is_archived = true, title = ${archivedTitle}, updated_at = NOW()
          WHERE id = ${id} AND is_archived = false
          RETURNING id
        `;

        if (result.length > 0) {
          deleted++;
        }
      }

      res.json({ deleted, skipped, skipped_ids });
    } catch (error) {
      console.error('Error bulk deleting questions:', error);
      res.status(500).json({ error: 'Failed to bulk delete questions' });
    }
  }
);

// POST bulk change author
router.post('/bulk-change-author',
  authenticateToken,
  body('question_ids').isArray({ min: 1 }).withMessage('question_ids must be a non-empty array'),
  body('question_ids.*').isUUID().withMessage('Each question_id must be a valid UUID'),
  body('author_id').isUUID().withMessage('author_id must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { question_ids, author_id } = req.body;

      // Verify author exists
      const users = await sql`
        SELECT id FROM ${sql(dbSchema)}.users WHERE id = ${author_id}
      `;

      if (users.length === 0) {
        return res.status(404).json({ error: 'Author not found' });
      }

      // Update all questions
      const result = await sql`
        UPDATE ${sql(dbSchema)}.questions
        SET author_id = ${author_id}, updated_at = NOW()
        WHERE id = ANY(${question_ids}) AND is_archived = false
        RETURNING id
      `;

      res.json({ updated: result.length });
    } catch (error) {
      console.error('Error bulk changing author:', error);
      res.status(500).json({ error: 'Failed to bulk change author' });
    }
  }
);

// POST bulk change visibility
router.post('/bulk-change-visibility',
  authenticateToken,
  body('question_ids').isArray({ min: 1 }).withMessage('question_ids must be a non-empty array'),
  body('question_ids.*').isUUID().withMessage('Each question_id must be a valid UUID'),
  body('visibility').isIn(['public', 'private', 'protected']).withMessage('visibility must be public, private, or protected'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { question_ids, visibility } = req.body;

      // Update all questions
      const result = await sql`
        UPDATE ${sql(dbSchema)}.questions
        SET visibility = ${visibility}, updated_at = NOW()
        WHERE id = ANY(${question_ids}) AND is_archived = false
        RETURNING id
      `;

      res.json({ updated: result.length });
    } catch (error) {
      console.error('Error bulk changing visibility:', error);
      res.status(500).json({ error: 'Failed to bulk change visibility' });
    }
  }
);

export default router;

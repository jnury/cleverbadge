import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { getTestDb, getTestSchema } from '../setup.js';
import { hashPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { verifyToken } from '../../utils/jwt.js';
import { validateMarkdown } from '../../utils/markdown-validator.js';

// Create test-specific questions router that uses test database
const createTestQuestionsRouter = (sql, schema) => {
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

        // Validate markdown in question text
        const textValidation = validateMarkdown(text);
        if (!textValidation.isValid) {
          return res.status(400).json({
            error: `Invalid markdown in question text: ${textValidation.errors.join(', ')}`
          });
        }

        // Validate markdown in each option
        for (let i = 0; i < options.length; i++) {
          const optionValidation = validateMarkdown(options[i]);
          if (!optionValidation.isValid) {
            return res.status(400).json({
              error: `Invalid markdown in option ${i + 1}: ${optionValidation.errors.join(', ')}`
            });
          }
        }

        const newQuestions = await sql`
          INSERT INTO ${sql(schema)}.questions (text, type, options, correct_answers, tags)
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

        // Validate markdown in question text
        const textValidation = validateMarkdown(text);
        if (!textValidation.isValid) {
          return res.status(400).json({
            error: `Invalid markdown in question text: ${textValidation.errors.join(', ')}`
          });
        }

        // Validate markdown in each option
        for (let i = 0; i < options.length; i++) {
          const optionValidation = validateMarkdown(options[i]);
          if (!optionValidation.isValid) {
            return res.status(400).json({
              error: `Invalid markdown in option ${i + 1}: ${optionValidation.errors.join(', ')}`
            });
          }
        }

        const updatedQuestions = await sql`
          UPDATE ${sql(schema)}.questions
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

  return router;
};

let app;
let authToken;
const sql = getTestDb();
const schema = getTestSchema();

beforeAll(async () => {
  // Create Express app
  app = express();
  app.use(express.json());
  app.use('/api/questions', createTestQuestionsRouter(sql, schema));

  // Create test admin user and get auth token
  const passwordHash = await hashPassword('testpass123');
  await sql.unsafe(`
    INSERT INTO ${schema}.users (id, username, password_hash)
    VALUES ('550e8400-e29b-41d4-a716-446655440098', 'testquestionsadmin', '${passwordHash}')
    ON CONFLICT (username) DO NOTHING
  `);

  authToken = signToken({
    id: '550e8400-e29b-41d4-a716-446655440098',
    username: 'testquestionsadmin',
    role: 'ADMIN'
  });
});

describe('POST /api/questions - Markdown Validation', () => {
  it('accepts valid markdown in question text', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: '**What is** `JavaScript`?',
        type: 'SINGLE',
        options: ['A language', 'A framework'],
        correct_answers: [0],
        tags: ['programming']
      });

    expect(response.status).toBe(201);
    expect(response.body.text).toBe('**What is** `JavaScript`?');
  });

  it('accepts valid code blocks in question text', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'What does this do?\n```javascript\nconst x = 1;\n```',
        type: 'SINGLE',
        options: ['Declares variable', 'Prints output'],
        correct_answers: [0],
        tags: []
      });

    expect(response.status).toBe(201);
  });

  it('rejects unclosed code blocks in question text', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Bad code block\n```javascript\nconst x = 1;',
        type: 'SINGLE',
        options: ['A', 'B'],
        correct_answers: [0],
        tags: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/markdown/i);
    expect(response.body.error).toMatch(/unclosed code block/i);
  });

  it('accepts markdown in options', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Select the correct code',
        type: 'SINGLE',
        options: ['`const x = 1`', '`let y = 2`'],
        correct_answers: [0],
        tags: []
      });

    expect(response.status).toBe(201);
  });

  it('rejects invalid markdown in options', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Question',
        type: 'SINGLE',
        options: ['```unclosed', 'Option 2'],
        correct_answers: [1],
        tags: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid markdown in option');
    expect(response.body.error).toMatch(/unclosed code block/i);
  });
});

describe('PUT /api/questions/:id - Markdown Validation', () => {
  it('accepts valid markdown when updating question', async () => {
    // First create a question
    const createResponse = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Original question',
        type: 'SINGLE',
        options: ['A', 'B'],
        correct_answers: [0],
        tags: []
      });

    const questionId = createResponse.body.id;

    // Now update with markdown
    const response = await request(app)
      .put(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: '**Updated with** `markdown`',
        type: 'SINGLE',
        options: ['A', 'B'],
        correct_answers: [0],
        tags: []
      });

    expect(response.status).toBe(200);
    expect(response.body.text).toBe('**Updated with** `markdown`');
  });

  it('rejects invalid markdown when updating question', async () => {
    // First create a question
    const createResponse = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Original question',
        type: 'SINGLE',
        options: ['A', 'B'],
        correct_answers: [0],
        tags: []
      });

    const questionId = createResponse.body.id;

    // Try to update with invalid markdown
    const response = await request(app)
      .put(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Question with ```unclosed code',
        type: 'SINGLE',
        options: ['A', 'B'],
        correct_answers: [0],
        tags: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/markdown/i);
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { getTestDb, getTestSchema } from '../setup.js';
import { hashPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { verifyToken } from '../../utils/jwt.js';
import { validateMarkdown } from '../../utils/markdown-validator.js';
import { validateOptionsFormat } from '../../utils/options.js';

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
    body('title').notEmpty().withMessage('Title is required').isString().withMessage('Title must be a string'),
    body('text').notEmpty().withMessage('Text is required').isString().withMessage('Text must be a string'),
    body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
    body('visibility').optional().isIn(['public', 'private', 'protected']).withMessage('Invalid visibility value'),
    body('options').isObject().withMessage('Options must be an object'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isString().withMessage('Each tag must be a string'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { title, text, type, visibility = 'private', options, tags } = req.body;

        // Validate options format
        const optionsValidation = validateOptionsFormat(options, type);
        if (!optionsValidation.valid) {
          return res.status(400).json({
            error: `Invalid options format: ${optionsValidation.errors.join(', ')}`
          });
        }

        // Validate markdown in question text
        const textValidation = validateMarkdown(text);
        if (!textValidation.isValid) {
          return res.status(400).json({
            error: `Invalid markdown in question text: ${textValidation.errors.join(', ')}`
          });
        }

        // Validate markdown in each option
        for (const [key, opt] of Object.entries(options)) {
          const optionValidation = validateMarkdown(opt.text);
          if (!optionValidation.isValid) {
            return res.status(400).json({
              error: `Invalid markdown in option ${parseInt(key) + 1}: ${optionValidation.errors.join(', ')}`
            });
          }
        }

        // Get author_id from authenticated user
        const author_id = req.user.id;

        const newQuestions = await sql`
          INSERT INTO ${sql(schema)}.questions (title, text, type, visibility, options, tags, author_id)
          VALUES (${title}, ${text}, ${type}, ${visibility}, ${sql.json(options)}, ${tags || []}, ${author_id})
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
    body('title').notEmpty().withMessage('Title is required').isString().withMessage('Title must be a string'),
    body('text').notEmpty().withMessage('Text is required').isString().withMessage('Text must be a string'),
    body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
    body('visibility').optional().isIn(['public', 'private', 'protected']).withMessage('Invalid visibility value'),
    body('options').isObject().withMessage('Options must be an object'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isString().withMessage('Each tag must be a string'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { title, text, type, visibility, options, tags } = req.body;

        // Validate options format
        const optionsValidation = validateOptionsFormat(options, type);
        if (!optionsValidation.valid) {
          return res.status(400).json({
            error: `Invalid options format: ${optionsValidation.errors.join(', ')}`
          });
        }

        // Validate markdown in question text
        const textValidation = validateMarkdown(text);
        if (!textValidation.isValid) {
          return res.status(400).json({
            error: `Invalid markdown in question text: ${textValidation.errors.join(', ')}`
          });
        }

        // Validate markdown in each option
        for (const [key, opt] of Object.entries(options)) {
          const optionValidation = validateMarkdown(opt.text);
          if (!optionValidation.isValid) {
            return res.status(400).json({
              error: `Invalid markdown in option ${parseInt(key) + 1}: ${optionValidation.errors.join(', ')}`
            });
          }
        }

        const updatedQuestions = await sql`
          UPDATE ${sql(schema)}.questions
          SET
            title = ${title},
            text = ${text},
            type = ${type},
            visibility = ${visibility},
            options = ${sql.json(options)},
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
        title: 'JavaScript Question',
        text: '**What is** `JavaScript`?',
        type: 'SINGLE',
        options: {
          "0": { text: "A language", is_correct: true },
          "1": { text: "A framework", is_correct: false }
        },
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
        title: 'Code Block Question',
        text: 'What does this do?\n```javascript\nconst x = 1;\n```',
        type: 'SINGLE',
        options: {
          "0": { text: "Declares variable", is_correct: true },
          "1": { text: "Prints output", is_correct: false }
        },
        tags: []
      });

    expect(response.status).toBe(201);
  });

  it('rejects unclosed code blocks in question text', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Bad Code Block Question',
        text: 'Bad code block\n```javascript\nconst x = 1;',
        type: 'SINGLE',
        options: {
          "0": { text: "A", is_correct: true },
          "1": { text: "B", is_correct: false }
        },
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
        title: 'Markdown Options Question',
        text: 'Select the correct code',
        type: 'SINGLE',
        options: {
          "0": { text: "`const x = 1`", is_correct: true },
          "1": { text: "`let y = 2`", is_correct: false }
        },
        tags: []
      });

    expect(response.status).toBe(201);
  });

  it('rejects invalid markdown in options', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Invalid Markdown Question',
        text: 'Question',
        type: 'SINGLE',
        options: {
          "0": { text: "```unclosed", is_correct: false },
          "1": { text: "Option 2", is_correct: true }
        },
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
        title: 'Original Question',
        text: 'Original question',
        type: 'SINGLE',
        options: {
          "0": { text: "A", is_correct: true },
          "1": { text: "B", is_correct: false }
        },
        tags: []
      });

    const questionId = createResponse.body.id;

    // Now update with markdown
    const response = await request(app)
      .put(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Updated Question',
        text: '**Updated with** `markdown`',
        type: 'SINGLE',
        visibility: 'private',
        options: {
          "0": { text: "A", is_correct: true },
          "1": { text: "B", is_correct: false }
        },
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
        title: 'Another Original Question',
        text: 'Original question',
        type: 'SINGLE',
        options: {
          "0": { text: "A", is_correct: true },
          "1": { text: "B", is_correct: false }
        },
        tags: []
      });

    const questionId = createResponse.body.id;

    // Try to update with invalid markdown
    const response = await request(app)
      .put(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Invalid Update',
        text: 'Question with ```unclosed code',
        type: 'SINGLE',
        visibility: 'private',
        options: {
          "0": { text: "A", is_correct: true },
          "1": { text: "B", is_correct: false }
        },
        tags: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/markdown/i);
  });
});

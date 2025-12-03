import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { getTestDb, getTestSchema } from '../setup.js';
import { hashPassword } from '../../utils/password.js';
import { signToken, verifyToken } from '../../utils/jwt.js';
import { validateOptionsFormat } from '../../utils/options.js';
import { canChangeQuestionVisibility } from '../../utils/visibility.js';

// Test-specific router that uses test database
const createQuestionsRouter = (sql, schema) => {
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

  const VALID_VISIBILITIES = ['public', 'private', 'protected'];

  // GET all questions
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
            FROM ${sql(schema)}.questions q
            LEFT JOIN ${sql(schema)}.users u ON q.author_id = u.id
            WHERE q.author_id = ${author_id} AND q.visibility = ${visibility} AND q.is_archived = false
            ORDER BY q.created_at DESC
          `;
        } else if (author_id) {
          questions = await sql`
            SELECT q.*, u.username as author_username
            FROM ${sql(schema)}.questions q
            LEFT JOIN ${sql(schema)}.users u ON q.author_id = u.id
            WHERE q.author_id = ${author_id} AND q.is_archived = false
            ORDER BY q.created_at DESC
          `;
        } else if (visibility) {
          questions = await sql`
            SELECT q.*, u.username as author_username
            FROM ${sql(schema)}.questions q
            LEFT JOIN ${sql(schema)}.users u ON q.author_id = u.id
            WHERE q.visibility = ${visibility} AND q.is_archived = false
            ORDER BY q.created_at DESC
          `;
        } else {
          questions = await sql`
            SELECT q.*, u.username as author_username
            FROM ${sql(schema)}.questions q
            LEFT JOIN ${sql(schema)}.users u ON q.author_id = u.id
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

  // GET authors
  router.get('/authors',
    authenticateToken,
    async (req, res) => {
      try {
        const authors = await sql`
          SELECT DISTINCT u.id, u.username
          FROM ${sql(schema)}.users u
          INNER JOIN ${sql(schema)}.questions q ON q.author_id = u.id
          WHERE q.is_archived = false
          ORDER BY u.username
        `;
        res.json({ authors });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch authors' });
      }
    }
  );

  // GET users
  router.get('/users',
    authenticateToken,
    async (req, res) => {
      try {
        const users = await sql`
          SELECT id, username FROM ${sql(schema)}.users ORDER BY username
        `;
        res.json({ users });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
      }
    }
  );

  // GET single question
  router.get('/:id',
    authenticateToken,
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    handleValidationErrors,
    async (req, res) => {
      try {
        const questions = await sql`
          SELECT q.*, u.username as author_username
          FROM ${sql(schema)}.questions q
          LEFT JOIN ${sql(schema)}.users u ON q.author_id = u.id
          WHERE q.id = ${req.params.id} AND q.is_archived = false
        `;

        if (questions.length === 0) {
          return res.status(404).json({ error: 'Question not found' });
        }

        res.json(questions[0]);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch question' });
      }
    }
  );

  // POST create question
  router.post('/',
    authenticateToken,
    body('title').notEmpty().withMessage('Title is required').isString().isLength({ min: 1, max: 200 }),
    body('text').notEmpty().withMessage('Text is required').isString(),
    body('type').isIn(['SINGLE', 'MULTIPLE']).withMessage('Type must be SINGLE or MULTIPLE'),
    body('visibility').optional().isIn(VALID_VISIBILITIES),
    body('options').isObject().withMessage('Options must be an object'),
    body('tags').optional().isArray(),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { title, text, type, visibility = 'private', options, tags } = req.body;

        const validation = validateOptionsFormat(options, type);
        if (!validation.valid) {
          return res.status(400).json({ error: 'Invalid options format', details: validation.errors });
        }

        const author_id = req.user.id;

        const newQuestions = await sql`
          INSERT INTO ${sql(schema)}.questions (title, text, type, visibility, options, tags, author_id)
          VALUES (${title}, ${text}, ${type}, ${visibility}, ${sql.json(options)}, ${tags || []}, ${author_id})
          RETURNING *
        `;

        res.status(201).json(newQuestions[0]);
      } catch (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'You already have a question with this title' });
        }
        res.status(500).json({ error: 'Failed to create question' });
      }
    }
  );

  // PUT update question
  router.put('/:id',
    authenticateToken,
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    body('title').notEmpty().withMessage('Title is required'),
    body('text').notEmpty().withMessage('Text is required'),
    body('type').isIn(['SINGLE', 'MULTIPLE']),
    body('visibility').optional().isIn(VALID_VISIBILITIES),
    body('options').isObject(),
    body('tags').optional().isArray(),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { title, text, type, visibility, options, tags } = req.body;

        const validation = validateOptionsFormat(options, type);
        if (!validation.valid) {
          return res.status(400).json({ error: 'Invalid options format', details: validation.errors });
        }

        const currentQuestions = await sql`
          SELECT * FROM ${sql(schema)}.questions WHERE id = ${req.params.id}
        `;

        if (currentQuestions.length === 0) {
          return res.status(404).json({ error: 'Question not found' });
        }

        const currentQuestion = currentQuestions[0];

        // Check visibility change compatibility
        if (visibility && visibility !== currentQuestion.visibility) {
          const testsUsingQuestion = await sql`
            SELECT t.id, t.title, t.visibility
            FROM ${sql(schema)}.test_questions tq
            INNER JOIN ${sql(schema)}.tests t ON tq.test_id = t.id
            WHERE tq.question_id = ${req.params.id}
          `;

          const canChange = canChangeQuestionVisibility(currentQuestion.visibility, visibility, testsUsingQuestion);

          if (!canChange.allowed) {
            return res.status(400).json({
              error: `Cannot change question to ${visibility}: incompatible tests`,
              blockedBy: canChange.blockedBy
            });
          }
        }

        const updatedQuestions = await sql`
          UPDATE ${sql(schema)}.questions
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
        if (error.code === '23505') {
          return res.status(409).json({ error: 'You already have a question with this title' });
        }
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
        // Check if question is used in any tests
        const testsUsingQuestion = await sql`
          SELECT t.id, t.title
          FROM ${sql(schema)}.test_questions tq
          INNER JOIN ${sql(schema)}.tests t ON tq.test_id = t.id
          WHERE tq.question_id = ${req.params.id} AND t.is_archived = false
        `;

        if (testsUsingQuestion.length > 0) {
          return res.status(400).json({
            error: `Cannot delete question: it is used in tests`,
            testsUsing: testsUsingQuestion
          });
        }

        // Get current question title
        const currentQuestion = await sql`
          SELECT title FROM ${sql(schema)}.questions
          WHERE id = ${req.params.id} AND is_archived = false
        `;

        if (currentQuestion.length === 0) {
          return res.status(404).json({ error: 'Question not found' });
        }

        // Soft delete
        const archivedQuestions = await sql`
          UPDATE ${sql(schema)}.questions
          SET is_archived = true, title = ${currentQuestion[0].title + ' (Archived)'}, updated_at = NOW()
          WHERE id = ${req.params.id} AND is_archived = false
          RETURNING *
        `;

        if (archivedQuestions.length === 0) {
          return res.status(404).json({ error: 'Question not found' });
        }

        res.json({ message: 'Question deleted successfully', id: req.params.id });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete question' });
      }
    }
  );

  // POST bulk delete
  router.post('/bulk-delete',
    authenticateToken,
    body('question_ids').isArray({ min: 1 }),
    body('question_ids.*').isUUID(),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { question_ids } = req.body;
        let deleted = 0;
        let skipped = 0;
        const skipped_ids = [];

        for (const id of question_ids) {
          const testsUsing = await sql`
            SELECT t.id FROM ${sql(schema)}.test_questions tq
            INNER JOIN ${sql(schema)}.tests t ON tq.test_id = t.id
            WHERE tq.question_id = ${id} AND t.is_archived = false
          `;

          if (testsUsing.length > 0) {
            skipped++;
            skipped_ids.push(id);
            continue;
          }

          const result = await sql`
            UPDATE ${sql(schema)}.questions
            SET is_archived = true, updated_at = NOW()
            WHERE id = ${id} AND is_archived = false
            RETURNING id
          `;

          if (result.length > 0) {
            deleted++;
          } else {
            skipped++;
            skipped_ids.push(id);
          }
        }

        res.json({ deleted, skipped, skipped_ids });
      } catch (error) {
        res.status(500).json({ error: 'Failed to bulk delete questions' });
      }
    }
  );

  // POST bulk change author
  router.post('/bulk-change-author',
    authenticateToken,
    body('question_ids').isArray({ min: 1 }),
    body('question_ids.*').isUUID(),
    body('author_id').isUUID(),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { question_ids, author_id } = req.body;

        const users = await sql`
          SELECT id FROM ${sql(schema)}.users WHERE id = ${author_id}
        `;

        if (users.length === 0) {
          return res.status(404).json({ error: 'Author not found' });
        }

        const result = await sql`
          UPDATE ${sql(schema)}.questions
          SET author_id = ${author_id}, updated_at = NOW()
          WHERE id = ANY(${question_ids}) AND is_archived = false
          RETURNING id
        `;

        res.json({ updated: result.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to bulk change author' });
      }
    }
  );

  // POST bulk change visibility
  router.post('/bulk-change-visibility',
    authenticateToken,
    body('question_ids').isArray({ min: 1 }),
    body('question_ids.*').isUUID(),
    body('visibility').isIn(VALID_VISIBILITIES),
    handleValidationErrors,
    async (req, res) => {
      try {
        const { question_ids, visibility } = req.body;

        const result = await sql`
          UPDATE ${sql(schema)}.questions
          SET visibility = ${visibility}, updated_at = NOW()
          WHERE id = ANY(${question_ids}) AND is_archived = false
          RETURNING id
        `;

        res.json({ updated: result.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to bulk change visibility' });
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
  app.use('/api/questions', createQuestionsRouter(sql, schema));

  authToken = signToken({
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'testadmin',
    role: 'ADMIN'
  });
});

describe('GET /api/questions - List Questions', () => {
  it('should return all questions', async () => {
    const response = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('questions');
    expect(response.body).toHaveProperty('total');
    expect(response.body.questions.length).toBeGreaterThan(0);
  });

  it('should filter by author_id', async () => {
    const response = await request(app)
      .get('/api/questions?author_id=550e8400-e29b-41d4-a716-446655440001')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.questions.length).toBeGreaterThan(0);
    response.body.questions.forEach(q => {
      expect(q.author_id).toBe('550e8400-e29b-41d4-a716-446655440001');
    });
  });

  it('should filter by visibility', async () => {
    const response = await request(app)
      .get('/api/questions?visibility=private')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    response.body.questions.forEach(q => {
      expect(q.visibility).toBe('private');
    });
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/questions')
      .expect(401);

    expect(response.body.error).toBe('Authentication required');
  });
});

describe('GET /api/questions/authors - List Authors', () => {
  it('should return authors who have created questions', async () => {
    const response = await request(app)
      .get('/api/questions/authors')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('authors');
    expect(response.body.authors.length).toBeGreaterThan(0);
    expect(response.body.authors[0]).toHaveProperty('id');
    expect(response.body.authors[0]).toHaveProperty('username');
  });
});

describe('GET /api/questions/users - List Users', () => {
  it('should return all users', async () => {
    const response = await request(app)
      .get('/api/questions/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('users');
    expect(response.body.users.length).toBeGreaterThan(0);
  });
});

describe('GET /api/questions/:id - Get Single Question', () => {
  it('should return a question by ID', async () => {
    const questionId = '550e8400-e29b-41d4-a716-446655440010';
    const response = await request(app)
      .get(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.id).toBe(questionId);
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('text');
    expect(response.body).toHaveProperty('type');
    expect(response.body).toHaveProperty('options');
  });

  it('should return 404 for non-existent question', async () => {
    const response = await request(app)
      .get('/api/questions/550e8400-e29b-41d4-a716-446655440099')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.error).toBe('Question not found');
  });

  it('should return 400 for invalid UUID', async () => {
    const response = await request(app)
      .get('/api/questions/invalid-uuid')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.errors).toBeDefined();
  });
});

describe('POST /api/questions - Create Question', () => {
  it('should create a new question', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'New Test Question',
        text: 'What is the answer?',
        type: 'SINGLE',
        options: {
          "0": { text: "Option A", is_correct: true },
          "1": { text: "Option B", is_correct: false }
        },
        tags: ['test']
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('New Test Question');
    expect(response.body.visibility).toBe('private'); // Default
  });

  it('should reject invalid options format', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Bad Question',
        text: 'What is wrong?',
        type: 'SINGLE',
        options: {
          "0": { text: "Only option", is_correct: false } // No correct answer
        },
        tags: []
      })
      .expect(400);

    expect(response.body.error).toContain('Invalid options');
  });
});

describe('PUT /api/questions/:id - Update Question', () => {
  it('should update an existing question', async () => {
    const questionId = '550e8400-e29b-41d4-a716-446655440014'; // Sky color question

    const response = await request(app)
      .put(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Updated Sky Question',
        text: 'Is the sky blue during day?',
        type: 'SINGLE',
        options: {
          "0": { text: "Yes", is_correct: true },
          "1": { text: "No", is_correct: false }
        },
        tags: ['updated']
      })
      .expect(200);

    expect(response.body.title).toBe('Updated Sky Question');
    expect(response.body.tags).toContain('updated');
  });

  it('should return 404 for non-existent question', async () => {
    const response = await request(app)
      .put('/api/questions/550e8400-e29b-41d4-a716-446655440099')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Title',
        text: 'Text',
        type: 'SINGLE',
        options: {
          "0": { text: "A", is_correct: true },
          "1": { text: "B", is_correct: false }
        }
      })
      .expect(404);

    expect(response.body.error).toBe('Question not found');
  });
});

describe('DELETE /api/questions/:id - Delete Question', () => {
  it('should prevent deletion of question used in tests', async () => {
    // Question 550e8400-e29b-41d4-a716-446655440010 is used in math-geo test
    const questionId = '550e8400-e29b-41d4-a716-446655440010';

    const response = await request(app)
      .delete(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.error).toContain('used in tests');
    expect(response.body.testsUsing).toBeDefined();
  });

  it('should delete unused question', async () => {
    // Question 550e8400-e29b-41d4-a716-446655440013 (Primary colors) is not used
    const questionId = '550e8400-e29b-41d4-a716-446655440013';

    const response = await request(app)
      .delete(`/api/questions/${questionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.message).toBe('Question deleted successfully');
    expect(response.body.id).toBe(questionId);
  });

  it('should return 404 for non-existent question', async () => {
    const response = await request(app)
      .delete('/api/questions/550e8400-e29b-41d4-a716-446655440099')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.error).toBe('Question not found');
  });
});

describe('POST /api/questions/bulk-delete - Bulk Delete', () => {
  it('should skip questions used in tests', async () => {
    const response = await request(app)
      .post('/api/questions/bulk-delete')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question_ids: [
          '550e8400-e29b-41d4-a716-446655440010', // Used in test
          '550e8400-e29b-41d4-a716-446655440014'  // Not used
        ]
      })
      .expect(200);

    expect(response.body.deleted).toBe(1);
    expect(response.body.skipped).toBe(1);
    expect(response.body.skipped_ids).toContain('550e8400-e29b-41d4-a716-446655440010');
  });
});

describe('POST /api/questions/bulk-change-author - Bulk Change Author', () => {
  it('should change author for multiple questions', async () => {
    const response = await request(app)
      .post('/api/questions/bulk-change-author')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question_ids: ['550e8400-e29b-41d4-a716-446655440010'],
        author_id: '550e8400-e29b-41d4-a716-446655440001'
      })
      .expect(200);

    expect(response.body).toHaveProperty('updated');
  });

  it('should return 404 for non-existent author', async () => {
    const response = await request(app)
      .post('/api/questions/bulk-change-author')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question_ids: ['550e8400-e29b-41d4-a716-446655440010'],
        author_id: '550e8400-e29b-41d4-a716-446655440099'
      })
      .expect(404);

    expect(response.body.error).toBe('Author not found');
  });
});

describe('POST /api/questions/bulk-change-visibility - Bulk Change Visibility', () => {
  it('should change visibility for multiple questions', async () => {
    const response = await request(app)
      .post('/api/questions/bulk-change-visibility')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question_ids: ['550e8400-e29b-41d4-a716-446655440010'],
        visibility: 'public'
      })
      .expect(200);

    expect(response.body).toHaveProperty('updated');
    expect(response.body.updated).toBeGreaterThanOrEqual(0);
  });
});

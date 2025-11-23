import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getTestDb, getTestSchema } from '../setup.js';
import { hashPassword } from '../../utils/password.js';
import { body, validationResult } from 'express-validator';
import { verifyPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';

// Create test-specific auth router
const createTestAuthRouter = (sql, schema) => {
  const router = express.Router();

  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

  router.post('/login',
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidationErrors,

    async (req, res) => {
      try {
        const { username, password } = req.body;

        const users = await sql`
          SELECT id, username, password_hash, created_at
          FROM ${sql(schema)}.users
          WHERE username = ${username}
        `;

        if (users.length === 0) {
          return res.status(401).json({
            error: 'Invalid credentials'
          });
        }

        const user = users[0];
        const isValid = await verifyPassword(user.password_hash, password);

        if (!isValid) {
          return res.status(401).json({
            error: 'Invalid credentials'
          });
        }

        const token = signToken({
          id: user.id,
          username: user.username,
          role: 'ADMIN'
        });

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            role: 'ADMIN',
            created_at: user.created_at
          }
        });

      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  );

  return router;
};

let app;
const sql = getTestDb();
const schema = getTestSchema();

beforeAll(async () => {
  // Create Express app
  app = express();
  app.use(express.json());
  app.use('/api/auth', createTestAuthRouter(sql, schema));

  // Create test admin user with known password
  const passwordHash = await hashPassword('testpass123');
  await sql.unsafe(`
    INSERT INTO ${schema}.users (id, username, password_hash)
    VALUES ('550e8400-e29b-41d4-a716-446655440099', 'testauthadmin', '${passwordHash}')
    ON CONFLICT (username) DO NOTHING
  `);
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testauthadmin',
        password: 'testpass123'
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe('testauthadmin');
    expect(response.body.user.role).toBe('ADMIN');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('should reject invalid username', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'nonexistent',
        password: 'testpass123'
      })
      .expect(401);

    expect(response.body.error).toContain('Invalid credentials');
  });

  it('should reject invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testauthadmin',
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body.error).toContain('Invalid credentials');
  });

  it('should reject missing username', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        password: 'testpass123'
      })
      .expect(400);
  });

  it('should reject missing password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testauthadmin'
      })
      .expect(400);
  });
});

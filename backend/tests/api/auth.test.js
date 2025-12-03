import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getTestDb, getTestSchema } from '../setup.js';
import { hashPassword } from '../../utils/password.js';
import { body, validationResult } from 'express-validator';
import { verifyPassword } from '../../utils/password.js';
import { signToken, verifyToken } from '../../utils/jwt.js';
import { generateEmailToken } from '../../utils/tokens.js';
import { sendVerificationEmail } from '../../services/email.js';

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

  // Auth middleware for tests
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.user = decoded;
    next();
  };

  // Registration endpoint
  router.post('/register',
    // Validation
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('displayName').trim().isLength({ min: 2, max: 100 }).withMessage('Display name must be 2-100 characters'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    handleValidationErrors,

    async (req, res) => {
      try {
        const { email, displayName, password } = req.body;

        // Check if email already exists
        const existingEmail = await sql`
          SELECT id FROM ${sql(schema)}.users
          WHERE email = ${email}
        `;

        if (existingEmail.length > 0) {
          return res.status(409).json({
            error: 'An account with this email already exists'
          });
        }

        // Check if display name already exists
        const existingDisplayName = await sql`
          SELECT id FROM ${sql(schema)}.users
          WHERE display_name = ${displayName}
        `;

        if (existingDisplayName.length > 0) {
          return res.status(409).json({
            error: 'This display name is already taken'
          });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user (inactive until email verified)
        const newUser = await sql`
          INSERT INTO ${sql(schema)}.users (
            email, display_name, password_hash, role, is_active, email_verified
          )
          VALUES (
            ${email}, ${displayName}, ${passwordHash}, 'USER', FALSE, FALSE
          )
          RETURNING id, email, display_name, role, created_at
        `;

        const user = newUser[0];

        // Generate verification token
        const { token, expiresAt } = generateEmailToken('verification');

        // Store token in database
        await sql`
          INSERT INTO ${sql(schema)}.email_tokens (user_id, token, type, expires_at)
          VALUES (${user.id}, ${token}, 'verification', ${expiresAt})
        `;

        // Send verification email
        await sendVerificationEmail(email, displayName, token);

        res.status(201).json({
          message: 'Registration successful. Please check your email for verification link.',
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            role: user.role,
            createdAt: user.created_at
          }
        });

      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  );

  // Login endpoint - supports both username (legacy) and email
  router.post('/login',
    // Validation - accept either email or username
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidationErrors,

    async (req, res) => {
      try {
        const { email, username, password } = req.body;

        // Require either email or username
        if (!email && !username) {
          return res.status(400).json({
            error: 'Email or username is required'
          });
        }

        // Find user by email or username
        let users;
        if (email) {
          users = await sql`
            SELECT id, username, email, display_name, password_hash, role, is_active, is_disabled, email_verified, created_at
            FROM ${sql(schema)}.users
            WHERE email = ${email}
          `;
        } else {
          users = await sql`
            SELECT id, username, email, display_name, password_hash, role, is_active, is_disabled, email_verified, created_at
            FROM ${sql(schema)}.users
            WHERE username = ${username}
          `;
        }

        if (users.length === 0) {
          return res.status(401).json({
            error: 'Invalid credentials'
          });
        }

        const user = users[0];

        // Verify password
        const isValid = await verifyPassword(user.password_hash, password);

        if (!isValid) {
          return res.status(401).json({
            error: 'Invalid credentials'
          });
        }

        // Check if account is disabled
        if (user.is_disabled === true) {
          return res.status(403).json({
            error: 'Your account has been disabled. Please contact support.',
            code: 'ACCOUNT_DISABLED'
          });
        }

        // Check if account needs email verification
        // Skip check for legacy users (those without email or with username-only login)
        const isLegacyUser = !user.email || !user.display_name;
        const needsVerification = !isLegacyUser && user.is_active === false && user.email_verified === false;

        if (needsVerification) {
          return res.status(403).json({
            error: 'Please verify your email before logging in',
            code: 'EMAIL_NOT_VERIFIED'
          });
        }

        // Update last login
        await sql`
          UPDATE ${sql(schema)}.users
          SET last_login_at = NOW()
          WHERE id = ${user.id}
        `;

        // Create JWT token
        const token = signToken({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          role: user.role
        });

        // Return token and user info (without password_hash)
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.display_name,
            role: user.role,
            createdAt: user.created_at
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

  // Change password endpoint
  router.put('/password',
    authenticateToken,
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    handleValidationErrors,

    async (req, res) => {
      try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const users = await sql`
          SELECT password_hash
          FROM ${sql(schema)}.users
          WHERE id = ${userId}
        `;

        if (users.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const isValid = await verifyPassword(users[0].password_hash, currentPassword);
        if (!isValid) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const newPasswordHash = await hashPassword(newPassword);
        await sql`
          UPDATE ${sql(schema)}.users
          SET password_hash = ${newPasswordHash}
          WHERE id = ${userId}
        `;

        res.json({ message: 'Password changed successfully' });
      } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // Verify email endpoint
  router.post('/verify-email',
    body('token').notEmpty().withMessage('Token is required'),
    handleValidationErrors,

    async (req, res) => {
      try {
        const { token } = req.body;

        // Find valid token
        const tokens = await sql`
          SELECT t.id, t.user_id, t.expires_at, t.used_at, u.email
          FROM ${sql(schema)}.email_tokens t
          JOIN ${sql(schema)}.users u ON u.id = t.user_id
          WHERE t.token = ${token}
            AND t.type = 'verification'
        `;

        if (tokens.length === 0) {
          return res.status(400).json({
            error: 'Invalid verification token'
          });
        }

        const tokenRecord = tokens[0];

        // Check if already used
        if (tokenRecord.used_at) {
          return res.status(400).json({
            error: 'This token has already been used'
          });
        }

        // Check if expired
        if (new Date(tokenRecord.expires_at) < new Date()) {
          return res.status(400).json({
            error: 'This verification link has expired. Please request a new one.',
            code: 'TOKEN_EXPIRED'
          });
        }

        // Mark token as used
        await sql`
          UPDATE ${sql(schema)}.email_tokens
          SET used_at = NOW()
          WHERE id = ${tokenRecord.id}
        `;

        // Activate user
        await sql`
          UPDATE ${sql(schema)}.users
          SET is_active = TRUE, email_verified = TRUE
          WHERE id = ${tokenRecord.user_id}
        `;

        res.json({
          message: 'Email verified successfully. You can now log in.'
        });

      } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  );

  return router;
};

describe('Auth API Endpoints', () => {
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
      INSERT INTO ${schema}.users (id, username, password_hash, role, is_active, email_verified)
      VALUES ('550e8400-e29b-41d4-a716-446655440099', 'testauthadmin', '${passwordHash}', 'ADMIN', TRUE, TRUE)
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

describe('PUT /api/auth/password', () => {
  let authToken;

  beforeAll(async () => {
    // Get a valid token by logging in
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testauthadmin',
        password: 'testpass123'
      });
    authToken = response.body.token;
  });

  it('should change password with valid current password', async () => {
    const response = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: 'testpass123',
        newPassword: 'newpass456'
      })
      .expect(200);

    expect(response.body.message).toBe('Password changed successfully');

    // Verify can login with new password
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testauthadmin',
        password: 'newpass456'
      })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('token');

    // Change password back for other tests
    await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${loginResponse.body.token}`)
      .send({
        currentPassword: 'newpass456',
        newPassword: 'testpass123'
      });
  });

  it('should reject incorrect current password', async () => {
    const response = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: 'wrongpassword',
        newPassword: 'newpass456'
      })
      .expect(400);

    expect(response.body.error).toBe('Current password is incorrect');
  });

  it('should reject new password less than 6 characters', async () => {
    await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: 'testpass123',
        newPassword: '12345'
      })
      .expect(400);
  });

  it('should reject missing current password', async () => {
    await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        newPassword: 'newpass456'
      })
      .expect(400);
  });

  it('should reject request without authentication', async () => {
    await request(app)
      .put('/api/auth/password')
      .send({
        currentPassword: 'testpass123',
        newPassword: 'newpass456'
      })
      .expect(401);
  });
});

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'password123'
      })
      .expect(201);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('verification');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('newuser@example.com');
    expect(response.body.user.displayName).toBe('New User');
    expect(response.body.user.role).toBe('USER');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('should reject duplicate email', async () => {
    // First registration
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@example.com',
        displayName: 'First User',
        password: 'password123'
      });

    // Second registration with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@example.com',
        displayName: 'Second User',
        password: 'password123'
      })
      .expect(409);

    expect(response.body.error).toContain('email');
  });

  it('should reject duplicate display name', async () => {
    // First registration
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user1@example.com',
        displayName: 'SameName',
        password: 'password123'
      });

    // Second registration with same display name
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user2@example.com',
        displayName: 'SameName',
        password: 'password123'
      })
      .expect(409);

    expect(response.body.error).toContain('display name');
  });

  it('should reject invalid email format', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        displayName: 'Test User',
        password: 'password123'
      })
      .expect(400);
  });

  it('should reject password less than 8 characters', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'short'
      })
      .expect(400);
  });

  it('should reject display name less than 2 characters', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        displayName: 'A',
        password: 'password123'
      })
      .expect(400);
  });
});

describe('POST /api/auth/login (with email)', () => {
  it('should login with email and password', async () => {
    // First register a user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'emaillogin@example.com',
        displayName: 'Email Login User',
        password: 'password123'
      });

    // Manually activate the user for testing
    await sql`
      UPDATE ${sql(schema)}.users
      SET is_active = TRUE, email_verified = TRUE
      WHERE email = 'emaillogin@example.com'
    `;

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'emaillogin@example.com',
        password: 'password123'
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('emaillogin@example.com');
    expect(response.body.user.displayName).toBe('Email Login User');
  });

  it('should reject login for inactive user', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'inactive@example.com',
        displayName: 'Inactive User',
        password: 'password123'
      });

    // Don't activate the user

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'inactive@example.com',
        password: 'password123'
      })
      .expect(403);

    expect(response.body.error).toContain('verify');
  });

  it('should reject login for disabled user', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'disabled@example.com',
        displayName: 'Disabled User',
        password: 'password123'
      });

    // Activate but disable
    await sql`
      UPDATE ${sql(schema)}.users
      SET is_active = TRUE, email_verified = TRUE, is_disabled = TRUE
      WHERE email = 'disabled@example.com'
    `;

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'disabled@example.com',
        password: 'password123'
      })
      .expect(403);

    expect(response.body.error).toContain('disabled');
  });

  it('should still allow username login for legacy admins', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testauthadmin',
        password: 'testpass123'
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body.user.username).toBe('testauthadmin');
  });
});

describe('POST /api/auth/verify-email', () => {
  it('should verify email with valid token', async () => {
    // Register a user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'verify@example.com',
        displayName: 'Verify User',
        password: 'password123'
      });

    // Get the token from database
    const tokens = await sql`
      SELECT token FROM ${sql(schema)}.email_tokens
      WHERE type = 'verification'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: tokens[0].token })
      .expect(200);

    expect(response.body.message).toContain('verified');

    // Verify user is now active
    const users = await sql`
      SELECT is_active, email_verified
      FROM ${sql(schema)}.users
      WHERE email = 'verify@example.com'
    `;
    expect(users[0].is_active).toBe(true);
    expect(users[0].email_verified).toBe(true);
  });

  it('should reject invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'invalid-token-12345' })
      .expect(400);

    expect(response.body.error).toContain('Invalid');
  });

  it('should reject expired token', async () => {
    // Register user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'expired@example.com',
        displayName: 'Expired Token User',
        password: 'password123'
      });

    // Get and expire the token
    const tokens = await sql`
      SELECT token FROM ${sql(schema)}.email_tokens
      WHERE type = 'verification'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    await sql`
      UPDATE ${sql(schema)}.email_tokens
      SET expires_at = NOW() - INTERVAL '1 hour'
      WHERE token = ${tokens[0].token}
    `;

    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: tokens[0].token })
      .expect(400);

    expect(response.body.error).toContain('expired');
  });
});

}); // Close outer Auth API Endpoints describe

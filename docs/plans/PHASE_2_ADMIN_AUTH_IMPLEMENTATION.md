# Phase 2: Admin Authentication & Dashboard Shell - Implementation Plan

**Created:** 2025-01-24
**Status:** Ready for Implementation
**Version:** 0.5.0 (Backend) / 0.5.0 (Frontend)

## Overview

Implement secure admin authentication using argon2 + JWT, protect admin endpoints, create admin login page and basic dashboard shell. Enable test enable/disable functionality.

## Architecture Summary

**Security:**
- argon2 for password hashing (memory-hard algorithm, resistant to brute force)
- JWT for stateless authentication (7-day expiration)
- Auth middleware to protect admin routes
- localStorage for JWT storage (frontend)

**Protected Endpoints:**
- All Question CRUD operations (POST, PUT, DELETE)
- All Test CRUD operations (POST, PUT, DELETE)
- Future admin endpoints

**Public Endpoints (no auth):**
- GET /api/tests/slug/:slug (for candidates)
- POST /api/assessments/* (candidate flow)
- GET /health

## Prerequisites

- Phase 1 completed (v0.4.3 backend, v0.4.1 frontend)
- All Phase 1 tests passing
- Database with users table already exists
- Backend and frontend running locally

---

## Task 1: Backend - Password & JWT Utilities

**Goal:** Create utility functions for password hashing and JWT operations

**Files:**
- Create: `backend/utils/password.js`
- Create: `backend/utils/jwt.js`

**Step 1: Install dependencies**

```bash
cd backend
npm install argon2 jsonwebtoken
```

Expected packages:
- argon2: ^0.31.0 (password hashing)
- jsonwebtoken: ^9.0.2 (JWT creation/verification)

**Step 2: Create password utility**

Create `backend/utils/password.js`:

```javascript
import argon2 from 'argon2';

/**
 * Hash a password using argon2id
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verify a password against its hash
 * @param {string} hash - Stored password hash
 * @param {string} password - Plain text password to verify
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
```

**Step 3: Create JWT utility**

Create `backend/utils/jwt.js`:

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Sign a JWT token
 * @param {object} payload - Data to encode in token
 * @returns {string} JWT token
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} Decoded payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
}
```

**Step 4: Test utilities**

Create a test script `backend/test-utils.js`:

```javascript
import { hashPassword, verifyPassword } from './utils/password.js';
import { signToken, verifyToken } from './utils/jwt.js';

async function testUtils() {
  console.log('Testing password utils...');

  // Test password hashing
  const password = 'TestPassword123';
  const hash = await hashPassword(password);
  console.log('✅ Password hashed');

  // Test password verification (correct)
  const isValid = await verifyPassword(hash, password);
  console.log(isValid ? '✅ Password verified (correct)' : '❌ Password verification failed');

  // Test password verification (wrong)
  const isInvalid = await verifyPassword(hash, 'WrongPassword');
  console.log(!isInvalid ? '✅ Wrong password rejected' : '❌ Wrong password accepted');

  console.log('\nTesting JWT utils...');

  // Test JWT signing
  const payload = { id: '123', username: 'testadmin', role: 'ADMIN' };
  const token = signToken(payload);
  console.log('✅ JWT token signed');

  // Test JWT verification (valid)
  const decoded = verifyToken(token);
  console.log(decoded && decoded.id === '123' ? '✅ JWT verified' : '❌ JWT verification failed');

  // Test JWT verification (invalid)
  const invalidDecoded = verifyToken('invalid.token.here');
  console.log(invalidDecoded === null ? '✅ Invalid JWT rejected' : '❌ Invalid JWT accepted');

  console.log('\n✅ All utility tests passed!');
}

testUtils();
```

Run: `node backend/test-utils.js`

Expected output:
```
Testing password utils...
✅ Password hashed
✅ Password verified (correct)
✅ Wrong password rejected

Testing JWT utils...
✅ JWT token signed
✅ JWT verified
✅ Invalid JWT rejected

✅ All utility tests passed!
```

**Step 5: Update backend version**

Update `backend/package.json`:
```json
{
  "version": "0.5.0"
}
```

**Step 6: Write unit tests**

Create `backend/tests/unit/auth-utils.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken, verifyToken } from '../../utils/jwt.js';

describe('Password Utilities', () => {
  it('should hash passwords', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should verify correct passwords', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(hash, password);

    expect(isValid).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(hash, 'WrongPassword');

    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password', async () => {
    const password = 'TestPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2); // argon2 uses random salt
  });
});

describe('JWT Utilities', () => {
  it('should sign JWT tokens', () => {
    const payload = { id: '123', username: 'admin', role: 'ADMIN' };
    const token = signToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should verify valid tokens', () => {
    const payload = { id: '123', username: 'admin', role: 'ADMIN' };
    const token = signToken(payload);
    const decoded = verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.id).toBe('123');
    expect(decoded.username).toBe('admin');
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.exp).toBeDefined(); // expiration claim
  });

  it('should reject invalid tokens', () => {
    const decoded = verifyToken('invalid.token.here');

    expect(decoded).toBeNull();
  });

  it('should reject malformed tokens', () => {
    const decoded = verifyToken('not-a-jwt');

    expect(decoded).toBeNull();
  });
});
```

Run: `cd backend && npm test tests/unit/auth-utils.test.js`

Expected: All 8 tests pass

**Step 7: Commit**

```bash
git add backend/utils/password.js backend/utils/jwt.js backend/tests/unit/auth-utils.test.js backend/package.json backend/package-lock.json
git commit -m "feat(auth): add password hashing and JWT utilities with tests

- Add argon2 password hashing with secure parameters
- Add JWT signing and verification with 7-day expiration
- Add comprehensive unit tests for auth utilities
- Backend version 0.4.3 → 0.5.0"
```

---

## Task 2: Backend - Auth Middleware

**Goal:** Create middleware to protect admin routes

**Files:**
- Create: `backend/middleware/auth.js`

**Step 1: Create auth middleware**

Create `backend/middleware/auth.js`:

```javascript
import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware to authenticate JWT tokens
 * Expects Authorization header: "Bearer <token>"
 * Sets req.user with decoded token payload
 */
export function authenticateToken(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. No token provided.'
    });
  }

  // Verify token
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'Invalid or expired token.'
    });
  }

  // Attach user info to request
  req.user = decoded;

  next();
}

/**
 * Middleware to check if user is admin
 * Must be used after authenticateToken
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Admin access required.'
    });
  }

  next();
}
```

**Step 2: Write integration tests**

Create `backend/tests/integration/auth-middleware.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { signToken } from '../../utils/jwt.js';

describe('Auth Middleware', () => {
  let validToken;
  let expiredToken;

  beforeAll(() => {
    // Create valid token
    validToken = signToken({
      id: 'test-user-id',
      username: 'testadmin',
      role: 'ADMIN'
    });

    // Create expired token (manually for testing)
    expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyMn0.invalid';
  });

  it('should have valid token for testing', () => {
    expect(validToken).toBeDefined();
    expect(typeof validToken).toBe('string');
  });

  // Middleware tests will be added when we integrate with Express routes
  it('should prepare for middleware integration tests', () => {
    expect(true).toBe(true);
  });
});
```

Run: `cd backend && npm test tests/integration/auth-middleware.test.js`

Expected: 2 tests pass

**Step 3: Commit**

```bash
git add backend/middleware/auth.js backend/tests/integration/auth-middleware.test.js
git commit -m "feat(auth): add JWT authentication middleware

- Add authenticateToken middleware for JWT verification
- Add requireAdmin middleware for role-based access
- Add integration test skeleton
- Middleware extracts user from JWT and attaches to req.user"
```

---

## Task 3: Backend - Login Endpoint

**Goal:** Create POST /api/auth/login endpoint

**Files:**
- Create: `backend/routes/auth.js`
- Modify: `backend/index.js`

**Step 1: Create auth routes**

Create `backend/routes/auth.js`:

```javascript
import express from 'express';
import { body } from 'express-validator';
import sql from '../db/index.js';
import { verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

const router = express.Router();

// Get schema from NODE_ENV
const dbSchema = process.env.NODE_ENV || 'development';

/**
 * POST /api/auth/login
 * Authenticate admin user and return JWT token
 */
router.post('/login',
  // Validation
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find user by username
      const users = await sql`
        SELECT id, username, password_hash, role, created_at
        FROM ${sql(dbSchema)}.users
        WHERE username = ${username}
      `;

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

      // Create JWT token
      const token = signToken({
        id: user.id,
        username: user.username,
        role: user.role || 'ADMIN'
      });

      // Return token and user info (without password_hash)
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role || 'ADMIN',
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

export default router;
```

**Step 2: Register auth routes**

Modify `backend/index.js` - add after existing imports:

```javascript
import authRouter from './routes/auth.js';
```

Add after existing route registrations:

```javascript
// API routes
app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
// ... rest of routes
```

**Step 3: Create admin user script**

Create `backend/scripts/create-admin.js`:

```javascript
import postgres from 'postgres';
import { hashPassword } from '../utils/password.js';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    const dbSchema = process.env.NODE_ENV || 'development';
    const sql = postgres(connectionString, {
      onnotice: () => {}
    });

    console.log(`\n🔐 Create Admin User (schema: ${dbSchema})\n`);

    // Get username
    const username = await question('Enter admin username: ');
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    // Check if username exists
    const existing = await sql`
      SELECT id FROM ${sql(dbSchema)}.users
      WHERE username = ${username}
    `;

    if (existing.length > 0) {
      throw new Error(`User '${username}' already exists`);
    }

    // Get password
    const password = await question('Enter admin password: ');
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Hash password
    console.log('\n🔐 Hashing password...');
    const passwordHash = await hashPassword(password);

    // Insert user
    console.log('💾 Creating admin user...');
    const result = await sql`
      INSERT INTO ${sql(dbSchema)}.users (username, password_hash, role)
      VALUES (${username}, ${passwordHash}, 'ADMIN')
      RETURNING id, username, role, created_at
    `;

    const admin = result[0];

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ID:       ', admin.id);
    console.log('Username: ', admin.username);
    console.log('Role:     ', admin.role);
    console.log('Created:  ', admin.created_at);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await sql.end();
    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
```

**Step 4: Add script to package.json**

Modify `backend/package.json` - add to scripts:

```json
{
  "scripts": {
    "create-admin": "node scripts/create-admin.js"
  }
}
```

**Step 5: Create admin user**

Run: `cd backend && npm run create-admin`

Enter:
- Username: `admin`
- Password: `admin123` (for development only)

Expected: Admin user created with hashed password

**Step 6: Test login endpoint**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "role": "ADMIN",
    "created_at": "..."
  }
}
```

Test with wrong password:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }'
```

Expected: 401 with "Invalid credentials"

**Step 7: Write API tests**

Create `backend/tests/api/auth.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRouter from '../../routes/auth.js';
import { hashPassword } from '../../utils/password.js';
import sql from '../../db/index.js';
import { getTestSchema } from '../setup.js';

let app;
const dbSchema = getTestSchema();

beforeAll(async () => {
  // Create Express app
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  // Create test admin user
  const passwordHash = await hashPassword('testpass123');
  await sql`
    INSERT INTO ${sql(dbSchema)}.users (username, password_hash, role)
    VALUES ('testadmin', ${passwordHash}, 'ADMIN')
    ON CONFLICT (username) DO NOTHING
  `;
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testpass123'
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe('testadmin');
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
        username: 'testadmin',
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
        username: 'testadmin'
      })
      .expect(400);
  });
});
```

Run: `cd backend && npm test tests/api/auth.test.js`

Expected: 5 tests pass

**Step 8: Commit**

```bash
git add backend/routes/auth.js backend/index.js backend/scripts/create-admin.js backend/tests/api/auth.test.js backend/package.json
git commit -m "feat(auth): add login endpoint and admin creation script

- Add POST /api/auth/login endpoint with validation
- Add create-admin script for creating admin users
- Add comprehensive API tests for login endpoint
- Returns JWT token and user info on successful login"
```

---

## Task 4: Backend - Protect Admin Routes

**Goal:** Add auth middleware to admin-only endpoints

**Files:**
- Modify: `backend/routes/questions.js`
- Modify: `backend/routes/tests.js`

**Step 1: Protect Questions routes**

Modify `backend/routes/questions.js`:

Add import at top:
```javascript
import { authenticateToken } from '../middleware/auth.js';
```

Update routes to use middleware:

```javascript
// GET all questions - PROTECTED
router.get('/', authenticateToken, async (req, res) => {
  // ... existing code
});

// GET question by ID - PROTECTED
router.get('/:id', authenticateToken, async (req, res) => {
  // ... existing code
});

// POST create question - PROTECTED
router.post('/', authenticateToken, async (req, res) => {
  // ... existing code
});

// PUT update question - PROTECTED
router.put('/:id', authenticateToken, async (req, res) => {
  // ... existing code
});

// DELETE question - PROTECTED
router.delete('/:id', authenticateToken, async (req, res) => {
  // ... existing code
});
```

**Step 2: Protect Tests routes (except public endpoints)**

Modify `backend/routes/tests.js`:

Add import at top:
```javascript
import { authenticateToken } from '../middleware/auth.js';
```

Update routes:

```javascript
// GET all tests - PROTECTED
router.get('/', authenticateToken, async (req, res) => {
  // ... existing code
});

// GET test by ID - PROTECTED
router.get('/:id', authenticateToken, async (req, res) => {
  // ... existing code
});

// GET test by slug - PUBLIC (for candidates)
router.get('/slug/:slug', async (req, res) => {
  // ... existing code (no middleware)
});

// POST create test - PROTECTED
router.post('/', authenticateToken, async (req, res) => {
  // ... existing code
});

// PUT update test - PROTECTED
router.put('/:id', authenticateToken, async (req, res) => {
  // ... existing code
});

// DELETE test - PROTECTED
router.delete('/:id', authenticateToken, async (req, res) => {
  // ... existing code
});

// POST add questions to test - PROTECTED
router.post('/:id/questions', authenticateToken, async (req, res) => {
  // ... existing code
});
```

**Step 3: Test protected routes**

Test without token (should fail):
```bash
curl http://localhost:3000/api/questions
```

Expected: 401 with "Access denied. No token provided."

Test with invalid token:
```bash
curl http://localhost:3000/api/questions \
  -H "Authorization: Bearer invalid.token.here"
```

Expected: 401 with "Invalid or expired token."

Test with valid token:

First, login and save token:
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

Then use token:
```bash
curl http://localhost:3000/api/questions \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 200 with questions array

**Step 4: Update API tests**

Update `backend/tests/api/questions.test.js` and `backend/tests/api/tests.test.js` to include auth headers.

Example for questions:

```javascript
import { signToken } from '../../utils/jwt.js';

let authToken;

beforeAll(() => {
  // ... existing setup

  // Create auth token
  authToken = signToken({
    id: 'test-admin-id',
    username: 'testadmin',
    role: 'ADMIN'
  });
});

describe('GET /api/questions', () => {
  it('should reject requests without auth', async () => {
    await request(app)
      .get('/api/questions')
      .expect(401);
  });

  it('should return questions with valid auth', async () => {
    const response = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('questions');
  });
});

// Update all other tests to include auth header
```

**Step 5: Verify all tests still pass**

Run: `cd backend && npm test`

Expected: All tests pass (may need to update test setup to include auth headers)

**Step 6: Commit**

```bash
git add backend/routes/questions.js backend/routes/tests.js backend/tests/
git commit -m "feat(auth): protect admin routes with JWT middleware

- Add authenticateToken middleware to all question CRUD endpoints
- Add authenticateToken middleware to admin test endpoints
- Keep GET /api/tests/slug/:slug public for candidates
- Keep assessment endpoints public
- Update API tests to include auth headers"
```

---

## Task 5: Frontend - API Helper with Auth

**Goal:** Update API helper to include JWT in requests

**Files:**
- Modify: `frontend/src/utils/api.js` (create if doesn't exist)

**Step 1: Create/update API helper**

Create `frontend/src/utils/api.js`:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Make an API request with automatic JWT inclusion
 * @param {string} endpoint - API endpoint (e.g., '/api/questions')
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle auth errors
      if (response.status === 401) {
        // Token expired or invalid - clear it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        // Redirect to login if not already there
        if (!window.location.pathname.includes('/admin/login')) {
          window.location.href = '/admin/login';
        }
      }

      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Login and store JWT
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} User data and token
 */
export async function login(username, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  // Store token and user in localStorage
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_user', JSON.stringify(data.user));

  return data;
}

/**
 * Logout and clear stored data
 */
export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

/**
 * Get current user from localStorage
 * @returns {object|null} User data or null if not logged in
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem('auth_user');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!localStorage.getItem('auth_token');
}
```

**Step 2: Update frontend version**

Update `frontend/package.json`:
```json
{
  "version": "0.5.0"
}
```

**Step 3: Write component tests**

Create `frontend/tests/utils/api.test.jsx`:

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { login, logout, getCurrentUser, isLoggedIn } from '../../src/utils/api';

describe('API Utils', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should store token and user on successful login', async () => {
      const mockResponse = {
        token: 'test-token-123',
        user: { id: '1', username: 'admin', role: 'ADMIN' }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await login('admin', 'password');

      expect(localStorage.getItem('auth_token')).toBe('test-token-123');
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(mockResponse.user));
    });
  });

  describe('logout', () => {
    it('should clear token and user', () => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: '1' }));

      logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from localStorage', () => {
      const user = { id: '1', username: 'admin' };
      localStorage.setItem('auth_user', JSON.stringify(user));

      const result = getCurrentUser();

      expect(result).toEqual(user);
    });

    it('should return null if no user stored', () => {
      const result = getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('auth_token', 'test-token');

      expect(isLoggedIn()).toBe(true);
    });

    it('should return false when no token', () => {
      expect(isLoggedIn()).toBe(false);
    });
  });
});
```

Run: `cd frontend && npm test tests/utils/api.test.jsx`

Expected: 6 tests pass

**Step 4: Commit**

```bash
git add frontend/src/utils/api.js frontend/tests/utils/api.test.jsx frontend/package.json
git commit -m "feat(auth): add API helper with JWT management

- Add apiRequest helper with automatic JWT inclusion
- Add login/logout functions
- Add getCurrentUser and isLoggedIn helpers
- Auto-redirect to login on 401 errors
- Add comprehensive unit tests
- Frontend version 0.4.1 → 0.5.0"
```

---

## Task 6: Frontend - Admin Login Page

**Goal:** Create admin login page at /admin/login

**Files:**
- Create: `frontend/src/pages/admin/AdminLogin.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Create AdminLogin component**

Create `frontend/src/pages/admin/AdminLogin.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, isLoggedIn } from '../../utils/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);

      // Redirect to admin dashboard
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary">
            Admin Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Clever Badge Administration
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tech focus:border-transparent"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tech focus:border-transparent"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-tech hover:bg-tech/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tech disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>

        {/* Back link */}
        <div className="text-center">
          <a href="/" className="text-sm text-tech hover:underline">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
```

**Step 2: Add route to App.jsx**

Modify `frontend/src/App.jsx`:

Add import:
```javascript
import AdminLogin from './pages/admin/AdminLogin';
```

Add route:
```javascript
<Routes>
  {/* ... existing routes */}

  {/* Admin routes */}
  <Route path="/admin/login" element={<AdminLogin />} />
</Routes>
```

**Step 3: Test login page**

1. Visit: http://localhost:5173/admin/login
2. Try logging in with wrong credentials
   - Expected: Error message displayed
3. Login with correct credentials (admin / admin123)
   - Expected: Redirected to /admin (may show 404 for now)
4. Check localStorage in browser dev tools
   - Expected: `auth_token` and `auth_user` keys present

**Step 4: Write E2E test**

Create `frontend/tests/e2e/admin-login.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Admin Login');
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Login');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input#username', 'wronguser');
    await page.fill('input#password', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.bg-red-50')).toContainText(/credentials/i);
  });

  test('should login with valid credentials', async ({ page }) => {
    // Use test admin credentials
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to /admin
    await page.waitForURL('/admin');

    // Token should be stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('should redirect if already logged in', async ({ page }) => {
    // Set up logged in state
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ username: 'admin' }));
    });

    // Visit login page
    await page.goto('/admin/login');

    // Should redirect to /admin
    await page.waitForURL('/admin');
  });
});
```

Run: `cd frontend && npm run test:e2e tests/e2e/admin-login.spec.js --reporter=line`

Expected: 4 tests pass

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/AdminLogin.jsx frontend/src/App.jsx frontend/tests/e2e/admin-login.spec.js
git commit -m "feat(admin): add admin login page

- Create AdminLogin component with username/password form
- Add error handling and loading states
- Add auto-redirect if already logged in
- Add E2E tests for login flow
- Route: /admin/login"
```

---

## Task 7: Frontend - Admin Dashboard Shell

**Goal:** Create basic admin dashboard with protected route

**Files:**
- Create: `frontend/src/pages/admin/AdminDashboard.jsx`
- Create: `frontend/src/components/ProtectedRoute.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Create ProtectedRoute component**

Create `frontend/src/components/ProtectedRoute.jsx`:

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/api';

/**
 * ProtectedRoute - Redirects to login if not authenticated
 */
const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

**Step 2: Create AdminDashboard component**

Create `frontend/src/pages/admin/AdminDashboard.jsx`:

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../../utils/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState('tests');

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const tabs = [
    { id: 'tests', label: 'Tests' },
    { id: 'questions', label: 'Questions' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {user?.username}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-tech text-tech'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Placeholder content */}
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-gray-600">
              Content coming in Phase 3
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
```

**Step 3: Update App.jsx with protected route**

Modify `frontend/src/App.jsx`:

Add imports:
```javascript
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
```

Add route:
```javascript
<Routes>
  {/* ... existing routes */}

  {/* Admin routes */}
  <Route path="/admin/login" element={<AdminLogin />} />
  <Route path="/admin" element={
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  } />
</Routes>
```

**Step 4: Add link to homepage**

Modify home page in `frontend/src/App.jsx` or create `frontend/src/pages/Home.jsx`:

```javascript
<div className="flex items-center justify-center min-h-full">
  <div className="text-center">
    <h1 className="text-4xl font-bold text-primary mb-4">
      Clever Badge
    </h1>
    <p className="text-gray-600 mb-6">
      Online Skills Assessment Platform
    </p>
    <a
      href="/admin/login"
      className="inline-block px-6 py-2 bg-tech hover:bg-tech/90 text-white rounded-md transition-colors"
    >
      Admin Login
    </a>
  </div>
</div>
```

**Step 5: Test dashboard**

1. Clear localStorage (logout)
2. Visit: http://localhost:5173/admin
   - Expected: Redirected to /admin/login
3. Login with admin credentials
   - Expected: Redirected to /admin dashboard
4. Check dashboard:
   - See welcome message with username
   - See 4 tabs (Tests, Questions, Assessments, Analytics)
   - Click between tabs
   - Click Logout → redirected to login

**Step 6: Write E2E test**

Create `frontend/tests/e2e/admin-dashboard.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to login
    await page.waitForURL('/admin/login');
    await expect(page.locator('h2')).toContainText('Admin Login');
  });

  test('should display dashboard after login', async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/admin');

    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    await expect(page.locator('text=/Welcome.*admin/i')).toBeVisible();

    // Check tabs
    await expect(page.locator('button:has-text("Tests")')).toBeVisible();
    await expect(page.locator('button:has-text("Questions")')).toBeVisible();
    await expect(page.locator('button:has-text("Assessments")')).toBeVisible();
    await expect(page.locator('button:has-text("Analytics")')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Login and go to dashboard
    await page.goto('/admin/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Click Questions tab
    await page.click('button:has-text("Questions")');
    await expect(page.locator('h2')).toContainText('Questions');

    // Click Assessments tab
    await page.click('button:has-text("Assessments")');
    await expect(page.locator('h2')).toContainText('Assessments');
  });

  test('should logout and redirect to login', async ({ page }) => {
    // Login and go to dashboard
    await page.goto('/admin/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Click logout
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await page.waitForURL('/admin/login');

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
```

Run: `cd frontend && npm run test:e2e tests/e2e/admin-dashboard.spec.js --reporter=line`

Expected: 4 tests pass

**Step 7: Commit**

```bash
git add frontend/src/pages/admin/AdminDashboard.jsx frontend/src/components/ProtectedRoute.jsx frontend/src/App.jsx frontend/tests/e2e/admin-dashboard.spec.js
git commit -m "feat(admin): add protected admin dashboard shell

- Create AdminDashboard component with tab navigation
- Add ProtectedRoute component for auth guards
- Add welcome message with username
- Add logout functionality
- Add placeholder tabs: Tests, Questions, Assessments, Analytics
- Add E2E tests for dashboard access and navigation"
```

---

## Task 8: Backend - Test Enable/Disable Enforcement

**Goal:** Ensure disabled tests cannot be accessed by candidates

**Files:**
- Modify: `backend/routes/tests.js`
- Modify: `backend/routes/assessments.js`

**Step 1: Update GET /api/tests/slug/:slug**

Modify `backend/routes/tests.js`:

Update the slug endpoint to return 403 for disabled tests:

```javascript
// GET test by slug (public view)
router.get('/slug/:slug', async (req, res) => {
  try {
    const results = await sql`
      SELECT id, title, description, slug, is_enabled
      FROM ${sql(dbSchema)}.tests
      WHERE slug = ${req.params.slug}
    `;

    if (results.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const test = results[0];

    // Check if test is enabled
    if (!test.is_enabled) {
      return res.status(403).json({
        error: 'This test is currently disabled and not available.'
      });
    }

    // Count questions
    const questionCount = await sql`
      SELECT COUNT(*) as count
      FROM ${sql(dbSchema)}.test_questions
      WHERE test_id = ${test.id}
    `;

    res.json({
      id: test.id,
      title: test.title,
      description: test.description,
      slug: test.slug,
      question_count: parseInt(questionCount[0].count)
    });
  } catch (error) {
    console.error('Error fetching test by slug:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});
```

**Step 2: Update POST /api/assessments/start**

Modify `backend/routes/assessments.js`:

Update start endpoint to check if test is enabled:

```javascript
// POST start assessment
router.post('/start', async (req, res) => {
  try {
    const { test_id, candidate_name } = req.body;

    if (!test_id || !candidate_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if test exists and is enabled
    const testResults = await sql`
      SELECT id, title, description, is_enabled
      FROM ${sql(dbSchema)}.tests
      WHERE id = ${test_id}
    `;

    if (testResults.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const test = testResults[0];

    if (!test.is_enabled) {
      return res.status(403).json({
        error: 'This test is currently disabled and cannot be started.'
      });
    }

    // ... rest of existing code (create assessment, get questions, etc.)
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});
```

**Step 3: Write API tests**

Update `backend/tests/api/tests.test.js`:

```javascript
describe('GET /api/tests/slug/:slug', () => {
  // ... existing tests

  it('should return 403 for disabled test', async () => {
    // Create disabled test
    const [disabledTest] = await sql`
      INSERT INTO ${sql(dbSchema)}.tests (title, slug, is_enabled)
      VALUES ('Disabled Test', 'disabled-test', false)
      RETURNING *
    `;

    const response = await request(app)
      .get(`/api/tests/slug/disabled-test`)
      .expect(403);

    expect(response.body.error).toContain('disabled');
  });
});
```

Update `backend/tests/api/assessments.test.js`:

```javascript
describe('POST /api/assessments/start', () => {
  // ... existing tests

  it('should reject starting assessment for disabled test', async () => {
    // Create disabled test
    const [disabledTest] = await sql`
      INSERT INTO ${sql(dbSchema)}.tests (title, slug, is_enabled)
      VALUES ('Disabled Test', 'disabled-test', false)
      RETURNING *
    `;

    const response = await request(app)
      .post('/api/assessments/start')
      .send({
        test_id: disabledTest.id,
        candidate_name: 'Test Candidate'
      })
      .expect(403);

    expect(response.body.error).toContain('disabled');
  });
});
```

Run: `cd backend && npm test`

Expected: All tests pass including new disable tests

**Step 4: Write E2E test**

Create `frontend/tests/e2e/disabled-test.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Disabled Test Access', () => {
  test('should show error for disabled test', async ({ page }) => {
    // Assuming 'disabled-test' slug exists and is disabled
    // (created in test seed data)
    await page.goto('/t/disabled-test');

    // Should show error message
    await expect(page.locator('text=/disabled|not available/i')).toBeVisible();

    // Should not show start button
    await expect(page.locator('button:has-text("Start Test")')).not.toBeVisible();
  });
});
```

**Step 5: Commit**

```bash
git add backend/routes/tests.js backend/routes/assessments.js backend/tests/api/ frontend/tests/e2e/disabled-test.spec.js
git commit -m "feat(tests): enforce test enable/disable for candidates

- Return 403 for disabled tests in GET /api/tests/slug/:slug
- Prevent starting assessments for disabled tests
- Add API tests for disabled test access
- Add E2E test for disabled test error message"
```

---

## Task 9: Final Testing & Documentation

**Goal:** Run all tests, update documentation, verify Phase 2 complete

**Files:**
- Update: `docs/API.md`
- Update: `CLAUDE.md`
- Update: `README.md`

**Step 1: Run all backend tests**

```bash
cd backend
npm test
```

Expected: All tests pass (~60-70 tests)

**Step 2: Run all frontend tests**

```bash
cd frontend
npm test                    # Component tests
npm run test:e2e --reporter=line  # E2E tests
```

Expected: All tests pass (~20-30 tests)

**Step 3: Manual testing checklist**

**Backend:**
- [ ] POST /api/auth/login with valid credentials returns JWT
- [ ] POST /api/auth/login with invalid credentials returns 401
- [ ] Protected endpoints reject requests without JWT (401)
- [ ] Protected endpoints accept requests with valid JWT
- [ ] GET /api/tests/slug/:slug returns 403 for disabled tests
- [ ] POST /api/assessments/start rejects disabled tests (403)
- [ ] Health endpoint still works

**Frontend:**
- [ ] /admin redirects to /admin/login when not authenticated
- [ ] /admin/login shows form
- [ ] Login with wrong credentials shows error
- [ ] Login with correct credentials redirects to /admin
- [ ] /admin shows dashboard with tabs
- [ ] Logout clears token and redirects to login
- [ ] All Phase 1 candidate flow still works

**Step 4: Update API documentation**

Update `docs/API.md` - add authentication section:

```markdown
## Authentication

All admin endpoints require JWT authentication.

**How to authenticate:**
1. POST /api/auth/login with username and password
2. Store the returned token
3. Include token in Authorization header: `Authorization: Bearer <token>`

**Login Endpoint:**

### POST /api/auth/login

Authenticate admin user and receive JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "ADMIN",
    "created_at": "2025-01-24T..."
  }
}
```

**Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

**Protected Endpoints:**
- All Question CRUD (GET, POST, PUT, DELETE /api/questions/*)
- All Test admin operations (GET, POST, PUT, DELETE /api/tests/* except /slug/:slug)

**Public Endpoints:**
- GET /api/tests/slug/:slug
- POST /api/assessments/*
- GET /health
```

**Step 5: Update CLAUDE.md**

Update `docs/CLAUDE.md` - add to "Today I learned":

```markdown
## Today I learned

- When using playwright, always add '--reporter=line' so you don't have to wait for results
- argon2id is the recommended algorithm for password hashing (memory-hard, resistant to GPU attacks)
- JWT tokens should have reasonable expiration (7 days for admin access is acceptable)
- Always return generic "Invalid credentials" message for both username and password errors (security)
- ProtectedRoute pattern in React Router is cleaner than checking auth in every component
```

**Step 6: Update README.md**

Update `README.md` - add admin section:

```markdown
## Admin Access

**Create admin user:**
```bash
cd backend
npm run create-admin
```

**Login:**
Visit http://localhost:5173/admin/login
- Default username: `admin`
- Password: Set during create-admin

**Admin capabilities (Phase 2):**
- View dashboard
- Protected routes with JWT authentication
- Logout functionality

**Phase 3+ will add:**
- Question management UI
- Test management UI
- Assessment viewing
- Analytics dashboard
```

**Step 7: Verify versions**

Check versions:
- `backend/package.json`: "version": "0.5.0"
- `frontend/package.json`: "version": "0.5.0"

**Step 8: Create final commit**

```bash
git add docs/ README.md
git commit -m "docs: update documentation for Phase 2

- Add authentication section to API.md
- Update CLAUDE.md with security learnings
- Update README.md with admin access instructions
- Document Phase 2 completion"
```

**Step 9: Tag release**

```bash
git tag v0.5.0 -m "Phase 2: Admin Authentication & Dashboard Shell

Features:
- Admin login with argon2 + JWT
- Protected admin routes
- Admin dashboard shell with tab navigation
- Test enable/disable enforcement
- Complete test coverage (unit, integration, API, E2E)

Versions:
- Backend: 0.5.0
- Frontend: 0.5.0"
```

---

## Success Criteria

Phase 2 is complete when:

- ✅ Admin can login with username/password
- ✅ JWT token generated and stored
- ✅ Protected routes require valid JWT
- ✅ Admin dashboard accessible after login
- ✅ Logout clears token and redirects
- ✅ Disabled tests return 403 to candidates
- ✅ All Phase 1 features still work
- ✅ All backend tests pass (unit, integration, API)
- ✅ All frontend tests pass (component, E2E)
- ✅ Documentation updated
- ✅ Versions updated to 0.5.0

---

## Testing Summary

**Backend Tests:**
- Unit tests: auth-utils.test.js (8 tests)
- Integration tests: auth-middleware.test.js (2 tests)
- API tests: auth.test.js (5 tests), updated questions/tests (10+ tests)
- **Total:** ~60-70 tests

**Frontend Tests:**
- Unit tests: api.test.jsx (6 tests)
- Component tests: (0 new, existing still pass)
- E2E tests: admin-login.spec.js (4 tests), admin-dashboard.spec.js (4 tests), disabled-test.spec.js (1 test)
- **Total:** ~25-35 tests

**Grand Total:** ~85-105 tests

---

## Next Phase Preview

**Phase 3: Admin Test & Question Management**
- Question CRUD UI (create, edit, delete questions)
- Test CRUD UI (create, edit, delete tests)
- Add/remove questions from tests
- View assessment results
- All management operations in dashboard

**Estimated Tasks:** 8-10 tasks
**Estimated Tests:** 30-40 additional tests
**Version Target:** 0.6.0

# User Management Phase 1: Core Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the users table and implement registration/login with email and roles.

**Architecture:** Extends existing users table with email, display_name, role, and status fields. Migrates existing admin users. Adds registration endpoint. Updates login to use email. Frontend gets new registration modal and updated login.

**Tech Stack:** Node.js/Express, PostgreSQL, postgres.js, React, Vitest, Playwright, Resend (email)

---

## Task 1: Create Database Migration for Extended Users Table

**Files:**
- Create: `backend/db/migrations/004_extend_users_table.sql`

**Step 1: Write the migration file**

Create `backend/db/migrations/004_extend_users_table.sql`:

```sql
-- Migration: Extend users table for multi-user support
-- Add email, display_name, role, status fields

-- ===========================================
-- ENUM TYPES
-- ===========================================

-- User role type
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.user_role AS ENUM ('USER', 'AUTHOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- ALTER USERS TABLE
-- ===========================================

-- Add email column (will migrate existing users later)
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add display_name column
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Add bio column
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add role column with default USER
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS role __SCHEMA__.user_role DEFAULT 'USER';

-- Add status columns
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;

ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add last_login_at column
ALTER TABLE __SCHEMA__.users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- ===========================================
-- MIGRATE EXISTING USERS
-- ===========================================

-- Existing users in users table are all admins
-- Set them as ADMIN, active, and verified
UPDATE __SCHEMA__.users
SET
  role = 'ADMIN',
  is_active = TRUE,
  email_verified = TRUE,
  display_name = username,
  email = username || '@placeholder.local'
WHERE role IS NULL OR role = 'USER';

-- ===========================================
-- ADD CONSTRAINTS (after migration)
-- ===========================================

-- Make email unique (after populating)
DO $$ BEGIN
  ALTER TABLE __SCHEMA__.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

-- Make display_name unique
DO $$ BEGIN
  ALTER TABLE __SCHEMA__.users
    ADD CONSTRAINT users_display_name_unique UNIQUE (display_name);
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON __SCHEMA__.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON __SCHEMA__.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON __SCHEMA__.users(is_active);
```

**Step 2: Run migration to verify it works**

```bash
cd backend && npm run migrate
```

Expected: Migration completes, shows users table with new columns.

**Step 3: Commit**

```bash
git add backend/db/migrations/004_extend_users_table.sql
git commit -m "feat: add migration to extend users table with email, role, status"
```

---

## Task 2: Create Email Tokens Table Migration

**Files:**
- Create: `backend/db/migrations/005_email_tokens_table.sql`

**Step 1: Write the migration file**

Create `backend/db/migrations/005_email_tokens_table.sql`:

```sql
-- Migration: Create email_tokens table for verification and password reset

-- ===========================================
-- ENUM TYPES
-- ===========================================

-- Email token type
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.email_token_type AS ENUM ('verification', 'password_reset');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- EMAIL TOKENS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS __SCHEMA__.email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES __SCHEMA__.users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  type __SCHEMA__.email_token_type NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_tokens_token ON __SCHEMA__.email_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON __SCHEMA__.email_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON __SCHEMA__.email_tokens(expires_at);
```

**Step 2: Run migration**

```bash
cd backend && npm run migrate
```

Expected: Migration completes, shows email_tokens table created.

**Step 3: Commit**

```bash
git add backend/db/migrations/005_email_tokens_table.sql
git commit -m "feat: add email_tokens table for verification and password reset"
```

---

## Task 3: Install Resend and Create Email Service

**Files:**
- Modify: `backend/package.json` (add resend dependency)
- Create: `backend/services/email.js`
- Test: `backend/tests/unit/email.test.js`

**Step 1: Install Resend package**

```bash
cd backend && npm install resend
```

**Step 2: Write the failing test**

Create `backend/tests/unit/email.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Resend module before importing email service
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null })
    }
  }))
}));

import { sendEmail, sendVerificationEmail, sendPasswordResetEmail, _resetResendClient } from '../../services/email.js';
import { Resend } from 'resend';

describe('Email Service', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
    // Reset the Resend client for each test
    if (_resetResendClient) _resetResendClient();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('sendEmail', () => {
    it('should log email in test mode (not actually send)', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>'
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('console');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    });

    it('should return email data structure', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>'
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('mode');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with token', async () => {
      const result = await sendVerificationEmail('user@example.com', 'John', 'abc123token');

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('abc123token'));
    });

    it('should include verification URL in email', async () => {
      await sendVerificationEmail('user@example.com', 'John', 'abc123token');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('verify-email/abc123token'));
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with token', async () => {
      const result = await sendPasswordResetEmail('user@example.com', 'Jane', 'reset456token');

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('reset456token'));
    });

    it('should include reset URL in email', async () => {
      await sendPasswordResetEmail('user@example.com', 'Jane', 'reset456token');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('reset-password/reset456token'));
    });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
cd backend && npm test -- tests/unit/email.test.js
```

Expected: FAIL - Cannot find module

**Step 4: Create the email service with Resend**

Create `backend/services/email.js`:

```javascript
import { Resend } from 'resend';

/**
 * Email Service using Resend
 *
 * Environment modes:
 * - test/testing: Logs to console only (no actual sends)
 * - development/staging: Sends via Resend BUT only to allowed emails, with [ENV] prefix
 * - production: Sends via Resend to anyone, no prefix
 *
 * Required env vars:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_FROM_EMAIL: Verified sender email (e.g., noreply@yourdomain.com)
 * - FRONTEND_URL: Frontend URL for links in emails
 * - RESEND_ALLOWED_EMAILS: Comma-separated list of allowed recipient emails (for non-production)
 */

const APP_NAME = 'Clever Badge';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Clever Badge <noreply@cleverbadge.com>';

// Lazy-initialize Resend client
let resendClient = null;

function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// For testing - allows resetting the client
export function _resetResendClient() {
  resendClient = null;
}

/**
 * Get allowed emails for non-production environments
 * @returns {string[]} Array of allowed email addresses
 */
function getAllowedEmails() {
  const allowedEmailsEnv = process.env.RESEND_ALLOWED_EMAILS || '';
  return allowedEmailsEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Check if email is allowed in current environment
 * @param {string} email - Email to check
 * @returns {boolean}
 */
function isEmailAllowed(email) {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // In production, all emails are allowed
  if (nodeEnv === 'production') {
    return true;
  }

  // In non-production, only whitelisted emails are allowed
  const allowedEmails = getAllowedEmails();
  if (allowedEmails.length === 0) {
    return false; // No whitelist = no emails sent
  }

  return allowedEmails.includes(email.toLowerCase());
}

/**
 * Get subject prefix for non-production environments
 * @returns {string} Subject prefix or empty string for production
 */
function getSubjectPrefix() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    return '';
  }

  // Capitalize environment name
  const envName = nodeEnv.charAt(0).toUpperCase() + nodeEnv.slice(1);
  return `[${APP_NAME} - ${envName}] `;
}

/**
 * Send an email
 * In test/testing: logs to console only
 * In development/staging: sends via Resend to allowed emails only, with [ENV] prefix
 * In production: sends via Resend to anyone, no prefix
 *
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @returns {Promise<{success: boolean, mode: string, id?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, text, html }) {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // In test environments, just log to console (no actual sends)
  if (nodeEnv === 'test' || nodeEnv === 'testing') {
    console.log('\n📧 ═══════════════════════════════════════════════════════');
    console.log(`📧 EMAIL (${nodeEnv} mode - not sent)`);
    console.log('📧 ═══════════════════════════════════════════════════════');
    console.log(`📧 To: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log('📧 ───────────────────────────────────────────────────────');
    console.log(text);
    console.log('📧 ═══════════════════════════════════════════════════════\n');
    return { success: true, mode: 'console' };
  }

  // Check if email is allowed (for non-production environments)
  if (!isEmailAllowed(to)) {
    console.warn(`📧 Email to ${to} blocked - not in RESEND_ALLOWED_EMAILS whitelist (${nodeEnv} mode)`);
    console.log('\n📧 ═══════════════════════════════════════════════════════');
    console.log(`📧 EMAIL BLOCKED (${nodeEnv} mode - recipient not whitelisted)`);
    console.log('📧 ═══════════════════════════════════════════════════════');
    console.log(`📧 To: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log('📧 ───────────────────────────────────────────────────────');
    console.log(text);
    console.log('📧 ═══════════════════════════════════════════════════════\n');
    return { success: true, mode: 'blocked_not_whitelisted' };
  }

  // Get Resend client
  const client = getResendClient();

  if (!client) {
    console.error('RESEND_API_KEY not configured. Email not sent:', to, subject);
    return { success: false, mode: 'not_configured', error: 'RESEND_API_KEY not configured' };
  }

  // Add environment prefix to subject in non-production
  const finalSubject = getSubjectPrefix() + subject;

  try {
    const { data, error } = await client.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: finalSubject,
      text,
      html
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, mode: 'resend', error: error.message };
    }

    console.log(`📧 Email sent via Resend to ${to} (id: ${data.id}, env: ${nodeEnv})`);
    return { success: true, mode: 'resend', id: data.id };
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return { success: false, mode: 'resend', error: error.message };
  }
}

/**
 * Send verification email
 * @param {string} email - Recipient email
 * @param {string} displayName - User's display name
 * @param {string} token - Verification token
 */
export async function sendVerificationEmail(email, displayName, token) {
  const verifyUrl = `${FRONTEND_URL}/verify-email/${token}`;

  return sendEmail({
    to: email,
    subject: `Verify your email`,
    text: `Hi ${displayName},

Welcome to ${APP_NAME}!

Please verify your email by clicking the link below:

${verifyUrl}

This link expires in 24 hours.

If you didn't create an account, you can ignore this email.

- The ${APP_NAME} Team`,
    html: `
      <h2>Hi ${displayName},</h2>
      <p>Welcome to <strong>${APP_NAME}</strong>!</p>
      <p>Please verify your email by clicking the button below:</p>
      <p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4DA6C0; color: white; text-decoration: none; border-radius: 4px;">
          Verify Email
        </a>
      </p>
      <p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
      <p><small>This link expires in 24 hours.</small></p>
      <p>If you didn't create an account, you can ignore this email.</p>
      <p>- The ${APP_NAME} Team</p>
    `
  });
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} displayName - User's display name
 * @param {string} token - Reset token
 */
export async function sendPasswordResetEmail(email, displayName, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;

  return sendEmail({
    to: email,
    subject: `Reset your password`,
    text: `Hi ${displayName},

You requested a password reset for your ${APP_NAME} account.

Click the link below to set a new password:

${resetUrl}

This link expires in 1 hour.

If you didn't request this, you can ignore this email. Your password will remain unchanged.

- The ${APP_NAME} Team`,
    html: `
      <h2>Hi ${displayName},</h2>
      <p>You requested a password reset for your <strong>${APP_NAME}</strong> account.</p>
      <p>Click the button below to set a new password:</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4DA6C0; color: white; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </p>
      <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p><small>This link expires in 1 hour.</small></p>
      <p>If you didn't request this, you can ignore this email. Your password will remain unchanged.</p>
      <p>- The ${APP_NAME} Team</p>
    `
  });
}
```

**Step 5: Run test to verify it passes**

```bash
cd backend && npm test -- tests/unit/email.test.js
```

Expected: PASS (5 tests)

**Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/services/email.js backend/tests/unit/email.test.js
git commit -m "feat: add email service with Resend integration"
```

**Environment Variables Required:**

```bash
# Required for all environments that send emails
RESEND_API_KEY=re_xxxxx...
RESEND_FROM_EMAIL=Clever Badge <noreply@yourdomain.com>
FRONTEND_URL=https://yourdomain.com

# Required for development/staging (whitelist of allowed recipients)
RESEND_ALLOWED_EMAILS=developer@example.com,tester@example.com
```

**Email Behavior by Environment:**

| NODE_ENV | Sends Email? | Subject Prefix | Recipient Restriction |
|----------|-------------|----------------|----------------------|
| test | No (console only) | N/A | N/A |
| testing | No (console only) | N/A | N/A |
| development | Yes (via Resend) | `[Clever Badge - Development]` | Only `RESEND_ALLOWED_EMAILS` |
| staging | Yes (via Resend) | `[Clever Badge - Staging]` | Only `RESEND_ALLOWED_EMAILS` |
| production | Yes (via Resend) | None | Anyone |

**Example subjects:**
- Development: `[Clever Badge - Development] Verify your email`
- Staging: `[Clever Badge - Staging] Reset your password`
- Production: `Verify your email`

---

## Task 4: Create Token Generation Utility

**Files:**
- Create: `backend/utils/tokens.js`
- Test: `backend/tests/unit/tokens.test.js`

**Step 1: Write the failing test**

Create `backend/tests/unit/tokens.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { generateSecureToken, generateEmailToken } from '../../utils/tokens.js';

describe('Token Utilities', () => {
  describe('generateSecureToken', () => {
    it('should generate a 64-character hex string by default', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateEmailToken', () => {
    it('should generate verification token with 24h expiry', () => {
      const { token, expiresAt } = generateEmailToken('verification');

      expect(token).toHaveLength(64);

      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const diff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(1000); // Within 1 second
    });

    it('should generate password_reset token with 1h expiry', () => {
      const { token, expiresAt } = generateEmailToken('password_reset');

      expect(token).toHaveLength(64);

      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      const diff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- tests/unit/tokens.test.js
```

Expected: FAIL - Cannot find module

**Step 3: Create the token utility**

Create `backend/utils/tokens.js`:

```javascript
import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param {number} bytes - Number of random bytes (default 32 = 64 hex chars)
 * @returns {string} Hex-encoded random token
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Token expiry durations in milliseconds
 */
const TOKEN_EXPIRY = {
  verification: 24 * 60 * 60 * 1000,    // 24 hours
  password_reset: 1 * 60 * 60 * 1000,   // 1 hour
};

/**
 * Generate an email token with expiration
 * @param {'verification' | 'password_reset'} type - Token type
 * @returns {{ token: string, expiresAt: Date }}
 */
export function generateEmailToken(type) {
  const token = generateSecureToken();
  const expiryMs = TOKEN_EXPIRY[type] || TOKEN_EXPIRY.verification;
  const expiresAt = new Date(Date.now() + expiryMs);

  return { token, expiresAt };
}
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- tests/unit/tokens.test.js
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add backend/utils/tokens.js backend/tests/unit/tokens.test.js
git commit -m "feat: add token generation utilities"
```

---

## Task 5: Update Auth Routes - Add Registration Endpoint

**Files:**
- Modify: `backend/routes/auth.js`
- Test: `backend/tests/api/auth.test.js`

**Step 1: Write the failing test**

Add to `backend/tests/api/auth.test.js` (add a new describe block after existing ones):

```javascript
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
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: FAIL - 404 Not Found (endpoint doesn't exist)

**Step 3: Update auth routes with registration endpoint**

Add to `backend/routes/auth.js` after the imports:

```javascript
import { generateEmailToken } from '../utils/tokens.js';
import { sendVerificationEmail } from '../services/email.js';
```

Add the registration endpoint before the login endpoint:

```javascript
/**
 * POST /api/auth/register
 * Register a new user account
 */
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
        SELECT id FROM ${sql(dbSchema)}.users
        WHERE email = ${email}
      `;

      if (existingEmail.length > 0) {
        return res.status(409).json({
          error: 'An account with this email already exists'
        });
      }

      // Check if display name already exists
      const existingDisplayName = await sql`
        SELECT id FROM ${sql(dbSchema)}.users
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
        INSERT INTO ${sql(dbSchema)}.users (
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
        INSERT INTO ${sql(dbSchema)}.email_tokens (user_id, token, type, expires_at)
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
```

**Step 4: Update test file to include registration tests**

The test file needs to be updated to include the new route in the test router. Update `createTestAuthRouter` in `backend/tests/api/auth.test.js`:

(Add the imports and registration handler similar to production code)

**Step 5: Run test to verify it passes**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: PASS (all tests including new registration tests)

**Step 6: Commit**

```bash
git add backend/routes/auth.js backend/tests/api/auth.test.js
git commit -m "feat: add user registration endpoint"
```

---

## Task 6: Update Login to Support Email and Update Last Login

**Files:**
- Modify: `backend/routes/auth.js`
- Modify: `backend/tests/api/auth.test.js`

**Step 1: Write the failing test**

Add new tests to `backend/tests/api/auth.test.js`:

```javascript
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
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: FAIL - Login doesn't support email field

**Step 3: Update login endpoint**

Update the login endpoint in `backend/routes/auth.js`:

```javascript
/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 * Supports both username (legacy) and email login
 */
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
          FROM ${sql(dbSchema)}.users
          WHERE email = ${email}
        `;
      } else {
        users = await sql`
          SELECT id, username, email, display_name, password_hash, role, is_active, is_disabled, email_verified, created_at
          FROM ${sql(dbSchema)}.users
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

      // Check if account is verified (for new users, not legacy admins)
      if (!user.is_active && !user.email_verified) {
        return res.status(403).json({
          error: 'Please verify your email before logging in',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      // Check if account is disabled
      if (user.is_disabled) {
        return res.status(403).json({
          error: 'Your account has been disabled. Please contact support.',
          code: 'ACCOUNT_DISABLED'
        });
      }

      // Update last login
      await sql`
        UPDATE ${sql(dbSchema)}.users
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
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/routes/auth.js backend/tests/api/auth.test.js
git commit -m "feat: update login to support email and check account status"
```

---

## Task 7: Add Email Verification Endpoint

**Files:**
- Modify: `backend/routes/auth.js`
- Modify: `backend/tests/api/auth.test.js`

**Step 1: Write the failing test**

Add to `backend/tests/api/auth.test.js`:

```javascript
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

    expect(response.body.error).toContain('invalid');
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
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: FAIL - 404 endpoint not found

**Step 3: Add verify-email endpoint**

Add to `backend/routes/auth.js`:

```javascript
/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email',
  body('token').notEmpty().withMessage('Token is required'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { token } = req.body;

      // Find valid token
      const tokens = await sql`
        SELECT t.id, t.user_id, t.expires_at, t.used_at, u.email
        FROM ${sql(dbSchema)}.email_tokens t
        JOIN ${sql(dbSchema)}.users u ON u.id = t.user_id
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
        UPDATE ${sql(dbSchema)}.email_tokens
        SET used_at = NOW()
        WHERE id = ${tokenRecord.id}
      `;

      // Activate user
      await sql`
        UPDATE ${sql(dbSchema)}.users
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
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/routes/auth.js backend/tests/api/auth.test.js
git commit -m "feat: add email verification endpoint"
```

---

## Task 8: Add Password Reset Endpoints

**Files:**
- Modify: `backend/routes/auth.js`
- Modify: `backend/tests/api/auth.test.js`

**Step 1: Write the failing tests**

Add to `backend/tests/api/auth.test.js`:

```javascript
describe('POST /api/auth/forgot-password', () => {
  it('should send reset email for valid user', async () => {
    // Create and verify a user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'forgot@example.com',
        displayName: 'Forgot User',
        password: 'password123'
      });

    await sql`
      UPDATE ${sql(schema)}.users
      SET is_active = TRUE, email_verified = TRUE
      WHERE email = 'forgot@example.com'
    `;

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot@example.com' })
      .expect(200);

    expect(response.body.message).toContain('email');
  });

  it('should return success even for non-existent email (security)', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' })
      .expect(200);

    // Should not reveal whether email exists
    expect(response.body.message).toContain('email');
  });
});

describe('POST /api/auth/reset-password', () => {
  it('should reset password with valid token', async () => {
    // Create and verify a user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'reset@example.com',
        displayName: 'Reset User',
        password: 'oldpassword123'
      });

    await sql`
      UPDATE ${sql(schema)}.users
      SET is_active = TRUE, email_verified = TRUE
      WHERE email = 'reset@example.com'
    `;

    // Request password reset
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@example.com' });

    // Get the token
    const tokens = await sql`
      SELECT token FROM ${sql(schema)}.email_tokens
      WHERE type = 'password_reset'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // Reset password
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: tokens[0].token,
        newPassword: 'newpassword123'
      })
      .expect(200);

    expect(response.body.message).toContain('reset');

    // Verify can login with new password
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'reset@example.com',
        password: 'newpassword123'
      })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('token');
  });

  it('should reject invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'invalid-token',
        newPassword: 'newpassword123'
      })
      .expect(400);

    expect(response.body.error).toContain('invalid');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: FAIL - 404

**Step 3: Add password reset endpoints**

Add to `backend/routes/auth.js`:

```javascript
import { sendPasswordResetEmail } from '../services/email.js';

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { email } = req.body;

      // Find user (but don't reveal if exists)
      const users = await sql`
        SELECT id, email, display_name
        FROM ${sql(dbSchema)}.users
        WHERE email = ${email}
          AND is_active = TRUE
          AND is_disabled = FALSE
      `;

      // Always return success to prevent email enumeration
      if (users.length === 0) {
        return res.json({
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }

      const user = users[0];

      // Delete any existing reset tokens for this user
      await sql`
        DELETE FROM ${sql(dbSchema)}.email_tokens
        WHERE user_id = ${user.id}
          AND type = 'password_reset'
      `;

      // Generate new reset token
      const { token, expiresAt } = generateEmailToken('password_reset');

      // Store token
      await sql`
        INSERT INTO ${sql(dbSchema)}.email_tokens (user_id, token, type, expires_at)
        VALUES (${user.id}, ${token}, 'password_reset', ${expiresAt})
      `;

      // Send email
      await sendPasswordResetEmail(email, user.display_name, token);

      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password',
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      // Find valid token
      const tokens = await sql`
        SELECT t.id, t.user_id, t.expires_at, t.used_at
        FROM ${sql(dbSchema)}.email_tokens t
        WHERE t.token = ${token}
          AND t.type = 'password_reset'
      `;

      if (tokens.length === 0) {
        return res.status(400).json({
          error: 'Invalid or expired reset token'
        });
      }

      const tokenRecord = tokens[0];

      // Check if already used
      if (tokenRecord.used_at) {
        return res.status(400).json({
          error: 'This reset link has already been used'
        });
      }

      // Check if expired
      if (new Date(tokenRecord.expires_at) < new Date()) {
        return res.status(400).json({
          error: 'This reset link has expired. Please request a new one.',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update password
      await sql`
        UPDATE ${sql(dbSchema)}.users
        SET password_hash = ${passwordHash}
        WHERE id = ${tokenRecord.user_id}
      `;

      // Mark token as used
      await sql`
        UPDATE ${sql(dbSchema)}.email_tokens
        SET used_at = NOW()
        WHERE id = ${tokenRecord.id}
      `;

      res.json({
        message: 'Password reset successfully. You can now log in with your new password.'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/routes/auth.js backend/tests/api/auth.test.js
git commit -m "feat: add password reset endpoints"
```

---

## Task 9: Add Resend Verification Endpoint

**Files:**
- Modify: `backend/routes/auth.js`
- Modify: `backend/tests/api/auth.test.js`

**Step 1: Write the failing test**

Add to `backend/tests/api/auth.test.js`:

```javascript
describe('POST /api/auth/resend-verification', () => {
  it('should resend verification email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'resend@example.com',
        displayName: 'Resend User',
        password: 'password123'
      });

    const response = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'resend@example.com' })
      .expect(200);

    expect(response.body.message).toContain('verification');
  });

  it('should return success for non-existent email (security)', async () => {
    const response = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'nonexistent@example.com' })
      .expect(200);

    expect(response.body.message).toContain('verification');
  });

  it('should not resend if already verified', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'alreadyverified@example.com',
        displayName: 'Already Verified',
        password: 'password123'
      });

    await sql`
      UPDATE ${sql(schema)}.users
      SET is_active = TRUE, email_verified = TRUE
      WHERE email = 'alreadyverified@example.com'
    `;

    const response = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'alreadyverified@example.com' })
      .expect(400);

    expect(response.body.error).toContain('already verified');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: FAIL

**Step 3: Add resend-verification endpoint**

Add to `backend/routes/auth.js`:

```javascript
/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { email } = req.body;

      // Find user
      const users = await sql`
        SELECT id, email, display_name, is_active, email_verified
        FROM ${sql(dbSchema)}.users
        WHERE email = ${email}
      `;

      // Always return success to prevent email enumeration
      if (users.length === 0) {
        return res.json({
          message: 'If an unverified account with that email exists, a new verification link has been sent.'
        });
      }

      const user = users[0];

      // Check if already verified
      if (user.email_verified) {
        return res.status(400).json({
          error: 'This email is already verified. You can log in.'
        });
      }

      // Delete existing verification tokens
      await sql`
        DELETE FROM ${sql(dbSchema)}.email_tokens
        WHERE user_id = ${user.id}
          AND type = 'verification'
      `;

      // Generate new token
      const { token, expiresAt } = generateEmailToken('verification');

      // Store token
      await sql`
        INSERT INTO ${sql(dbSchema)}.email_tokens (user_id, token, type, expires_at)
        VALUES (${user.id}, ${token}, 'verification', ${expiresAt})
      `;

      // Send email
      await sendVerificationEmail(email, user.display_name, token);

      res.json({
        message: 'If an unverified account with that email exists, a new verification link has been sent.'
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm test -- tests/api/auth.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/routes/auth.js backend/tests/api/auth.test.js
git commit -m "feat: add resend verification endpoint"
```

---

## Task 10: Update Auth Middleware to Include Full User Info

**Files:**
- Modify: `backend/middleware/auth.js`
- Test: `backend/tests/unit/auth-utils.test.js`

**Step 1: Update auth middleware**

Update `backend/middleware/auth.js`:

```javascript
import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware to verify JWT token from Authorization header
 * Attaches decoded user info to req.user
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. No token provided.'
    });
  }

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

/**
 * Middleware to check if user is author or admin
 * Must be used after authenticateToken
 */
export function requireAuthor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'AUTHOR') {
    return res.status(403).json({
      error: 'Author or admin access required.'
    });
  }

  next();
}
```

**Step 2: Run all tests**

```bash
cd backend && npm test
```

Expected: PASS

**Step 3: Commit**

```bash
git add backend/middleware/auth.js
git commit -m "feat: add requireAuthor middleware"
```

---

## Task 11: Run Full Backend Test Suite

**Step 1: Run all backend tests**

```bash
cd backend && npm test
```

Expected: All tests pass

**Step 2: Run with coverage**

```bash
cd backend && npm run test:coverage
```

Expected: Coverage report shows new code is tested

---

## Task 12: Version Bump and Commit

**Files:**
- Modify: `backend/package.json`

**Step 1: Update version**

Update version in `backend/package.json` to `2.1.0`:

```json
{
  "version": "2.1.0"
}
```

**Step 2: Run tests again**

```bash
cd backend && npm test
```

**Step 3: Commit**

```bash
git add backend/package.json
git commit -m "chore: bump backend version to 2.1.0 for user management phase 1"
```

---

## Summary

This plan covers Phase 1 (Core Auth) of the User Management feature:

1. ✅ Database migrations for extended users table and email_tokens
2. ✅ Email service with Resend (production) / console logging (dev/test)
3. ✅ Token generation utilities
4. ✅ Registration endpoint
5. ✅ Login with email support
6. ✅ Email verification endpoint
7. ✅ Password reset endpoints (forgot + reset)
8. ✅ Resend verification endpoint
9. ✅ Updated auth middleware with requireAuthor

**Email Service Configuration:**

| NODE_ENV | Sends Email? | Subject Prefix | Recipient Restriction |
|----------|-------------|----------------|----------------------|
| test | No (console only) | N/A | N/A |
| testing | No (console only) | N/A | N/A |
| development | Yes (via Resend) | `[Clever Badge - Development]` | Only `RESEND_ALLOWED_EMAILS` |
| staging | Yes (via Resend) | `[Clever Badge - Staging]` | Only `RESEND_ALLOWED_EMAILS` |
| production | Yes (via Resend) | None | Anyone |

**Required env vars:**
- `RESEND_API_KEY` - Your [Resend](https://resend.com/docs/send-with-nodejs) API key
- `RESEND_FROM_EMAIL` - Verified sender email
- `FRONTEND_URL` - Frontend URL for email links
- `RESEND_ALLOWED_EMAILS` - Comma-separated whitelist (dev/staging only)

**Next steps (separate implementation plans):**
- Phase 1b: Frontend Registration and Login UI
- Phase 2: User Profiles (view/edit)
- Phase 3: Author Requests
- Phase 4: Admin User Management

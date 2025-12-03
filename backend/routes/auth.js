import express from 'express';
import { body, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateEmailToken } from '../utils/tokens.js';
import { sendVerificationEmail } from '../services/email.js';

const router = express.Router();

// Validation middleware helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

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

/**
 * PUT /api/auth/password
 * Change password for authenticated user
 */
router.put('/password',
  authenticateToken,
  // Validation
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get current password hash
      const users = await sql`
        SELECT password_hash
        FROM ${sql(dbSchema)}.users
        WHERE id = ${userId}
      `;

      if (users.length === 0) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Verify current password
      const isValid = await verifyPassword(users[0].password_hash, currentPassword);

      if (!isValid) {
        return res.status(400).json({
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await sql`
        UPDATE ${sql(dbSchema)}.users
        SET password_hash = ${newPasswordHash}
        WHERE id = ${userId}
      `;

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

export default router;

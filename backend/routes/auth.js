import express from 'express';
import { body, validationResult } from 'express-validator';
import { sql, dbSchema } from '../db/index.js';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
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

/**
 * POST /api/auth/login
 * Authenticate admin user and return JWT token
 */
router.post('/login',
  // Validation
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,

  async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find user by username
      const users = await sql`
        SELECT id, username, password_hash, created_at
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

      // Create JWT token (all users in users table are admins)
      const token = signToken({
        id: user.id,
        username: user.username,
        role: 'ADMIN'
      });

      // Return token and user info (without password_hash)
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

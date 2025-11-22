const express = require('express');
const prisma = require('../lib/prisma');
const { comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      error: {
        message: 'Username and password are required',
        code: 'MISSING_CREDENTIALS',
      }
    });
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return res.status(401).json({
      error: {
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS',
      }
    });
  }

  // Verify password
  const isValid = await comparePassword(password, user.password_hash);

  if (!isValid) {
    return res.status(401).json({
      error: {
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS',
      }
    });
  }

  // Generate token
  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
  });

  // Return token and user info
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    }
  });
}));

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', auth, asyncHandler(async (req, res) => {
  res.json({
    user: req.user,
  });
}));

module.exports = router;

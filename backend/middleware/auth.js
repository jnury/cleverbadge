const { verifyToken } = require('../utils/jwt');
const prisma = require('../lib/prisma');

/**
 * Middleware to verify JWT token and attach user to request
 * Usage: router.get('/protected', auth, handler)
 */
async function auth(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'NO_TOKEN',
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Fetch user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
      }
    });

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        }
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error); // Pass to error handler
  }
}

module.exports = auth;

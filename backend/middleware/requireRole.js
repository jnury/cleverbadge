/**
 * Middleware to check if authenticated user has required role
 * Usage: router.post('/admin-only', auth, requireRole(['ADMIN']), handler)
 *
 * @param {string[]} allowedRoles - Array of allowed roles
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    // Assumes auth middleware has already run
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: allowedRoles,
          current: req.user.role,
        }
      });
    }

    next();
  };
}

module.exports = requireRole;

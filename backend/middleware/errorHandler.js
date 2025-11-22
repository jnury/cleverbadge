const { Prisma } = require('@prisma/client');

/**
 * Centralized error handling middleware
 * Converts various error types to consistent JSON responses
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Prisma-specific errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return res.status(400).json({
        error: {
          message: `A record with this ${field} already exists`,
          code: 'DUPLICATE_ENTRY',
          field,
        }
      });
    }

    // Foreign key constraint violation
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: {
          message: 'Invalid reference to related record',
          code: 'INVALID_REFERENCE',
        }
      });
    }

    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: {
          message: 'Record not found',
          code: 'NOT_FOUND',
        }
      });
    }
  }

  // Validation errors (Joi)
  if (err.isJoi || err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: err.message,
        code: 'VALIDATION_ERROR',
        details: err.details?.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })) || [],
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        message: 'Authentication token expired',
        code: 'TOKEN_EXPIRED',
      }
    });
  }

  // Custom app errors (if we add them later)
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code || 'APP_ERROR',
      }
    });
  }

  // Generic 500 error
  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    }
  });
}

module.exports = errorHandler;

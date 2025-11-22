const jwt = require('jsonwebtoken');
const config = require('../lib/config');

/**
 * Generate a JWT token for a user
 * @param {Object} payload - User data to encode (id, username, role)
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 * @throws {JsonWebTokenError} If token is invalid
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = {
  generateToken,
  verifyToken,
};

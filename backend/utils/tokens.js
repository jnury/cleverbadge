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

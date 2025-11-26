// backend/utils/slug.js
import crypto from 'crypto';

/**
 * Generates a random 8-character slug using lowercase alphanumeric characters.
 * Uses cryptographically secure random bytes.
 * @returns {string} 8-character random slug (a-z, 0-9)
 */
export function generateRandomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(8);
  let slug = '';

  for (let i = 0; i < 8; i++) {
    slug += chars[bytes[i] % chars.length];
  }

  return slug;
}

/**
 * Validates a slug format.
 * Accepts both new random slugs (8 alphanumeric) and legacy slugs (with hyphens).
 * @param {string} slug - The slug to validate
 * @returns {boolean} True if valid
 */
export function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return false;
  }
  // Allow lowercase alphanumeric and hyphens (for legacy slugs)
  return /^[a-z0-9-]+$/.test(slug);
}

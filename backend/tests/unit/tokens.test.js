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

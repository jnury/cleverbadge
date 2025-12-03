import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Resend module before importing email service
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null })
    }
  }))
}));

import { sendEmail, sendVerificationEmail, sendPasswordResetEmail, _resetResendClient } from '../../services/email.js';
import { Resend } from 'resend';

describe('Email Service', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
    // Reset the Resend client for each test
    if (_resetResendClient) _resetResendClient();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('sendEmail', () => {
    it('should log email in test mode (not actually send)', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>'
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('console');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    });

    it('should return email data structure', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>'
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('mode');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with token', async () => {
      const result = await sendVerificationEmail('user@example.com', 'John', 'abc123token');

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('abc123token'));
    });

    it('should include verification URL in email', async () => {
      await sendVerificationEmail('user@example.com', 'John', 'abc123token');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('verify-email/abc123token'));
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with token', async () => {
      const result = await sendPasswordResetEmail('user@example.com', 'Jane', 'reset456token');

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('reset456token'));
    });

    it('should include reset URL in email', async () => {
      await sendPasswordResetEmail('user@example.com', 'Jane', 'reset456token');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('reset-password/reset456token'));
    });
  });
});

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken, verifyToken } from '../../utils/jwt.js';

describe('Password Utilities', () => {
  it('should hash passwords', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should verify correct passwords', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(hash, password);

    expect(isValid).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(hash, 'WrongPassword');

    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password', async () => {
    const password = 'TestPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2); // argon2 uses random salt
  });
});

describe('JWT Utilities', () => {
  it('should sign JWT tokens', () => {
    const payload = { id: '123', username: 'admin', role: 'ADMIN' };
    const token = signToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should verify valid tokens', () => {
    const payload = { id: '123', username: 'admin', role: 'ADMIN' };
    const token = signToken(payload);
    const decoded = verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.id).toBe('123');
    expect(decoded.username).toBe('admin');
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.exp).toBeDefined(); // expiration claim
  });

  it('should reject invalid tokens', () => {
    const decoded = verifyToken('invalid.token.here');

    expect(decoded).toBeNull();
  });

  it('should reject malformed tokens', () => {
    const decoded = verifyToken('not-a-jwt');

    expect(decoded).toBeNull();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { login, logout, getCurrentUser, isLoggedIn } from '../../src/utils/api';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;

describe('API Utils', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should store token and user on successful login', async () => {
      const mockResponse = {
        token: 'test-token-123',
        user: { id: '1', username: 'admin', role: 'ADMIN' }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await login('admin', 'password');

      expect(localStorage.getItem('auth_token')).toBe('test-token-123');
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(mockResponse.user));
    });
  });

  describe('logout', () => {
    it('should clear token and user', () => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: '1' }));

      logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from localStorage', () => {
      const user = { id: '1', username: 'admin' };
      localStorage.setItem('auth_user', JSON.stringify(user));

      const result = getCurrentUser();

      expect(result).toEqual(user);
    });

    it('should return null if no user stored', () => {
      const result = getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('auth_token', 'test-token');

      expect(isLoggedIn()).toBe(true);
    });

    it('should return false when no token', () => {
      expect(isLoggedIn()).toBe(false);
    });
  });
});

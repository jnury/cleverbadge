import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStorageKey, saveAssessment, loadAssessment, clearAssessment } from '../../src/utils/assessmentStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('assessmentStorage', () => {
  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset date mocking
    vi.useRealTimers();
  });

  describe('getStorageKey', () => {
    it('should return prefixed key', () => {
      expect(getStorageKey('math-test')).toBe('cleverbadge_assessment_math-test');
    });

    it('should handle special characters in slug', () => {
      expect(getStorageKey('test-123')).toBe('cleverbadge_assessment_test-123');
    });
  });

  describe('saveAssessment', () => {
    it('should save assessment data to localStorage', () => {
      const testData = {
        assessmentId: 'uuid-123',
        currentQuestion: 2,
        answers: { q1: [0], q2: [1, 2] }
      };

      saveAssessment('math-test', testData);

      const stored = JSON.parse(localStorage.getItem('cleverbadge_assessment_math-test'));
      expect(stored.assessmentId).toBe('uuid-123');
      expect(stored.currentQuestion).toBe(2);
      expect(stored.answers).toEqual({ q1: [0], q2: [1, 2] });
      expect(stored.savedAt).toBeDefined();
    });

    it('should add savedAt timestamp', () => {
      const now = new Date('2025-01-15T10:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      saveAssessment('test-slug', { data: 'value' });

      const stored = JSON.parse(localStorage.getItem('cleverbadge_assessment_test-slug'));
      expect(stored.savedAt).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should overwrite existing data', () => {
      saveAssessment('test-slug', { version: 1 });
      saveAssessment('test-slug', { version: 2 });

      const stored = JSON.parse(localStorage.getItem('cleverbadge_assessment_test-slug'));
      expect(stored.version).toBe(2);
    });
  });

  describe('loadAssessment', () => {
    it('should return null for non-existent assessment', () => {
      expect(loadAssessment('non-existent')).toBeNull();
    });

    it('should load valid assessment data', () => {
      const now = new Date();
      localStorage.setItem('cleverbadge_assessment_test-slug', JSON.stringify({
        assessmentId: 'uuid-456',
        savedAt: now.toISOString()
      }));

      const loaded = loadAssessment('test-slug');
      expect(loaded.assessmentId).toBe('uuid-456');
    });

    it('should return null for expired assessment (over 2 hours)', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      localStorage.setItem('cleverbadge_assessment_test-slug', JSON.stringify({
        assessmentId: 'uuid-789',
        savedAt: threeHoursAgo.toISOString()
      }));

      expect(loadAssessment('test-slug')).toBeNull();
      // Should also clear the expired data
      expect(localStorage.getItem('cleverbadge_assessment_test-slug')).toBeNull();
    });

    it('should return data for assessment under 2 hours old', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      localStorage.setItem('cleverbadge_assessment_test-slug', JSON.stringify({
        assessmentId: 'uuid-recent',
        savedAt: oneHourAgo.toISOString()
      }));

      const loaded = loadAssessment('test-slug');
      expect(loaded.assessmentId).toBe('uuid-recent');
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('cleverbadge_assessment_test-slug', 'invalid{json');

      expect(loadAssessment('test-slug')).toBeNull();
    });

    it('should return null for exactly 2 hours old assessment', () => {
      const exactlyTwoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000 - 1);
      localStorage.setItem('cleverbadge_assessment_test-slug', JSON.stringify({
        assessmentId: 'uuid-edge',
        savedAt: exactlyTwoHoursAgo.toISOString()
      }));

      // Just over 2 hours should be expired
      expect(loadAssessment('test-slug')).toBeNull();
    });
  });

  describe('clearAssessment', () => {
    it('should remove assessment from localStorage', () => {
      localStorage.setItem('cleverbadge_assessment_test-slug', JSON.stringify({ data: 'test' }));

      clearAssessment('test-slug');

      expect(localStorage.getItem('cleverbadge_assessment_test-slug')).toBeNull();
    });

    it('should not throw for non-existent key', () => {
      expect(() => clearAssessment('non-existent')).not.toThrow();
    });
  });
});

// backend/tests/unit/slug.test.js
import { describe, it, expect } from 'vitest';
import { generateRandomSlug, isValidSlug } from '../../utils/slug.js';

describe('Slug Utilities', () => {
  describe('generateRandomSlug', () => {
    it('should generate an 8-character slug', () => {
      const slug = generateRandomSlug();
      expect(slug).toHaveLength(8);
    });

    it('should only contain lowercase alphanumeric characters', () => {
      const slug = generateRandomSlug();
      expect(slug).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate unique slugs', () => {
      const slugs = new Set();
      for (let i = 0; i < 100; i++) {
        slugs.add(generateRandomSlug());
      }
      expect(slugs.size).toBe(100);
    });
  });

  describe('isValidSlug', () => {
    it('should return true for valid 8-char alphanumeric slug', () => {
      expect(isValidSlug('k7m2x9pq')).toBe(true);
    });

    it('should return true for legacy slugs with hyphens', () => {
      expect(isValidSlug('javascript-fundamentals')).toBe(true);
    });

    it('should return false for uppercase characters', () => {
      expect(isValidSlug('K7M2X9PQ')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidSlug('')).toBe(false);
    });

    it('should return false for special characters', () => {
      expect(isValidSlug('test_slug!')).toBe(false);
    });
  });
});

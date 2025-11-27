import { describe, it, expect } from 'vitest';
import { isAnswerCorrect, calculateScore } from '../../utils/scoring.js';

describe('Scoring Logic', () => {
  describe('isAnswerCorrect - SINGLE choice', () => {
    it('should return true for correct single choice (string IDs)', () => {
      const result = isAnswerCorrect('SINGLE', ['1'], ['1']);
      expect(result).toBe(true);
    });

    it('should return false for incorrect single choice', () => {
      const result = isAnswerCorrect('SINGLE', ['0'], ['1']);
      expect(result).toBe(false);
    });

    it('should return false when multiple selected for single choice', () => {
      const result = isAnswerCorrect('SINGLE', ['0', '1'], ['1']);
      expect(result).toBe(false);
    });
  });

  describe('isAnswerCorrect - MULTIPLE choice', () => {
    it('should return true when all correct options selected', () => {
      const result = isAnswerCorrect('MULTIPLE', ['1', '2'], ['1', '2']);
      expect(result).toBe(true);
    });

    it('should return true regardless of order', () => {
      const result = isAnswerCorrect('MULTIPLE', ['2', '1'], ['1', '2']);
      expect(result).toBe(true);
    });

    it('should return false when missing a correct option', () => {
      const result = isAnswerCorrect('MULTIPLE', ['1'], ['1', '2']);
      expect(result).toBe(false);
    });

    it('should return false when extra incorrect option selected', () => {
      const result = isAnswerCorrect('MULTIPLE', ['1', '2', '3'], ['1', '2']);
      expect(result).toBe(false);
    });
  });

  describe('calculateScore', () => {
    it('should calculate weighted percentage', () => {
      const answers = [
        { isCorrect: true, weight: 2 },
        { isCorrect: false, weight: 1 },
        { isCorrect: true, weight: 1 }
      ];
      // 3 out of 4 points = 75%
      const result = calculateScore(answers);
      expect(result).toBe(75);
    });

    it('should return 0 for all incorrect', () => {
      const answers = [
        { isCorrect: false, weight: 1 },
        { isCorrect: false, weight: 2 }
      ];
      const result = calculateScore(answers);
      expect(result).toBe(0);
    });

    it('should return 100 for all correct', () => {
      const answers = [
        { isCorrect: true, weight: 1 },
        { isCorrect: true, weight: 2 }
      ];
      const result = calculateScore(answers);
      expect(result).toBe(100);
    });

    it('should handle empty array', () => {
      const result = calculateScore([]);
      expect(result).toBe(0);
    });
  });
});

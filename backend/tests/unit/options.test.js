import { describe, it, expect } from 'vitest';
import {
  convertArrayToDict,
  shuffleOptions,
  stripAnswersFromOptions,
  getCorrectOptionIds,
  validateOptionsFormat
} from '../../utils/options.js';

describe('Options Utility', () => {
  describe('convertArrayToDict', () => {
    it('should convert array of option objects to dict', () => {
      const input = [
        { text: 'London', is_correct: false },
        { text: 'Paris', is_correct: true, explanation: 'Capital of France' },
        { text: 'Berlin', is_correct: false }
      ];
      const result = convertArrayToDict(input);
      expect(result).toEqual({
        '0': { text: 'London', is_correct: false },
        '1': { text: 'Paris', is_correct: true, explanation: 'Capital of France' },
        '2': { text: 'Berlin', is_correct: false }
      });
    });

    it('should handle empty array', () => {
      const result = convertArrayToDict([]);
      expect(result).toEqual({});
    });
  });

  describe('shuffleOptions', () => {
    it('should return array with id and text only', () => {
      const input = {
        '0': { text: 'A', is_correct: true, explanation: 'Correct!' },
        '1': { text: 'B', is_correct: false }
      };
      const result = shuffleOptions(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).not.toHaveProperty('is_correct');
      expect(result[0]).not.toHaveProperty('explanation');
    });

    it('should include all options', () => {
      const input = {
        '0': { text: 'A', is_correct: false },
        '1': { text: 'B', is_correct: true },
        '2': { text: 'C', is_correct: false }
      };
      const result = shuffleOptions(input);
      const ids = result.map(o => o.id).sort();
      expect(ids).toEqual(['0', '1', '2']);
    });
  });

  describe('stripAnswersFromOptions', () => {
    it('should remove is_correct and explanation', () => {
      const input = {
        '0': { text: 'A', is_correct: true, explanation: 'Yes' },
        '1': { text: 'B', is_correct: false }
      };
      const result = stripAnswersFromOptions(input);
      expect(result).toEqual({
        '0': { text: 'A' },
        '1': { text: 'B' }
      });
    });
  });

  describe('getCorrectOptionIds', () => {
    it('should return array of correct option ids', () => {
      const input = {
        '0': { text: 'A', is_correct: false },
        '1': { text: 'B', is_correct: true },
        '2': { text: 'C', is_correct: true }
      };
      const result = getCorrectOptionIds(input);
      expect(result.sort()).toEqual(['1', '2']);
    });

    it('should return empty array if no correct options', () => {
      const input = {
        '0': { text: 'A', is_correct: false }
      };
      const result = getCorrectOptionIds(input);
      expect(result).toEqual([]);
    });
  });

  describe('validateOptionsFormat', () => {
    it('should return valid for correct SINGLE format', () => {
      const options = {
        '0': { text: 'A', is_correct: false },
        '1': { text: 'B', is_correct: true }
      };
      const result = validateOptionsFormat(options, 'SINGLE');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid for SINGLE with multiple correct', () => {
      const options = {
        '0': { text: 'A', is_correct: true },
        '1': { text: 'B', is_correct: true }
      };
      const result = validateOptionsFormat(options, 'SINGLE');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SINGLE type questions must have exactly 1 correct answer');
    });

    it('should return valid for MULTIPLE with multiple correct', () => {
      const options = {
        '0': { text: 'A', is_correct: true },
        '1': { text: 'B', is_correct: true },
        '2': { text: 'C', is_correct: false }
      };
      const result = validateOptionsFormat(options, 'MULTIPLE');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for MULTIPLE with no correct', () => {
      const options = {
        '0': { text: 'A', is_correct: false },
        '1': { text: 'B', is_correct: false }
      };
      const result = validateOptionsFormat(options, 'MULTIPLE');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MULTIPLE type questions must have at least 1 correct answer');
    });

    it('should return invalid for less than 2 options', () => {
      const options = {
        '0': { text: 'A', is_correct: true }
      };
      const result = validateOptionsFormat(options, 'SINGLE');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Questions must have between 2 and 10 options');
    });

    it('should return invalid for missing text', () => {
      const options = {
        '0': { is_correct: true },
        '1': { text: 'B', is_correct: false }
      };
      const result = validateOptionsFormat(options, 'SINGLE');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Option 0 is missing text');
    });
  });
});

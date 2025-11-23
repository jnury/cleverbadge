import { describe, it, expect } from 'vitest';
import { isAnswerCorrect, calculateScore } from '../../utils/scoring.js';

describe('Scoring Logic', () => {
  describe('isAnswerCorrect - SINGLE choice', () => {
    it('should return true for correct single choice', () => {
      const result = isAnswerCorrect(
        'SINGLE',
        [1], // selected
        [1]  // correct
      );
      expect(result).toBe(true);
    });

    it('should return false for wrong single choice', () => {
      const result = isAnswerCorrect('SINGLE', [0], [1]);
      expect(result).toBe(false);
    });

    it('should return false when multiple options selected for SINGLE', () => {
      const result = isAnswerCorrect('SINGLE', [0, 1], [1]);
      expect(result).toBe(false);
    });

    it('should return false when no option selected', () => {
      const result = isAnswerCorrect('SINGLE', [], [1]);
      expect(result).toBe(false);
    });
  });

  describe('isAnswerCorrect - MULTIPLE choice', () => {
    it('should return true for correct multiple choice', () => {
      const result = isAnswerCorrect('MULTIPLE', [1, 3], [1, 3]);
      expect(result).toBe(true);
    });

    it('should return true for correct multiple choice (different order)', () => {
      const result = isAnswerCorrect('MULTIPLE', [3, 1], [1, 3]);
      expect(result).toBe(true);
    });

    it('should return false for partial answer (missing options)', () => {
      const result = isAnswerCorrect('MULTIPLE', [1], [1, 3]);
      expect(result).toBe(false);
    });

    it('should return false for extra wrong option', () => {
      const result = isAnswerCorrect('MULTIPLE', [0, 1, 3], [1, 3]);
      expect(result).toBe(false);
    });

    it('should return false when no options selected', () => {
      const result = isAnswerCorrect('MULTIPLE', [], [1, 3]);
      expect(result).toBe(false);
    });
  });

  describe('calculateScore - weighted scoring', () => {
    it('should calculate 100% for all correct answers', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 },
        { id: 'q2', type: 'SINGLE', correct_answers: [2], weight: 1.5 },
        { id: 'q3', type: 'MULTIPLE', correct_answers: [1, 3], weight: 2.0 }
      ];
      const answers = {
        'q1': [1],
        'q2': [2],
        'q3': [1, 3]
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(100.0);
    });

    it('should calculate partial score correctly (50% when half correct)', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 },
        { id: 'q2', type: 'SINGLE', correct_answers: [2], weight: 1.0 }
      ];
      const answers = {
        'q1': [1],  // correct
        'q2': [0]   // wrong
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(50.0);
    });

    it('should handle weighted scoring (different weights per question)', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 },
        { id: 'q2', type: 'SINGLE', correct_answers: [2], weight: 3.0 }
      ];
      const answers = {
        'q1': [0],  // wrong (1 point)
        'q2': [2]   // correct (3 points)
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(75.0); // 3 / 4 = 0.75
    });

    it('should return 0 for all wrong answers', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 },
        { id: 'q2', type: 'SINGLE', correct_answers: [2], weight: 2.0 }
      ];
      const answers = {
        'q1': [0],
        'q2': [0]
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(0.0);
    });

    it('should handle missing answers (treats as wrong)', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 },
        { id: 'q2', type: 'SINGLE', correct_answers: [2], weight: 1.0 }
      ];
      const answers = {
        'q1': [1]  // only q1 answered, q2 missing
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(50.0); // 1 / 2 = 0.5
    });
  });
});

// backend/tests/unit/visibility.test.js
import { describe, it, expect } from 'vitest';
import {
  canQuestionBeInTest,
  getIncompatibleQuestions,
  canChangeQuestionVisibility,
  canChangeTestVisibility
} from '../../utils/visibility.js';

describe('Visibility Matrix', () => {
  describe('canQuestionBeInTest', () => {
    it('should allow public question in any test', () => {
      expect(canQuestionBeInTest('public', 'public')).toBe(true);
      expect(canQuestionBeInTest('public', 'private')).toBe(true);
      expect(canQuestionBeInTest('public', 'protected')).toBe(true);
    });

    it('should allow private question in private or protected test', () => {
      expect(canQuestionBeInTest('private', 'public')).toBe(false);
      expect(canQuestionBeInTest('private', 'private')).toBe(true);
      expect(canQuestionBeInTest('private', 'protected')).toBe(true);
    });

    it('should allow protected question only in protected test', () => {
      expect(canQuestionBeInTest('protected', 'public')).toBe(false);
      expect(canQuestionBeInTest('protected', 'private')).toBe(false);
      expect(canQuestionBeInTest('protected', 'protected')).toBe(true);
    });
  });

  describe('getIncompatibleQuestions', () => {
    const questions = [
      { id: '1', title: 'Q1', visibility: 'public' },
      { id: '2', title: 'Q2', visibility: 'private' },
      { id: '3', title: 'Q3', visibility: 'protected' }
    ];

    it('should return no incompatible questions for protected test', () => {
      const result = getIncompatibleQuestions(questions, 'protected');
      expect(result).toHaveLength(0);
    });

    it('should return protected questions as incompatible for private test', () => {
      const result = getIncompatibleQuestions(questions, 'private');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should return private and protected questions as incompatible for public test', () => {
      const result = getIncompatibleQuestions(questions, 'public');
      expect(result).toHaveLength(2);
      expect(result.map(q => q.id)).toContain('2');
      expect(result.map(q => q.id)).toContain('3');
    });
  });

  describe('canChangeQuestionVisibility', () => {
    it('should allow making question more restrictive', () => {
      // public -> private: always allowed (more restrictive)
      expect(canChangeQuestionVisibility('public', 'private', [])).toEqual({ allowed: true });
    });

    it('should block making question less restrictive if used in incompatible tests', () => {
      const tests = [{ id: '1', title: 'Public Test', visibility: 'public' }];
      // private -> public would be allowed
      // But protected -> public when used in public test would be blocked
      const result = canChangeQuestionVisibility('protected', 'public', tests);
      expect(result.allowed).toBe(true); // protected can go to public if test allows
    });

    it('should block if question is in private test and changing to protected', () => {
      const tests = [{ id: '1', title: 'Private Test', visibility: 'private' }];
      const result = canChangeQuestionVisibility('private', 'protected', tests);
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toHaveLength(1);
    });
  });

  describe('canChangeTestVisibility', () => {
    it('should allow making test more restrictive', () => {
      // public -> private: always allowed
      const result = canChangeTestVisibility('public', 'private', []);
      expect(result.allowed).toBe(true);
    });

    it('should block making test public if it has private questions', () => {
      const questions = [
        { id: '1', title: 'Q1', visibility: 'private' }
      ];
      const result = canChangeTestVisibility('private', 'public', questions);
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toHaveLength(1);
    });

    it('should allow making test public if all questions are public', () => {
      const questions = [
        { id: '1', title: 'Q1', visibility: 'public' }
      ];
      const result = canChangeTestVisibility('private', 'public', questions);
      expect(result.allowed).toBe(true);
    });
  });
});

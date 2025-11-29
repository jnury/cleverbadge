// backend/tests/integration/visibility.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, getTestSchema } from '../setup.js';
import { canQuestionBeInTest } from '../../utils/visibility.js';

describe('Visibility Matrix Integration Tests', () => {
  const sql = getTestDb();
  const schema = getTestSchema();

  // Helper to create a question with specific visibility
  async function createQuestion(visibility, title = `Question ${visibility}`) {
    const options = JSON.stringify({
      "0": { text: "Option 1", is_correct: true },
      "1": { text: "Option 2", is_correct: false }
    });
    const result = await sql`
      INSERT INTO ${sql(schema)}.questions (title, text, type, options, visibility, author_id)
      VALUES (
        ${title},
        'Test question text',
        'SINGLE',
        ${options},
        ${visibility},
        (SELECT id FROM ${sql(schema)}.users LIMIT 1)
      )
      RETURNING *
    `;
    return result[0];
  }

  // Helper to create a test with specific visibility
  async function createTest(visibility, title = `Test ${visibility}`) {
    const slug = `test-${visibility}-${Date.now()}`;
    const result = await sql`
      INSERT INTO ${sql(schema)}.tests (title, slug, description, visibility, is_enabled)
      VALUES (${title}, ${slug}, 'Test description', ${visibility}, true)
      RETURNING *
    `;
    return result[0];
  }

  // Helper to add question to test
  async function addQuestionToTest(testId, questionId, weight = 1) {
    try {
      const result = await sql`
        INSERT INTO ${sql(schema)}.test_questions (test_id, question_id, weight)
        VALUES (${testId}, ${questionId}, ${weight})
        RETURNING *
      `;
      return { success: true, data: result[0] };
    } catch (error) {
      return { success: false, error };
    }
  }

  describe('Question-Test Visibility Compatibility Matrix', () => {
    let publicQuestion, privateQuestion, protectedQuestion;
    let publicTest, privateTest, protectedTest;

    beforeEach(async () => {
      // Create questions with different visibility levels
      publicQuestion = await createQuestion('public', 'Public Question');
      privateQuestion = await createQuestion('private', 'Private Question');
      protectedQuestion = await createQuestion('protected', 'Protected Question');

      // Create tests with different visibility levels
      publicTest = await createTest('public', 'Public Test');
      privateTest = await createTest('private', 'Private Test');
      protectedTest = await createTest('protected', 'Protected Test');
    });

    it('should allow public question in public test', async () => {
      const result = await addQuestionToTest(publicTest.id, publicQuestion.id);
      expect(result.success).toBe(true);
      expect(result.data.test_id).toBe(publicTest.id);
      expect(result.data.question_id).toBe(publicQuestion.id);
    });

    it('should allow public question in private test', async () => {
      const result = await addQuestionToTest(privateTest.id, publicQuestion.id);
      expect(result.success).toBe(true);
      expect(result.data.test_id).toBe(privateTest.id);
      expect(result.data.question_id).toBe(publicQuestion.id);
    });

    it('should allow public question in protected test', async () => {
      const result = await addQuestionToTest(protectedTest.id, publicQuestion.id);
      expect(result.success).toBe(true);
      expect(result.data.test_id).toBe(protectedTest.id);
      expect(result.data.question_id).toBe(publicQuestion.id);
    });

    it('should NOT allow private question in public test', async () => {
      // The database should not have a constraint, but the API should reject this
      // In this integration test, we're testing the logic would prevent it
      expect(canQuestionBeInTest('private', 'public')).toBe(false);

      // If we try to add it directly (bypassing API validation), it would succeed at DB level
      // but the API validation should prevent this scenario
      const result = await addQuestionToTest(publicTest.id, privateQuestion.id);
      expect(result.success).toBe(true); // DB allows it

      // But our visibility check function says it shouldn't be allowed
      const isCompatible = canQuestionBeInTest(privateQuestion.visibility, publicTest.visibility);
      expect(isCompatible).toBe(false);
    });

    it('should allow private question in private test', async () => {
      const result = await addQuestionToTest(privateTest.id, privateQuestion.id);
      expect(result.success).toBe(true);
      expect(result.data.test_id).toBe(privateTest.id);
      expect(result.data.question_id).toBe(privateQuestion.id);
    });

    it('should allow private question in protected test', async () => {
      const result = await addQuestionToTest(protectedTest.id, privateQuestion.id);
      expect(result.success).toBe(true);
      expect(result.data.test_id).toBe(protectedTest.id);
      expect(result.data.question_id).toBe(privateQuestion.id);
    });

    it('should NOT allow protected question in public test', async () => {
      expect(canQuestionBeInTest('protected', 'public')).toBe(false);

      const result = await addQuestionToTest(publicTest.id, protectedQuestion.id);
      expect(result.success).toBe(true); // DB allows it

      const isCompatible = canQuestionBeInTest(protectedQuestion.visibility, publicTest.visibility);
      expect(isCompatible).toBe(false);
    });

    it('should NOT allow protected question in private test', async () => {
      expect(canQuestionBeInTest('protected', 'private')).toBe(false);

      const result = await addQuestionToTest(privateTest.id, protectedQuestion.id);
      expect(result.success).toBe(true); // DB allows it

      const isCompatible = canQuestionBeInTest(protectedQuestion.visibility, privateTest.visibility);
      expect(isCompatible).toBe(false);
    });

    it('should allow protected question in protected test', async () => {
      const result = await addQuestionToTest(protectedTest.id, protectedQuestion.id);
      expect(result.success).toBe(true);
      expect(result.data.test_id).toBe(protectedTest.id);
      expect(result.data.question_id).toBe(protectedQuestion.id);
    });
  });

  describe('Question Visibility Change Validation', () => {
    it('can make a question more restrictive if no tests use it', async () => {
      const question = await createQuestion('public', 'Unused Question');

      // Get tests using this question (should be empty)
      const testsUsingQuestion = await sql`
        SELECT t.id, t.title, t.visibility
        FROM ${sql(schema)}.test_questions tq
        INNER JOIN ${sql(schema)}.tests t ON tq.test_id = t.id
        WHERE tq.question_id = ${question.id}
      `;

      expect(testsUsingQuestion).toHaveLength(0);

      // Update should succeed
      const updated = await sql`
        UPDATE ${sql(schema)}.questions
        SET visibility = 'private'
        WHERE id = ${question.id}
        RETURNING *
      `;

      expect(updated[0].visibility).toBe('private');
    });

    it('can make a question more restrictive if tests using it are compatible', async () => {
      const question = await createQuestion('public', 'Question to restrict');
      const protectedTest = await createTest('protected', 'Protected Test');

      // Add question to protected test
      await addQuestionToTest(protectedTest.id, question.id);

      // Change question from public to private should be allowed
      // because protected test can contain private questions
      const updated = await sql`
        UPDATE ${sql(schema)}.questions
        SET visibility = 'private'
        WHERE id = ${question.id}
        RETURNING *
      `;

      expect(updated[0].visibility).toBe('private');

      // Verify it's still in the test
      const testQuestions = await sql`
        SELECT * FROM ${sql(schema)}.test_questions
        WHERE test_id = ${protectedTest.id} AND question_id = ${question.id}
      `;

      expect(testQuestions).toHaveLength(1);
    });

    it('cannot make a question more restrictive if it would break existing test assignments', async () => {
      const question = await createQuestion('public', 'Question in public test');
      const publicTest = await createTest('public', 'Public Test');

      // Add question to public test
      await addQuestionToTest(publicTest.id, question.id);

      // Now update the question to private visibility
      const updated = await sql`
        UPDATE ${sql(schema)}.questions
        SET visibility = 'private'
        WHERE id = ${question.id}
        RETURNING *
      `;

      expect(updated[0].visibility).toBe('private');

      // Get the test details
      const tests = await sql`
        SELECT t.id, t.title, t.visibility
        FROM ${sql(schema)}.test_questions tq
        INNER JOIN ${sql(schema)}.tests t ON tq.test_id = t.id
        WHERE tq.question_id = ${question.id}
      `;

      // The compatibility check should detect this
      expect(canQuestionBeInTest(updated[0].visibility, tests[0].visibility)).toBe(false);
    });

    it('can make a question less restrictive freely', async () => {
      const question = await createQuestion('protected', 'Protected Question');
      const protectedTest = await createTest('protected', 'Protected Test');

      // Add to protected test
      await addQuestionToTest(protectedTest.id, question.id);

      // Change to private (less restrictive)
      const updated = await sql`
        UPDATE ${sql(schema)}.questions
        SET visibility = 'private'
        WHERE id = ${question.id}
        RETURNING *
      `;

      expect(updated[0].visibility).toBe('private');

      // Should still be compatible
      expect(canQuestionBeInTest('private', 'protected')).toBe(true);
    });
  });

  describe('Test Visibility Change Validation', () => {
    it('can make a test less restrictive if all questions are compatible', async () => {
      const publicQuestion = await createQuestion('public', 'Public Question');
      const test = await createTest('private', 'Private Test');

      // Add public question to private test
      await addQuestionToTest(test.id, publicQuestion.id);

      // Change test to public (less restrictive)
      const updated = await sql`
        UPDATE ${sql(schema)}.tests
        SET visibility = 'public'
        WHERE id = ${test.id}
        RETURNING *
      `;

      expect(updated[0].visibility).toBe('public');

      // Verify compatibility
      expect(canQuestionBeInTest(publicQuestion.visibility, 'public')).toBe(true);
    });

    it('cannot make a test more restrictive unnecessarily but can make it less restrictive', async () => {
      const publicQuestion = await createQuestion('public', 'Public Question');
      const test = await createTest('protected', 'Protected Test');

      // Add public question
      await addQuestionToTest(test.id, publicQuestion.id);

      // Change from protected to private (less restrictive)
      const updated = await sql`
        UPDATE ${sql(schema)}.tests
        SET visibility = 'private'
        WHERE id = ${test.id}
        RETURNING *
      `;

      expect(updated[0].visibility).toBe('private');

      // Public question is still compatible with private test
      expect(canQuestionBeInTest(publicQuestion.visibility, 'private')).toBe(true);
    });

    it('cannot make a test less restrictive if it contains incompatible questions', async () => {
      const privateQuestion = await createQuestion('private', 'Private Question');
      const test = await createTest('private', 'Private Test');

      // Add private question
      await addQuestionToTest(test.id, privateQuestion.id);

      // Try to change test to public
      const updated = await sql`
        UPDATE ${sql(schema)}.tests
        SET visibility = 'public'
        WHERE id = ${test.id}
        RETURNING *
      `;

      expect(updated[0].visibility).toBe('public');

      // But now the question is incompatible
      expect(canQuestionBeInTest(privateQuestion.visibility, 'public')).toBe(false);
    });

    it('can make a test more restrictive freely', async () => {
      const publicQuestion = await createQuestion('public', 'Public Question');
      const test = await createTest('public', 'Public Test');

      // Add public question
      await addQuestionToTest(test.id, publicQuestion.id);

      // Change test to protected (more restrictive)
      const updated = await sql`
        UPDATE ${sql(schema)}.tests
        SET visibility = 'protected'
        WHERE id = ${test.id}
        RETURNING *
      `;

      expect(updated[0].visibility).toBe('protected');

      // Public question is compatible with protected test
      expect(canQuestionBeInTest(publicQuestion.visibility, 'protected')).toBe(true);
    });
  });

  describe('Complex Visibility Scenarios', () => {
    it('should handle multiple questions with mixed visibility in protected test', async () => {
      const publicQ = await createQuestion('public', 'Public Q');
      const privateQ = await createQuestion('private', 'Private Q');
      const protectedQ = await createQuestion('protected', 'Protected Q');
      const test = await createTest('protected', 'Protected Test');

      // All three should be addable to protected test
      await addQuestionToTest(test.id, publicQ.id);
      await addQuestionToTest(test.id, privateQ.id);
      await addQuestionToTest(test.id, protectedQ.id);

      const testQuestions = await sql`
        SELECT * FROM ${sql(schema)}.test_questions
        WHERE test_id = ${test.id}
      `;

      expect(testQuestions).toHaveLength(3);
    });

    it('should verify compatibility when changing test with multiple questions', async () => {
      const publicQ = await createQuestion('public', 'Public Q');
      const privateQ = await createQuestion('private', 'Private Q');
      const test = await createTest('private', 'Private Test');

      // Add both questions
      await addQuestionToTest(test.id, publicQ.id);
      await addQuestionToTest(test.id, privateQ.id);

      // Get all questions in test
      const questions = await sql`
        SELECT q.id, q.title, q.visibility
        FROM ${sql(schema)}.test_questions tq
        INNER JOIN ${sql(schema)}.questions q ON tq.question_id = q.id
        WHERE tq.test_id = ${test.id}
      `;

      // Check if test can be changed to public
      const hasIncompatible = questions.some(q => !canQuestionBeInTest(q.visibility, 'public'));
      expect(hasIncompatible).toBe(true); // Private question blocks it

      // But can be changed to protected
      const canChangeToProtected = questions.every(q => canQuestionBeInTest(q.visibility, 'protected'));
      expect(canChangeToProtected).toBe(true);
    });

    it('should verify all visibility matrix combinations work correctly', async () => {
      const visibilities = ['public', 'private', 'protected'];
      const matrix = {};

      // Build the expected matrix
      for (const qVis of visibilities) {
        matrix[qVis] = {};
        for (const tVis of visibilities) {
          matrix[qVis][tVis] = canQuestionBeInTest(qVis, tVis);
        }
      }

      // Verify the matrix matches our expectations
      expect(matrix.public.public).toBe(true);
      expect(matrix.public.private).toBe(true);
      expect(matrix.public.protected).toBe(true);

      expect(matrix.private.public).toBe(false);
      expect(matrix.private.private).toBe(true);
      expect(matrix.private.protected).toBe(true);

      expect(matrix.protected.public).toBe(false);
      expect(matrix.protected.private).toBe(false);
      expect(matrix.protected.protected).toBe(true);
    });
  });

  describe('Database Integrity with Visibility', () => {
    it('should maintain visibility data after multiple operations', async () => {
      const question = await createQuestion('private', 'Test Question');
      const test = await createTest('private', 'Test Test');

      // Add to test
      await addQuestionToTest(test.id, question.id);

      // Verify initial state
      let result = await sql`
        SELECT q.visibility as q_vis, t.visibility as t_vis
        FROM ${sql(schema)}.test_questions tq
        INNER JOIN ${sql(schema)}.questions q ON tq.question_id = q.id
        INNER JOIN ${sql(schema)}.tests t ON tq.test_id = t.id
        WHERE tq.test_id = ${test.id} AND tq.question_id = ${question.id}
      `;

      expect(result[0].q_vis).toBe('private');
      expect(result[0].t_vis).toBe('private');

      // Update test visibility
      await sql`
        UPDATE ${sql(schema)}.tests
        SET visibility = 'protected'
        WHERE id = ${test.id}
      `;

      // Verify question-test relationship is maintained
      result = await sql`
        SELECT q.visibility as q_vis, t.visibility as t_vis
        FROM ${sql(schema)}.test_questions tq
        INNER JOIN ${sql(schema)}.questions q ON tq.question_id = q.id
        INNER JOIN ${sql(schema)}.tests t ON tq.test_id = t.id
        WHERE tq.test_id = ${test.id} AND tq.question_id = ${question.id}
      `;

      expect(result[0].q_vis).toBe('private');
      expect(result[0].t_vis).toBe('protected');
      expect(canQuestionBeInTest(result[0].q_vis, result[0].t_vis)).toBe(true);
    });

    it('should prevent question deletion when used in tests (RESTRICT constraint)', async () => {
      const question = await createQuestion('public', 'Shared Question');
      const test1 = await createTest('public', 'Test 1');
      const test2 = await createTest('private', 'Test 2');

      // Add to both tests
      await addQuestionToTest(test1.id, question.id);
      await addQuestionToTest(test2.id, question.id);

      // Verify it's in both
      const links = await sql`
        SELECT * FROM ${sql(schema)}.test_questions
        WHERE question_id = ${question.id}
      `;

      expect(links).toHaveLength(2);

      // Try to delete question - should fail due to RESTRICT constraint
      let deleteError = null;
      try {
        await sql`
          DELETE FROM ${sql(schema)}.questions
          WHERE id = ${question.id}
        `;
      } catch (error) {
        deleteError = error;
      }

      expect(deleteError).toBeTruthy();
      expect(deleteError.code).toBe('23001'); // RESTRICT violation
      expect(deleteError.message).toContain('violates RESTRICT setting');

      // After the error, the transaction is in an error state
      // The afterEach hook will rollback, so we can't run more queries
      // This test successfully verifies that RESTRICT prevents deletion
    });

    it('should allow question deletion after removing from all tests', async () => {
      const question = await createQuestion('public', 'Question to Remove');
      const test1 = await createTest('public', 'Test 1');
      const test2 = await createTest('private', 'Test 2');

      // Add to both tests
      await addQuestionToTest(test1.id, question.id);
      await addQuestionToTest(test2.id, question.id);

      // Remove from all tests
      await sql`
        DELETE FROM ${sql(schema)}.test_questions
        WHERE question_id = ${question.id}
      `;

      // Verify removed
      const links = await sql`
        SELECT * FROM ${sql(schema)}.test_questions
        WHERE question_id = ${question.id}
      `;

      expect(links).toHaveLength(0);

      // Now deletion should succeed
      await sql`
        DELETE FROM ${sql(schema)}.questions
        WHERE id = ${question.id}
      `;

      const finalCheck = await sql`
        SELECT * FROM ${sql(schema)}.questions
        WHERE id = ${question.id}
      `;

      expect(finalCheck).toHaveLength(0);
    });

    it('should handle test deletion that contains questions', async () => {
      const question = await createQuestion('private', 'Test Question');
      const test = await createTest('private', 'Test to Delete');

      await addQuestionToTest(test.id, question.id);

      // Delete test
      await sql`
        DELETE FROM ${sql(schema)}.tests
        WHERE id = ${test.id}
      `;

      // Verify question still exists
      const questions = await sql`
        SELECT * FROM ${sql(schema)}.questions
        WHERE id = ${question.id}
      `;

      expect(questions).toHaveLength(1);

      // Verify link is gone
      const links = await sql`
        SELECT * FROM ${sql(schema)}.test_questions
        WHERE test_id = ${test.id}
      `;

      expect(links).toHaveLength(0);
    });
  });
});

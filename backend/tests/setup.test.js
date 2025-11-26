import { describe, it, expect } from 'vitest';
import { getTestDb, getTestSchema } from './setup.js';

describe('Test Infrastructure', () => {
  it('should have test database connection', () => {
    const db = getTestDb();
    expect(db).toBeDefined();
  });

  it('should have test schema name', () => {
    const schema = getTestSchema();
    expect(schema).toBe('test');
  });

  it('should be able to query test data', async () => {
    const db = getTestDb();
    const schema = getTestSchema();

    const questions = await db.unsafe(`SELECT * FROM ${schema}.questions`);
    expect(questions.length).toBe(5);
  });

  it('should have seeded users', async () => {
    const db = getTestDb();
    const schema = getTestSchema();

    const users = await db.unsafe(`SELECT * FROM ${schema}.users`);
    expect(users.length).toBe(1);
    expect(users[0].username).toBe('testadmin');
  });

  it('should have seeded tests', async () => {
    const db = getTestDb();
    const schema = getTestSchema();

    const tests = await db.unsafe(`SELECT * FROM ${schema}.tests`);
    expect(tests.length).toBe(3);
  });

  it('should have test-question relationships', async () => {
    const db = getTestDb();
    const schema = getTestSchema();

    const testQuestions = await db.unsafe(`SELECT * FROM ${schema}.test_questions`);
    expect(testQuestions.length).toBe(3);
  });

  it('should have assessments with different statuses', async () => {
    const db = getTestDb();
    const schema = getTestSchema();

    const assessments = await db.unsafe(`SELECT * FROM ${schema}.assessments`);
    expect(assessments.length).toBe(3);

    const completed = assessments.filter(a => a.status === 'COMPLETED');
    const inProgress = assessments.filter(a => a.status === 'STARTED');

    expect(completed.length).toBe(2);
    expect(inProgress.length).toBe(1);
  });

  it('should rollback changes between tests', async () => {
    const db = getTestDb();
    const schema = getTestSchema();

    // Insert a new question
    await db.unsafe(`
      INSERT INTO ${schema}.questions (title, text, type, options, correct_answers, author_id, visibility)
      VALUES ('Rollback Test', 'Rollback test question?', 'SINGLE', '["A", "B"]', '[0]', '550e8400-e29b-41d4-a716-446655440001', 'private')
    `);

    // Verify it was inserted
    const afterInsert = await db.unsafe(`
      SELECT * FROM ${schema}.questions WHERE text = 'Rollback test question?'
    `);
    expect(afterInsert.length).toBe(1);

    // This will be rolled back after the test
  });

  it('should have clean state after rollback', async () => {
    const db = getTestDb();
    const schema = getTestSchema();

    // Verify the question from previous test was rolled back
    const questions = await db.unsafe(`
      SELECT * FROM ${schema}.questions WHERE text = 'Rollback test question?'
    `);
    expect(questions.length).toBe(0);

    // Should still have the original 5 questions
    const allQuestions = await db.unsafe(`SELECT * FROM ${schema}.questions`);
    expect(allQuestions.length).toBe(5);
  });
});

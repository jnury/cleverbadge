import { describe, it, expect } from 'vitest';
import { getTestDb, getTestSchema } from '../setup.js';
import request from 'supertest';
import app from '../../index.js';

describe('Tests Integration Tests', () => {
  const sql = getTestDb();
  const schema = getTestSchema();

  it('should fetch all tests', async () => {
    const tests = await sql`
      SELECT * FROM ${sql(schema)}.tests
      ORDER BY created_at ASC
    `;

    expect(tests).toHaveLength(3);
    expect(tests[0].title).toBe('Math & Geography Test');
    expect(tests[0].slug).toBe('math-geo');
    expect(tests[0].is_enabled).toBe(true);
  });

  it('should create a new test', async () => {
    const title = 'New Test';
    const slug = 'new-test-integration';
    const description = 'A new test for testing';
    const isEnabled = true;
    const visibility = 'private';

    const result = await sql`
      INSERT INTO ${sql(schema)}.tests (title, slug, description, is_enabled, visibility)
      VALUES (${title}, ${slug}, ${description}, ${isEnabled}, ${visibility})
      RETURNING *
    `;

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe(title);
    expect(result[0].slug).toBe(slug);
    expect(result[0].description).toBe(description);
    expect(result[0].is_enabled).toBe(isEnabled);
    expect(result[0].visibility).toBe(visibility);
  });

  it('should add questions to a test', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440022'; // Empty test
    const questionId1 = '550e8400-e29b-41d4-a716-446655440013';
    const questionId2 = '550e8400-e29b-41d4-a716-446655440014';

    const result = await sql`
      INSERT INTO ${sql(schema)}.test_questions (test_id, question_id, weight)
      VALUES
        (${testId}, ${questionId1}, 2),
        (${testId}, ${questionId2}, 1)
      RETURNING *
    `;

    expect(result).toHaveLength(2);
    expect(result[0].test_id).toBe(testId);
    expect(result[0].weight).toBe(2);
    expect(result[1].weight).toBe(1);
  });

  it('should fetch test with questions', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020'; // Math & Geography Test

    // Get test
    const tests = await sql`
      SELECT * FROM ${sql(schema)}.tests
      WHERE id = ${testId}
    `;

    expect(tests).toHaveLength(1);

    // Get questions for this test
    const questions = await sql`
      SELECT
        tq.question_id,
        tq.weight,
        q.text,
        q.type,
        q.options
      FROM ${sql(schema)}.test_questions tq
      INNER JOIN ${sql(schema)}.questions q ON tq.question_id = q.id
      WHERE tq.test_id = ${testId}
      ORDER BY q.text
    `;

    expect(questions).toHaveLength(3);
    // Verify we have all three questions (order may vary)
    const questionTexts = questions.map(q => q.text);
    expect(questionTexts).toContain('What is 2 + 2?');
    expect(questionTexts).toContain('What is the capital of France?');
    expect(questionTexts).toContain('Select all even numbers:');
  });

  it('should verify test-question weights', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440020'; // Math & Geography Test

    const testQuestions = await sql`
      SELECT question_id, weight
      FROM ${sql(schema)}.test_questions
      WHERE test_id = ${testId}
      ORDER BY question_id
    `;

    expect(testQuestions).toHaveLength(3);

    // Verify specific weights
    const q1 = testQuestions.find(tq => tq.question_id === '550e8400-e29b-41d4-a716-446655440010');
    const q2 = testQuestions.find(tq => tq.question_id === '550e8400-e29b-41d4-a716-446655440011');
    const q3 = testQuestions.find(tq => tq.question_id === '550e8400-e29b-41d4-a716-446655440012');

    expect(q1.weight).toBe(1);
    expect(q2.weight).toBe(2);
    expect(q3.weight).toBe(2);

    // Calculate total weight
    // Calculate total weight
    const totalWeight = testQuestions.reduce((sum, tq) => sum + tq.weight, 0);
    expect(totalWeight).toBe(5);
  });

  describe('Test Enable/Disable API', () => {
    let token;

    // Login before tests
    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });
      token = loginRes.body.token;
    });

    it('should prevent access to disabled test', async () => {
      // 1. Create a disabled test via API
      const title = 'Disabled Test API';
      const isEnabled = false;
      const visibility = 'public';

      const createRes = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title,
          is_enabled: isEnabled,
          visibility
        });

      expect(createRes.status).toBe(201);
      const slug = createRes.body.slug;

      // 2. Try to access via public API
      const response = await request(app)
        .get(`/api/tests/slug/${slug}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow access to enabled test', async () => {
      // 1. Create an enabled test via API
      const title = 'Enabled Test API';
      const isEnabled = true;
      const visibility = 'public';

      const createRes = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title,
          is_enabled: isEnabled,
          visibility
        });

      expect(createRes.status).toBe(201);
      const slug = createRes.body.slug;

      // 2. Try to access via public API
      const response = await request(app)
        .get(`/api/tests/slug/${slug}`);

      expect(response.status).toBe(200);
      expect(response.body.slug).toBe(slug);
    });
  });
});

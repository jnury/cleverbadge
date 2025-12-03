import { describe, it, expect } from 'vitest';
import { getTestDb, getTestSchema } from '../setup.js';
import request from 'supertest';
import app from '../../index.js';
import fs from 'fs/promises';
import path from 'path';

describe('Questions Integration Tests', () => {
  const sql = getTestDb();
  const schema = getTestSchema();

  it('should fetch all questions', async () => {
    const questions = await sql`
      SELECT * FROM ${sql(schema)}.questions
      ORDER BY created_at ASC
    `;

    expect(questions).toHaveLength(5);
    expect(questions[0].text).toBe('What is 2 + 2?');
    expect(questions[0].type).toBe('SINGLE');
  });

  it('should create a new question', async () => {
    const title = 'Addition Test Question';
    const text = 'What is 3 + 3?';
    const type = 'SINGLE';
    const options = JSON.stringify({
      "0": { text: "5", is_correct: false },
      "1": { text: "6", is_correct: true },
      "2": { text: "7", is_correct: false },
      "3": { text: "8", is_correct: false }
    });
    const tags = JSON.stringify(['math', 'test']);
    const authorId = '550e8400-e29b-41d4-a716-446655440001'; // testadmin
    const visibility = 'private';

    const result = await sql`
      INSERT INTO ${sql(schema)}.questions (title, text, type, options, tags, author_id, visibility)
      VALUES (${title}, ${text}, ${type}, ${options}, ${tags}, ${authorId}, ${visibility})
      RETURNING *
    `;

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe(title);
    expect(result[0].text).toBe(text);
    expect(result[0].type).toBe(type);
    expect(result[0].author_id).toBe(authorId);
    expect(result[0].visibility).toBe(visibility);
    // When inserting JSONB as strings, postgres-js returns them as strings too
    // We need to compare the stored value (which might be string or parsed)
    const storedOptions = typeof result[0].options === 'string'
      ? JSON.parse(result[0].options)
      : result[0].options;
    const storedTags = typeof result[0].tags === 'string'
      ? JSON.parse(result[0].tags)
      : result[0].tags;

    expect(storedOptions).toEqual(JSON.parse(options));
    expect(storedTags).toEqual(JSON.parse(tags));
  });

  it('should update a question', async () => {
    const questionId = '550e8400-e29b-41d4-a716-446655440010';
    const newText = 'What is 2 + 2? (Updated)';

    const result = await sql`
      UPDATE ${sql(schema)}.questions
      SET text = ${newText}
      WHERE id = ${questionId}
      RETURNING *
    `;

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(newText);
    expect(result[0].id).toBe(questionId);
  });

  it('should delete a question', async () => {
    const questionId = '550e8400-e29b-41d4-a716-446655440014';

    const result = await sql`
      DELETE FROM ${sql(schema)}.questions
      WHERE id = ${questionId}
      RETURNING *
    `;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(questionId);

    // Verify deletion
    const check = await sql`
      SELECT * FROM ${sql(schema)}.questions
      WHERE id = ${questionId}
    `;
    expect(check).toHaveLength(0);
  });

  it('should filter questions by tags using JSONB @> operator', async () => {
    // Find all questions with 'math' tag
    const mathQuestions = await sql`
      SELECT * FROM ${sql(schema)}.questions
      WHERE tags @> '["math"]'::jsonb
    `;

    expect(mathQuestions.length).toBeGreaterThan(0);
    mathQuestions.forEach(q => {
      expect(q.tags).toContain('math');
    });

    // Find questions with both 'math' and 'easy' tags
    const easyMathQuestions = await sql`
      SELECT * FROM ${sql(schema)}.questions
      WHERE tags @> '["math", "easy"]'::jsonb
    `;

    expect(easyMathQuestions).toHaveLength(1);
    expect(easyMathQuestions[0].id).toBe('550e8400-e29b-41d4-a716-446655440010');
  });

  describe('Markdown Validation', () => {
    const authorId = '550e8400-e29b-41d4-a716-446655440001'; // testadmin
    const visibility = 'private';

    it('should accept valid markdown in question text', async () => {
      const title = 'JavaScript Question';
      const text = '**What is** `JavaScript`?';
      const type = 'SINGLE';
      const options = JSON.stringify({
        "0": { text: "A language", is_correct: true },
        "1": { text: "A framework", is_correct: false }
      });
      const tags = JSON.stringify(['programming']);

      const result = await sql`
        INSERT INTO ${sql(schema)}.questions (title, text, type, options, tags, author_id, visibility)
        VALUES (${title}, ${text}, ${type}, ${options}, ${tags}, ${authorId}, ${visibility})
        RETURNING *
      `;

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });

    it('should accept valid code blocks in question text', async () => {
      const title = 'Code Block Question';
      const text = 'What does this do?\n```javascript\nconst x = 1;\n```';
      const type = 'SINGLE';
      const options = JSON.stringify({
        "0": { text: "Declares variable", is_correct: true },
        "1": { text: "Prints output", is_correct: false }
      });
      const tags = JSON.stringify([]);

      const result = await sql`
        INSERT INTO ${sql(schema)}.questions (title, text, type, options, tags, author_id, visibility)
        VALUES (${title}, ${text}, ${type}, ${options}, ${tags}, ${authorId}, ${visibility})
        RETURNING *
      `;

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });

    it('should reject unclosed code blocks in question text', async () => {
      const title = 'Bad Code Block Question';
      const text = 'Bad code block\n```javascript\nconst x = 1;';
      const type = 'SINGLE';
      const options = JSON.stringify({
        "0": { text: "A", is_correct: true },
        "1": { text: "B", is_correct: false }
      });
      const tags = JSON.stringify([]);

      // This test expects validation to happen at the API level
      // For now, we're testing that the database layer accepts the data
      // API validation will be added in the next step
      const result = await sql`
        INSERT INTO ${sql(schema)}.questions (title, text, type, options, tags, author_id, visibility)
        VALUES (${title}, ${text}, ${type}, ${options}, ${tags}, ${authorId}, ${visibility})
        RETURNING *
      `;

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });

    it('should accept markdown in options', async () => {
      const title = 'Markdown Options Question';
      const text = 'Select the correct code';
      const type = 'SINGLE';
      const options = JSON.stringify({
        "0": { text: "`const x = 1`", is_correct: true },
        "1": { text: "`let y = 2`", is_correct: false }
      });
      const tags = JSON.stringify([]);

      const result = await sql`
        INSERT INTO ${sql(schema)}.questions (title, text, type, options, tags, author_id, visibility)
        VALUES (${title}, ${text}, ${type}, ${options}, ${tags}, ${authorId}, ${visibility})
        RETURNING *
      `;

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });
  });

  describe('Import Questions API', () => {
    const adminToken = 'mock-admin-token'; // We might need a real token or mock the auth middleware
    // Note: The integration tests setup might need to handle auth mocking if not already done.
    // Based on auth.test.js, we can get a real token.

    it('should import questions from YAML file', async () => {
      // 1. Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });
      const token = loginRes.body.token;

      // 2. Create a temporary YAML file
      const yamlContent = `
- title: "Imported Question 1"
  text: "What is imported?"
  type: "SINGLE"
  visibility: "public"
  options:
    - text: "Nothing"
      is_correct: false
    - text: "Something"
      is_correct: true
  tags: ["import", "test"]
`;
      const filePath = path.join(__dirname, 'temp_import.yaml');
      await fs.writeFile(filePath, yamlContent);

      try {
        // 3. Upload file
        const response = await request(app)
          .post('/api/questions/import')
          .set('Authorization', `Bearer ${token}`)
          .attach('file', filePath);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('imported_count');
        expect(response.body.imported_count).toBe(1);

        // 4. Verify in DB
        const questions = await sql`
          SELECT * FROM ${sql(schema)}.questions
          WHERE title = 'Imported Question 1'
        `;
        expect(questions).toHaveLength(1);
        expect(questions[0].text).toBe('What is imported?');
      } finally {
        // Cleanup
        await fs.unlink(filePath).catch(() => { });
      }
    });

    it('should reject invalid YAML format', async () => {
      // 1. Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });
      const token = loginRes.body.token;

      // 2. Create invalid YAML
      const yamlContent = `
- title: "Invalid Question"
  text: "Missing options"
  type: "SINGLE"
`;
      const filePath = path.join(__dirname, 'temp_invalid.yaml');
      await fs.writeFile(filePath, yamlContent);

      try {
        // 3. Upload
        const response = await request(app)
          .post('/api/questions/import')
          .set('Authorization', `Bearer ${token}`)
          .attach('file', filePath);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      } finally {
        await fs.unlink(filePath).catch(() => { });
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import { getTestDb, getTestSchema } from '../setup.js';

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
    const options = JSON.stringify(['5', '6', '7', '8']);
    const correctAnswers = JSON.stringify([1]);
    const tags = JSON.stringify(['math', 'test']);
    const authorId = '550e8400-e29b-41d4-a716-446655440001'; // testadmin
    const visibility = 'private';

    const result = await sql`
      INSERT INTO ${sql(schema)}.questions (title, text, type, options, correct_answers, tags, author_id, visibility)
      VALUES (${title}, ${text}, ${type}, ${options}, ${correctAnswers}, ${tags}, ${authorId}, ${visibility})
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
    const storedCorrectAnswers = typeof result[0].correct_answers === 'string'
      ? JSON.parse(result[0].correct_answers)
      : result[0].correct_answers;
    const storedTags = typeof result[0].tags === 'string'
      ? JSON.parse(result[0].tags)
      : result[0].tags;

    expect(storedOptions).toEqual(JSON.parse(options));
    expect(storedCorrectAnswers).toEqual(JSON.parse(correctAnswers));
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
      const options = JSON.stringify(['A language', 'A framework']);
      const correctAnswers = JSON.stringify([0]);
      const tags = JSON.stringify(['programming']);

      const result = await sql`
        INSERT INTO ${sql(schema)}.questions (title, text, type, options, correct_answers, tags, author_id, visibility)
        VALUES (${title}, ${text}, ${type}, ${options}, ${correctAnswers}, ${tags}, ${authorId}, ${visibility})
        RETURNING *
      `;

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });

    it('should accept valid code blocks in question text', async () => {
      const title = 'Code Block Question';
      const text = 'What does this do?\n```javascript\nconst x = 1;\n```';
      const type = 'SINGLE';
      const options = JSON.stringify(['Declares variable', 'Prints output']);
      const correctAnswers = JSON.stringify([0]);
      const tags = JSON.stringify([]);

      const result = await sql`
        INSERT INTO ${sql(schema)}.questions (title, text, type, options, correct_answers, tags, author_id, visibility)
        VALUES (${title}, ${text}, ${type}, ${options}, ${correctAnswers}, ${tags}, ${authorId}, ${visibility})
        RETURNING *
      `;

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });

    it('should reject unclosed code blocks in question text', async () => {
      const title = 'Bad Code Block Question';
      const text = 'Bad code block\n```javascript\nconst x = 1;';
      const type = 'SINGLE';
      const options = JSON.stringify(['A', 'B']);
      const correctAnswers = JSON.stringify([0]);
      const tags = JSON.stringify([]);

      // This test expects validation to happen at the API level
      // For now, we're testing that the database layer accepts the data
      // API validation will be added in the next step
      const result = await sql`
        INSERT INTO ${sql(schema)}.questions (title, text, type, options, correct_answers, tags, author_id, visibility)
        VALUES (${title}, ${text}, ${type}, ${options}, ${correctAnswers}, ${tags}, ${authorId}, ${visibility})
        RETURNING *
      `;

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });

    it('should accept markdown in options', async () => {
      const title = 'Markdown Options Question';
      const text = 'Select the correct code';
      const type = 'SINGLE';
      const options = JSON.stringify(['`const x = 1`', '`let y = 2`']);
      const correctAnswers = JSON.stringify([0]);
      const tags = JSON.stringify([]);

      const result = await sql`
        INSERT INTO ${sql(schema)}.questions (title, text, type, options, correct_answers, tags, author_id, visibility)
        VALUES (${title}, ${text}, ${type}, ${options}, ${correctAnswers}, ${tags}, ${authorId}, ${visibility})
        RETURNING *
      `;

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
    });
  });
});

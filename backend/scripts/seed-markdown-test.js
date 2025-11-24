import { sql, dbSchema } from '../db/index.js';
import 'dotenv/config';

async function seedMarkdownTest() {
  try {
    console.log(`Seeding markdown test data in ${dbSchema} schema...`);

    // Create test with markdown description
    const testTitle = 'Markdown Test';
    const testSlug = 'markdown-test';
    const testDescription = 'This test demonstrates **markdown rendering** with `code syntax` highlighting.';

    const [test] = await sql`
      INSERT INTO ${sql(dbSchema)}.tests (title, slug, description, is_enabled)
      VALUES (
        ${testTitle},
        ${testSlug},
        ${testDescription},
        true
      )
      RETURNING *
    `;

    console.log(`Created test: ${test.title} (${test.slug})`);

    // Create markdown questions
    const questions = [
      {
        text: '**What does this code do?**\n\n```javascript\nconst sum = (a, b) => a + b;\n```',
        type: 'SINGLE',
        options: ['Adds two numbers', 'Multiplies two numbers', 'Subtracts two numbers'],
        correct_answers: ['Adds two numbers'],
        tags: ['javascript', 'functions']
      },
      {
        text: 'Select all `array methods`:',
        type: 'MULTIPLE',
        options: ['`map()`', '`filter()`', '`console.log()`', '`reduce()`'],
        correct_answers: ['`map()`', '`filter()`', '`reduce()`'],
        tags: ['javascript', 'arrays']
      }
    ];

    for (const q of questions) {
      const [question] = await sql`
        INSERT INTO ${sql(dbSchema)}.questions (text, type, options, correct_answers, tags)
        VALUES (${q.text}, ${q.type}, ${q.options}, ${q.correct_answers}, ${q.tags})
        RETURNING *
      `;

      await sql`
        INSERT INTO ${sql(dbSchema)}.test_questions (test_id, question_id, weight)
        VALUES (${test.id}, ${question.id}, 1)
      `;

      console.log(`Added question: ${question.text.substring(0, 50)}...`);
    }

    console.log('Markdown test seed complete!');
  } catch (error) {
    console.error('Error seeding markdown test:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedMarkdownTest();

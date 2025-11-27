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

    // Create markdown questions (new options format with is_correct per option)
    const questions = [
      {
        text: '**What does this code do?**\n\n```javascript\nconst sum = (a, b) => a + b;\n```',
        type: 'SINGLE',
        options: {
          "0": { text: 'Adds two numbers', is_correct: true, explanation: 'Arrow function syntax for addition.' },
          "1": { text: 'Multiplies two numbers', is_correct: false },
          "2": { text: 'Subtracts two numbers', is_correct: false }
        },
        tags: ['javascript', 'functions']
      },
      {
        text: 'Select all `array methods`:',
        type: 'MULTIPLE',
        options: {
          "0": { text: '`map()`', is_correct: true, explanation: 'map() transforms each element in an array.' },
          "1": { text: '`filter()`', is_correct: true, explanation: 'filter() returns elements that pass a test.' },
          "2": { text: '`console.log()`', is_correct: false, explanation: 'console.log() is not an array method.' },
          "3": { text: '`reduce()`', is_correct: true, explanation: 'reduce() combines all elements into a single value.' }
        },
        tags: ['javascript', 'arrays']
      }
    ];

    for (const q of questions) {
      const [question] = await sql`
        INSERT INTO ${sql(dbSchema)}.questions (text, type, options, tags)
        VALUES (${q.text}, ${q.type}, ${q.options}, ${q.tags})
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

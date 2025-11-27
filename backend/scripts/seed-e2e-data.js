import postgres from 'postgres';
import { hashPassword } from '../utils/password.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedE2EData() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    const dbSchema = process.env.NODE_ENV || 'development';
    const sql = postgres(connectionString, {
      onnotice: () => {}
    });

    console.log(`\n🌱 Seeding E2E test data (schema: ${dbSchema})\n`);

    // Create admin user if not exists
    const username = 'admin';
    const password = 'admin123';

    const existing = await sql`
      SELECT id FROM ${sql(dbSchema)}.users
      WHERE username = ${username}
    `;

    let adminId;
    if (existing.length > 0) {
      console.log('✓ Admin user already exists');
      adminId = existing[0].id;
    } else {
      console.log('Creating admin user...');
      const passwordHash = await hashPassword(password);
      const result = await sql`
        INSERT INTO ${sql(dbSchema)}.users (username, password_hash)
        VALUES (${username}, ${passwordHash})
        RETURNING id
      `;
      adminId = result[0].id;
      console.log('✓ Admin user created');
    }

    // Create test questions if not exist (new options format with is_correct per option)
    console.log('Checking for test questions...');
    const questionsCheck = await sql`
      SELECT COUNT(*) as count FROM ${sql(dbSchema)}.questions
    `;

    const q1Id = '550e8400-e29b-41d4-a716-446655440010';
    const q2Id = '550e8400-e29b-41d4-a716-446655440011';
    const q3Id = '550e8400-e29b-41d4-a716-446655440012';
    const q4Id = '550e8400-e29b-41d4-a716-446655440013';
    const q5Id = '550e8400-e29b-41d4-a716-446655440014';
    const q6Id = '550e8400-e29b-41d4-a716-446655440015';

    // Options in new format: dict with string keys, each option has text, is_correct, optional explanation
    const q1Options = {
      "0": { text: '3', is_correct: false },
      "1": { text: '4', is_correct: true },
      "2": { text: '5', is_correct: false },
      "3": { text: '6', is_correct: false }
    };

    const q2Options = {
      "0": { text: 'London', is_correct: false, explanation: 'London is the capital of the United Kingdom.' },
      "1": { text: 'Paris', is_correct: true, explanation: 'Paris has been France\'s capital since the 10th century.' },
      "2": { text: 'Berlin', is_correct: false, explanation: 'Berlin is the capital of Germany.' },
      "3": { text: 'Madrid', is_correct: false, explanation: 'Madrid is the capital of Spain.' }
    };

    const q3Options = {
      "0": { text: '1', is_correct: false, explanation: '1 is an odd number.' },
      "1": { text: '2', is_correct: true, explanation: '2 is the smallest even number.' },
      "2": { text: '3', is_correct: false, explanation: '3 is an odd number.' },
      "3": { text: '4', is_correct: true, explanation: '4 is an even number (4 = 2 × 2).' }
    };

    const q4Options = {
      "0": { text: 'Multiplies array elements', is_correct: false },
      "1": { text: 'Sums array elements using `reduce()`', is_correct: true, explanation: 'The reduce() method executes a reducer function on each element of the array, resulting in single output value.' },
      "2": { text: 'Filters array using `map()`', is_correct: false },
      "3": { text: 'Sorts the array', is_correct: false }
    };

    const q5Options = {
      "0": { text: '3', is_correct: false },
      "1": { text: '4', is_correct: false },
      "2": { text: '5', is_correct: true },
      "3": { text: '6', is_correct: false }
    };

    const q6Options = {
      "0": { text: 'Red', is_correct: false },
      "1": { text: 'Blue', is_correct: true },
      "2": { text: 'Green', is_correct: false },
      "3": { text: 'Yellow', is_correct: false }
    };

    if (parseInt(questionsCheck[0].count) === 0) {
      console.log('Creating sample questions...');

      await sql`
        INSERT INTO ${sql(dbSchema)}.questions (id, title, text, type, options, tags, author_id, visibility)
        VALUES
          (${q1Id}, 'Basic Math Question', 'What is 2 + 2?', 'SINGLE', ${q1Options}, '["math", "easy"]', ${adminId}, 'private'),
          (${q2Id}, 'Geography Capital', 'What is the capital of France?', 'SINGLE', ${q2Options}, '["geography"]', ${adminId}, 'public'),
          (${q3Id}, 'Even Numbers', 'Select all even numbers:', 'MULTIPLE', ${q3Options}, '["math"]', ${adminId}, 'public'),
          (${q4Id}, 'JavaScript Code Analysis', '**What does this code do?**

\`\`\`javascript
const sum = arr => arr.reduce((a, b) => a + b, 0);
\`\`\`', 'SINGLE', ${q4Options}, '["javascript", "markdown"]', ${adminId}, 'protected'),
          (${q5Id}, 'Protected Question Example', 'This is a protected question. What is 10 / 2?', 'SINGLE', ${q5Options}, '["math"]', ${adminId}, 'protected'),
          (${q6Id}, 'Public Question Example', 'What color is the sky?', 'SINGLE', ${q6Options}, '["general"]', ${adminId}, 'public')
      `;
      console.log('✓ Sample questions created');
    } else {
      console.log(`✓ Found ${questionsCheck[0].count} questions already`);
    }

    // Create math-geo test if it doesn't exist (private test)
    const mathGeoTestId = '550e8400-e29b-41d4-a716-446655440020';
    const mathGeoTestCheck = await sql`
      SELECT COUNT(*) as count FROM ${sql(dbSchema)}.tests WHERE id = ${mathGeoTestId}
    `;

    if (parseInt(mathGeoTestCheck[0].count) === 0) {
      console.log('Creating math-geo test...');
      await sql`
        INSERT INTO ${sql(dbSchema)}.tests (id, title, slug, description, is_enabled, pass_threshold, visibility)
        VALUES (${mathGeoTestId}, 'Math & Geography Test', 'math-geo', 'Test your math and geography knowledge', true, 70, 'private')
      `;

      // Add questions to test (private test can include any visibility)
      await sql`
        INSERT INTO ${sql(dbSchema)}.test_questions (test_id, question_id, weight)
        VALUES
          (${mathGeoTestId}, ${q1Id}, 1),
          (${mathGeoTestId}, ${q2Id}, 2),
          (${mathGeoTestId}, ${q3Id}, 2)
      `;
      console.log('✓ Math-geo test created');
    } else {
      console.log('✓ Math-geo test already exists');
    }

    // Create markdown test if it doesn't exist (public test)
    const markdownTestId = '550e8400-e29b-41d4-a716-446655440021';
    const markdownTestCheck = await sql`
      SELECT COUNT(*) as count FROM ${sql(dbSchema)}.tests WHERE id = ${markdownTestId}
    `;

    if (parseInt(markdownTestCheck[0].count) === 0) {
      console.log('Creating markdown test (public)...');
      await sql`
        INSERT INTO ${sql(dbSchema)}.tests (id, title, slug, description, is_enabled, pass_threshold, visibility)
        VALUES (${markdownTestId}, 'Markdown Rendering Test', 'markdown-test', 'This test demonstrates **markdown rendering** with \`code syntax\` highlighting', true, 70, 'public')
      `;

      // Add markdown question to test (public test can only include public questions)
      await sql`
        INSERT INTO ${sql(dbSchema)}.test_questions (test_id, question_id, weight)
        VALUES
          (${markdownTestId}, ${q2Id}, 1),
          (${markdownTestId}, ${q3Id}, 1),
          (${markdownTestId}, ${q6Id}, 1)
      `;
      console.log('✓ Markdown test created');
    } else {
      console.log('✓ Markdown test already exists');
    }

    // Create protected test if it doesn't exist
    const protectedTestId = '550e8400-e29b-41d4-a716-446655440022';
    const protectedTestCheck = await sql`
      SELECT COUNT(*) as count FROM ${sql(dbSchema)}.tests WHERE id = ${protectedTestId}
    `;

    if (parseInt(protectedTestCheck[0].count) === 0) {
      console.log('Creating protected test...');
      await sql`
        INSERT INTO ${sql(dbSchema)}.tests (id, title, slug, description, is_enabled, pass_threshold, visibility)
        VALUES (${protectedTestId}, 'Protected Test', 'protected-test', 'This test is protected and requires special access', true, 70, 'protected')
      `;

      // Add questions to protected test (can include public and protected questions)
      await sql`
        INSERT INTO ${sql(dbSchema)}.test_questions (test_id, question_id, weight)
        VALUES
          (${protectedTestId}, ${q4Id}, 2),
          (${protectedTestId}, ${q5Id}, 2),
          (${protectedTestId}, ${q2Id}, 1)
      `;
      console.log('✓ Protected test created');
    } else {
      console.log('✓ Protected test already exists');
    }

    console.log('\n✅ E2E test data seeded successfully!\n');

    await sql.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

seedE2EData();

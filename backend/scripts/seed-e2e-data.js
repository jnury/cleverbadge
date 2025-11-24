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

    // Create test questions if not exist
    console.log('Checking for test questions...');
    const questionsCheck = await sql`
      SELECT COUNT(*) as count FROM ${sql(dbSchema)}.questions
    `;

    const q1Id = '550e8400-e29b-41d4-a716-446655440010';
    const q2Id = '550e8400-e29b-41d4-a716-446655440011';
    const q3Id = '550e8400-e29b-41d4-a716-446655440012';
    const q4Id = '550e8400-e29b-41d4-a716-446655440013';

    if (parseInt(questionsCheck[0].count) === 0) {
      console.log('Creating sample questions...');

      await sql`
        INSERT INTO ${sql(dbSchema)}.questions (id, text, type, options, correct_answers, tags)
        VALUES
          (${q1Id}, 'What is 2 + 2?', 'SINGLE', '["3", "4", "5", "6"]', '[1]', '["math", "easy"]'),
          (${q2Id}, 'What is the capital of France?', 'SINGLE', '["London", "Paris", "Berlin", "Madrid"]', '[1]', '["geography"]'),
          (${q3Id}, 'Select all even numbers:', 'MULTIPLE', '["1", "2", "3", "4"]', '[1, 3]', '["math"]'),
          (${q4Id}, '**What does this code do?**\n\n\`\`\`javascript\nconst sum = arr => arr.reduce((a, b) => a + b, 0);\n\`\`\`', 'SINGLE', '["Multiplies array elements", "Sums array elements using \`reduce()\`", "Filters array using \`map()\`", "Sorts the array"]', '[1]', '["javascript", "markdown"]')
      `;
      console.log('✓ Sample questions created');
    } else {
      console.log(`✓ Found ${questionsCheck[0].count} questions already`);
    }

    // Create math-geo test if it doesn't exist
    const mathGeoTestId = '550e8400-e29b-41d4-a716-446655440020';
    const mathGeoTestCheck = await sql`
      SELECT COUNT(*) as count FROM ${sql(dbSchema)}.tests WHERE id = ${mathGeoTestId}
    `;

    if (parseInt(mathGeoTestCheck[0].count) === 0) {
      console.log('Creating math-geo test...');
      await sql`
        INSERT INTO ${sql(dbSchema)}.tests (id, title, slug, description, is_enabled, pass_threshold)
        VALUES (${mathGeoTestId}, 'Math & Geography Test', 'math-geo', 'Test your math and geography knowledge', true, 70)
      `;

      // Add questions to test
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

    // Create markdown test if it doesn't exist
    const markdownTestId = '550e8400-e29b-41d4-a716-446655440021';
    const markdownTestCheck = await sql`
      SELECT COUNT(*) as count FROM ${sql(dbSchema)}.tests WHERE id = ${markdownTestId}
    `;

    if (parseInt(markdownTestCheck[0].count) === 0) {
      console.log('Creating markdown test...');
      await sql`
        INSERT INTO ${sql(dbSchema)}.tests (id, title, slug, description, is_enabled, pass_threshold)
        VALUES (${markdownTestId}, 'Markdown Rendering Test', 'markdown-test', 'This test demonstrates **markdown rendering** with \`code syntax\` highlighting', true, 70)
      `;

      // Add markdown question to test
      await sql`
        INSERT INTO ${sql(dbSchema)}.test_questions (test_id, question_id, weight)
        VALUES (${markdownTestId}, ${q4Id}, 1)
      `;
      console.log('✓ Markdown test created');
    } else {
      console.log('✓ Markdown test already exists');
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

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

    if (parseInt(questionsCheck[0].count) === 0) {
      console.log('Creating sample questions...');

      const q1Id = '550e8400-e29b-41d4-a716-446655440010';
      const q2Id = '550e8400-e29b-41d4-a716-446655440011';
      const q3Id = '550e8400-e29b-41d4-a716-446655440012';

      await sql`
        INSERT INTO ${sql(dbSchema)}.questions (id, text, type, options, correct_answers, tags)
        VALUES
          (${q1Id}, 'What is 2 + 2?', 'SINGLE', '["3", "4", "5", "6"]', '[1]', '["math", "easy"]'),
          (${q2Id}, 'What is the capital of France?', 'SINGLE', '["London", "Paris", "Berlin", "Madrid"]', '[1]', '["geography"]'),
          (${q3Id}, 'Select all even numbers:', 'MULTIPLE', '["1", "2", "3", "4"]', '[1, 3]', '["math"]')
      `;
      console.log('✓ Sample questions created');

      // Create a test
      console.log('Creating sample test...');
      const testId = '550e8400-e29b-41d4-a716-446655440020';
      await sql`
        INSERT INTO ${sql(dbSchema)}.tests (id, title, slug, description, is_enabled, pass_threshold)
        VALUES (${testId}, 'Math & Geography Test', 'math-geo', 'Test your math and geography knowledge', true, 70)
      `;

      // Add questions to test
      await sql`
        INSERT INTO ${sql(dbSchema)}.test_questions (test_id, question_id, weight)
        VALUES
          (${testId}, ${q1Id}, 1),
          (${testId}, ${q2Id}, 2),
          (${testId}, ${q3Id}, 2)
      `;
      console.log('✓ Sample test created');
    } else {
      console.log(`✓ Found ${questionsCheck[0].count} questions already`);
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

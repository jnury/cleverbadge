import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const TEST_DB_URL = process.env.DATABASE_ADMIN_URL;
const TEST_SCHEMA = process.env.NODE_ENV === 'production' ? 'production' :
                    process.env.NODE_ENV === 'staging' ? 'staging' :
                    process.env.NODE_ENV === 'testing' ? 'testing' : 'development';

const sql = postgres(TEST_DB_URL, {
  onnotice: () => {}
});

async function seedTestData() {
  console.log('Seeding test data...');

  // User: admin (for future auth tests)
  const adminId = '550e8400-e29b-41d4-a716-446655440001';
  await sql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.users (id, username, password_hash)
    VALUES ('${adminId}', 'testadmin', '$argon2id$v=19$m=65536,t=3,p=4$fakehash')
    ON CONFLICT (id) DO NOTHING
  `);

  // Questions: Comprehensive set (new options format with is_correct per option)
  const questions = [
    // SINGLE choice - correct answer is "4" (index 1)
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      text: 'What is 2 + 2?',
      type: 'SINGLE',
      options: JSON.stringify({
        "0": { text: '3', is_correct: false },
        "1": { text: '4', is_correct: true },
        "2": { text: '5', is_correct: false },
        "3": { text: '6', is_correct: false }
      }),
      tags: JSON.stringify(['math', 'easy'])
    },
    // SINGLE choice - correct answer is "Paris" (index 1)
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      text: 'What is the capital of France?',
      type: 'SINGLE',
      options: JSON.stringify({
        "0": { text: 'London', is_correct: false, explanation: 'London is the capital of the United Kingdom.' },
        "1": { text: 'Paris', is_correct: true, explanation: 'Paris has been France\'s capital since the 10th century.' },
        "2": { text: 'Berlin', is_correct: false, explanation: 'Berlin is the capital of Germany.' },
        "3": { text: 'Madrid', is_correct: false, explanation: 'Madrid is the capital of Spain.' }
      }),
      tags: JSON.stringify(['geography'])
    },
    // MULTIPLE choice - correct answers are "2" and "4" (indices 1 and 3)
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      text: 'Select all even numbers:',
      type: 'MULTIPLE',
      options: JSON.stringify({
        "0": { text: '1', is_correct: false, explanation: '1 is an odd number.' },
        "1": { text: '2', is_correct: true, explanation: '2 is the smallest even number.' },
        "2": { text: '3', is_correct: false, explanation: '3 is an odd number.' },
        "3": { text: '4', is_correct: true, explanation: '4 is an even number (4 = 2 × 2).' }
      }),
      tags: JSON.stringify(['math'])
    },
    // MULTIPLE choice - correct answers are "Red", "Blue", "Yellow" (indices 0, 2, 3)
    {
      id: '550e8400-e29b-41d4-a716-446655440013',
      text: 'Select all primary colors:',
      type: 'MULTIPLE',
      options: JSON.stringify({
        "0": { text: 'Red', is_correct: true },
        "1": { text: 'Green', is_correct: false, explanation: 'Green is a secondary color (blue + yellow).' },
        "2": { text: 'Blue', is_correct: true },
        "3": { text: 'Yellow', is_correct: true }
      }),
      tags: JSON.stringify(['art'])
    },
    // SINGLE choice - no tags, correct is "Yes" (index 0)
    {
      id: '550e8400-e29b-41d4-a716-446655440014',
      text: 'Is the sky blue?',
      type: 'SINGLE',
      options: JSON.stringify({
        "0": { text: 'Yes', is_correct: true },
        "1": { text: 'No', is_correct: false }
      }),
      tags: null
    }
  ];

  for (const q of questions) {
    await sql.unsafe(`
      INSERT INTO ${TEST_SCHEMA}.questions (id, text, type, options, tags)
      VALUES ('${q.id}', '${q.text}', '${q.type}', '${q.options}', ${q.tags ? `'${q.tags}'` : 'NULL'})
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // Tests
  const tests = [
    // Enabled test with questions
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      title: 'Math & Geography Test',
      slug: 'math-geo',
      description: 'Test your math and geography knowledge',
      is_enabled: true
    },
    // Disabled test
    {
      id: '550e8400-e29b-41d4-a716-446655440021',
      title: 'Disabled Test',
      slug: 'disabled-test',
      description: 'This test is disabled',
      is_enabled: false
    },
    // Empty test (no questions)
    {
      id: '550e8400-e29b-41d4-a716-446655440022',
      title: 'Empty Test',
      slug: 'empty-test',
      description: 'This test has no questions',
      is_enabled: true
    }
  ];

  for (const t of tests) {
    await sql.unsafe(`
      INSERT INTO ${TEST_SCHEMA}.tests (id, title, slug, description, is_enabled)
      VALUES ('${t.id}', '${t.title}', '${t.slug}', '${t.description}', ${t.is_enabled})
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  // Test questions (for math-geo test)
  // Order matches E2E test expectations: Math (weight 1) → France (weight 2) → Even numbers (weight 2)
  // Total weight: 5 (used in scoring calculations)
  await sql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.test_questions (test_id, question_id, weight)
    VALUES
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 1),
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440011', 2),
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440012', 2)
    ON CONFLICT DO NOTHING
  `);

  console.log('Test data seeded successfully!');
}

// Run seeding
seedTestData()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error seeding data:', err);
    process.exit(1);
  });

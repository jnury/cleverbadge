import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import postgres from 'postgres';
import fs from 'fs';

// Test database connection
const TEST_DB_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://cleverbadge_admin:password@localhost:5432/cleverbadge';

// Use max: 1 connection for transaction support
const testSql = postgres(TEST_DB_URL, {
  onnotice: () => { },
  prepare: false,
  max: 1
});

const TEST_SCHEMA = 'test';

// Track if we're in a transaction
let inTransaction = false;

// Setup: Create test schema before all tests
beforeAll(async () => {
  console.log('Setting up test schema...');

  // Drop and recreate test schema
  await testSql.unsafe(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  await testSql.unsafe(`CREATE SCHEMA ${TEST_SCHEMA}`);

  // Grant permissions to runtime users (cleverbadge_dev, cleverbadge_test)
  // This allows the app's database connection to access the test schema
  const runtimeUsers = ['cleverbadge_dev', 'cleverbadge_test'];
  for (const user of runtimeUsers) {
    try {
      await testSql.unsafe(`GRANT USAGE ON SCHEMA ${TEST_SCHEMA} TO ${user}`);
      await testSql.unsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${TEST_SCHEMA} TO ${user}`);
      await testSql.unsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${TEST_SCHEMA} TO ${user}`);
      await testSql.unsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${TEST_SCHEMA} GRANT ALL ON TABLES TO ${user}`);
      await testSql.unsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${TEST_SCHEMA} GRANT ALL ON SEQUENCES TO ${user}`);
    } catch (e) {
      // User might not exist, ignore
    }
  }

  // Run all migrations with __SCHEMA__ replacement
  const migrations = [
    '001_init.sql',
    '002_add_assessments_is_archived.sql',
    '003_add_abandoned_status.sql',
    '004_extend_users_table.sql',
    '005_email_tokens_table.sql'
  ];

  for (const migration of migrations) {
    const migrationSQL = fs.readFileSync(`./db/migrations/${migration}`, 'utf8');
    const testMigrationSQL = migrationSQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await testSql.unsafe(testMigrationSQL);
  }

  // Re-apply table grants after migrations created the tables
  for (const user of runtimeUsers) {
    try {
      await testSql.unsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${TEST_SCHEMA} TO ${user}`);
      await testSql.unsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${TEST_SCHEMA} TO ${user}`);
    } catch (e) {
      // User might not exist, ignore
    }
  }

  // Seed test data
  await seedTestData();

  console.log('Test schema created and seeded');
});

// Cleanup: Drop test schema after all tests
afterAll(async () => {
  console.log('Cleaning up test schema...');
  await testSql.unsafe(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  await testSql.end();
  console.log('Test schema dropped');
});

// Transaction isolation per test
beforeEach(async () => {
  // Start transaction using postgres-js transaction syntax
  await testSql.unsafe(`BEGIN`);
  inTransaction = true;
});

afterEach(async () => {
  // Rollback transaction
  if (inTransaction) {
    await testSql.unsafe(`ROLLBACK`);
    inTransaction = false;
  }
});

// Seed comprehensive test data
async function seedTestData() {
  // User: admin (for future auth tests)
  const adminId = '550e8400-e29b-41d4-a716-446655440001';
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.users (id, username, password_hash)
    VALUES ('${adminId}', 'testadmin', '$argon2id$v=19$m=65536,t=3,p=4$cSPWVLBt0kAB1jJnR8f9lg$IyTMU47fj+nSLjE9ekLf20c1xRxeeC1cF7m0p132VVY')
  `);

  // Questions: Comprehensive set (using new dict options format with is_correct per option)
  const questions = [
    // SINGLE choice - correct answer is option 1 (4)
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      title: 'Math Addition Question',
      text: 'What is 2 + 2?',
      type: 'SINGLE',
      options: JSON.stringify({
        "0": { text: "3", is_correct: false },
        "1": { text: "4", is_correct: true },
        "2": { text: "5", is_correct: false },
        "3": { text: "6", is_correct: false }
      }),
      tags: JSON.stringify(['math', 'easy']),
      author_id: adminId,
      visibility: 'private'
    },
    // SINGLE choice - correct answer is option 1 (Paris)
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      title: 'France Capital Question',
      text: 'What is the capital of France?',
      type: 'SINGLE',
      options: JSON.stringify({
        "0": { text: "London", is_correct: false },
        "1": { text: "Paris", is_correct: true },
        "2": { text: "Berlin", is_correct: false },
        "3": { text: "Madrid", is_correct: false }
      }),
      tags: JSON.stringify(['geography']),
      author_id: adminId,
      visibility: 'private'
    },
    // MULTIPLE choice - correct answers are options 1 and 3 (2 and 4)
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      title: 'Even Numbers Question',
      text: 'Select all even numbers:',
      type: 'MULTIPLE',
      options: JSON.stringify({
        "0": { text: "1", is_correct: false },
        "1": { text: "2", is_correct: true },
        "2": { text: "3", is_correct: false },
        "3": { text: "4", is_correct: true }
      }),
      tags: JSON.stringify(['math']),
      author_id: adminId,
      visibility: 'private'
    },
    // MULTIPLE choice - correct answers are options 0, 2, 3 (Red, Blue, Yellow)
    {
      id: '550e8400-e29b-41d4-a716-446655440013',
      title: 'Primary Colors Question',
      text: 'Select all primary colors:',
      type: 'MULTIPLE',
      options: JSON.stringify({
        "0": { text: "Red", is_correct: true },
        "1": { text: "Green", is_correct: false },
        "2": { text: "Blue", is_correct: true },
        "3": { text: "Yellow", is_correct: true }
      }),
      tags: JSON.stringify(['art']),
      author_id: adminId,
      visibility: 'private'
    },
    // SINGLE choice - correct answer is option 0 (Yes)
    {
      id: '550e8400-e29b-41d4-a716-446655440014',
      title: 'Sky Color Question',
      text: 'Is the sky blue?',
      type: 'SINGLE',
      options: JSON.stringify({
        "0": { text: "Yes", is_correct: true },
        "1": { text: "No", is_correct: false }
      }),
      tags: null,
      author_id: adminId,
      visibility: 'private'
    }
  ];

  for (const q of questions) {
    await testSql.unsafe(`
      INSERT INTO ${TEST_SCHEMA}.questions (id, title, text, type, options, tags, author_id, visibility)
      VALUES ('${q.id}', '${q.title}', '${q.text}', '${q.type}', '${q.options}', ${q.tags ? `'${q.tags}'` : 'NULL'}, '${q.author_id}', '${q.visibility}')
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
      is_enabled: true,
      visibility: 'private'
    },
    // Disabled test
    {
      id: '550e8400-e29b-41d4-a716-446655440021',
      title: 'Disabled Test',
      slug: 'disabled-test',
      description: 'This test is disabled',
      is_enabled: false,
      visibility: 'private'
    },
    // Empty test (no questions)
    {
      id: '550e8400-e29b-41d4-a716-446655440022',
      title: 'Empty Test',
      slug: 'empty-test',
      description: 'This test has no questions',
      is_enabled: true,
      visibility: 'private'
    }
  ];

  for (const t of tests) {
    await testSql.unsafe(`
      INSERT INTO ${TEST_SCHEMA}.tests (id, title, slug, description, is_enabled, pass_threshold, visibility)
      VALUES ('${t.id}', '${t.title}', '${t.slug}', '${t.description}', ${t.is_enabled}, 0, '${t.visibility}')
    `);
  }

  // Test questions (for math-geo test)
  // Order matches E2E test expectations: Math (weight 1) → France (weight 2) → Even numbers (weight 2)
  // Total weight: 5 (used in scoring calculations)
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.test_questions (test_id, question_id, weight)
    VALUES
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 1),
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440011', 2),
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440012', 2)
  `);

  // Assessment - completed with perfect score
  const perfectAssessmentId = '550e8400-e29b-41d4-a716-446655440030';
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at, access_slug)
    VALUES (
      '${perfectAssessmentId}',
      '550e8400-e29b-41d4-a716-446655440020',
      'Perfect Student',
      'COMPLETED',
      100.0,
      NOW() - INTERVAL '10 minutes',
      NOW() - INTERVAL '5 minutes',
      'math-geo'
    )
  `);

  // Assessment answers - all correct
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessment_answers (assessment_id, question_id, selected_options, is_correct)
    VALUES
      ('${perfectAssessmentId}', '550e8400-e29b-41d4-a716-446655440010', '[1]', true),
      ('${perfectAssessmentId}', '550e8400-e29b-41d4-a716-446655440011', '[1]', true),
      ('${perfectAssessmentId}', '550e8400-e29b-41d4-a716-446655440012', '[1,3]', true)
  `);

  // Assessment - completed with partial score
  const partialAssessmentId = '550e8400-e29b-41d4-a716-446655440031';
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at, access_slug)
    VALUES (
      '${partialAssessmentId}',
      '550e8400-e29b-41d4-a716-446655440020',
      'Average Student',
      'COMPLETED',
      33.33,
      NOW() - INTERVAL '20 minutes',
      NOW() - INTERVAL '15 minutes',
      'math-geo'
    )
  `);

  // Assessment answers - some wrong
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessment_answers (assessment_id, question_id, selected_options, is_correct)
    VALUES
      ('${partialAssessmentId}', '550e8400-e29b-41d4-a716-446655440010', '[0]', false),
      ('${partialAssessmentId}', '550e8400-e29b-41d4-a716-446655440011', '[1]', true),
      ('${partialAssessmentId}', '550e8400-e29b-41d4-a716-446655440012', '[1]', false)
  `);

  // Assessment - in progress
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, started_at, access_slug)
    VALUES (
      '550e8400-e29b-41d4-a716-446655440032',
      '550e8400-e29b-41d4-a716-446655440020',
      'Current Student',
      'STARTED',
      NOW() - INTERVAL '2 minutes',
      'math-geo'
    )
  `);
}

// Export test database accessor
export function getTestDb() {
  return testSql;
}

export function getTestSchema() {
  return TEST_SCHEMA;
}

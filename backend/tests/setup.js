import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import postgres from 'postgres';
import fs from 'fs';

// Test database connection
const TEST_DB_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://cleverbadge_admin:password@localhost:5432/cleverbadge';

// Use max: 1 connection for transaction support
const testSql = postgres(TEST_DB_URL, {
  onnotice: () => {},
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

  // Run migrations with __SCHEMA__ replacement
  const migration1SQL = fs.readFileSync('./db/migrations/001_initial_schema.sql', 'utf8');
  const testMigration1SQL = migration1SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
  await testSql.unsafe(testMigration1SQL);

  const migration2SQL = fs.readFileSync('./db/migrations/002_add_pass_threshold.sql', 'utf8');
  const testMigration2SQL = migration2SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
  await testSql.unsafe(testMigration2SQL);

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
    VALUES ('${adminId}', 'testadmin', '$argon2id$v=19$m=65536,t=3,p=4$fakehash')
  `);

  // Questions: Comprehensive set
  const questions = [
    // SINGLE choice - correct answer
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      text: 'What is 2 + 2?',
      type: 'SINGLE',
      options: JSON.stringify(['3', '4', '5', '6']),
      correct_answers: JSON.stringify([1]),
      tags: JSON.stringify(['math', 'easy'])
    },
    // SINGLE choice - for wrong answer test
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      text: 'What is the capital of France?',
      type: 'SINGLE',
      options: JSON.stringify(['London', 'Paris', 'Berlin', 'Madrid']),
      correct_answers: JSON.stringify([1]),
      tags: JSON.stringify(['geography'])
    },
    // MULTIPLE choice
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      text: 'Select all even numbers:',
      type: 'MULTIPLE',
      options: JSON.stringify(['1', '2', '3', '4']),
      correct_answers: JSON.stringify([1, 3]),
      tags: JSON.stringify(['math'])
    },
    // MULTIPLE choice - for partial answer test
    {
      id: '550e8400-e29b-41d4-a716-446655440013',
      text: 'Select all primary colors:',
      type: 'MULTIPLE',
      options: JSON.stringify(['Red', 'Green', 'Blue', 'Yellow']),
      correct_answers: JSON.stringify([0, 2, 3]),
      tags: JSON.stringify(['art'])
    },
    // SINGLE choice - no tags
    {
      id: '550e8400-e29b-41d4-a716-446655440014',
      text: 'Is the sky blue?',
      type: 'SINGLE',
      options: JSON.stringify(['Yes', 'No']),
      correct_answers: JSON.stringify([0]),
      tags: null
    }
  ];

  for (const q of questions) {
    await testSql.unsafe(`
      INSERT INTO ${TEST_SCHEMA}.questions (id, text, type, options, correct_answers, tags)
      VALUES ('${q.id}', '${q.text}', '${q.type}', '${q.options}', '${q.correct_answers}', ${q.tags ? `'${q.tags}'` : 'NULL'})
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
    await testSql.unsafe(`
      INSERT INTO ${TEST_SCHEMA}.tests (id, title, slug, description, is_enabled, pass_threshold)
      VALUES ('${t.id}', '${t.title}', '${t.slug}', '${t.description}', ${t.is_enabled}, 0)
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
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at)
    VALUES (
      '${perfectAssessmentId}',
      '550e8400-e29b-41d4-a716-446655440020',
      'Perfect Student',
      'COMPLETED',
      100.0,
      NOW() - INTERVAL '10 minutes',
      NOW() - INTERVAL '5 minutes'
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
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at)
    VALUES (
      '${partialAssessmentId}',
      '550e8400-e29b-41d4-a716-446655440020',
      'Average Student',
      'COMPLETED',
      33.33,
      NOW() - INTERVAL '20 minutes',
      NOW() - INTERVAL '15 minutes'
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
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, started_at)
    VALUES (
      '550e8400-e29b-41d4-a716-446655440032',
      '550e8400-e29b-41d4-a716-446655440020',
      'Current Student',
      'STARTED',
      NOW() - INTERVAL '2 minutes'
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

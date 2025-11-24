import postgres from 'postgres';
import { hashPassword } from '../utils/password.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function resetTestSchema() {
  try {
    // Use DATABASE_ADMIN_URL for schema operations, fallback to DATABASE_URL
    const connectionString = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL or DATABASE_ADMIN_URL environment variable not set');
    }

    // Force use of 'testing' schema for E2E tests
    const TEST_SCHEMA = 'testing';
    const sql = postgres(connectionString, {
      onnotice: () => {}
    });

    console.log(`\n🔄 Resetting E2E test schema: ${TEST_SCHEMA}\n`);

    // Drop and recreate testing schema
    console.log('Dropping existing testing schema...');
    await sql.unsafe(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);

    console.log('Creating fresh testing schema...');
    await sql.unsafe(`CREATE SCHEMA ${TEST_SCHEMA}`);

    // Grant permissions to cleverbadge_test user (used during E2E tests)
    console.log('Granting permissions to cleverbadge_test user...');
    await sql.unsafe(`GRANT USAGE ON SCHEMA ${TEST_SCHEMA} TO cleverbadge_test`);
    await sql.unsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${TEST_SCHEMA} TO cleverbadge_test`);
    await sql.unsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${TEST_SCHEMA} TO cleverbadge_test`);
    await sql.unsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${TEST_SCHEMA} GRANT ALL PRIVILEGES ON TABLES TO cleverbadge_test`);
    await sql.unsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${TEST_SCHEMA} GRANT ALL PRIVILEGES ON SEQUENCES TO cleverbadge_test`);

    // Run migrations
    console.log('Running migrations...');
    const migration1SQL = fs.readFileSync('./db/migrations/001_initial_schema.sql', 'utf8');
    const testMigration1SQL = migration1SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await sql.unsafe(testMigration1SQL);

    const migration2SQL = fs.readFileSync('./db/migrations/002_add_pass_threshold.sql', 'utf8');
    const testMigration2SQL = migration2SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await sql.unsafe(testMigration2SQL);

    // Seed test data
    console.log('Seeding test data...');
    await seedTestData(sql, TEST_SCHEMA);

    console.log('\n✅ Testing schema reset and seeded successfully!\n');

    await sql.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function seedTestData(sql, schema) {
  // Create admin user (username: admin, password: admin123)
  console.log('  Creating admin user...');
  const adminId = '550e8400-e29b-41d4-a716-446655440001';
  const passwordHash = await hashPassword('admin123');
  await sql.unsafe(`
    INSERT INTO ${schema}.users (id, username, password_hash)
    VALUES ('${adminId}', 'admin', '${passwordHash}')
  `);

  // Create questions matching E2E test expectations
  console.log('  Creating test questions...');

  // Question IDs for the main test (math-geo)
  const q1Id = '550e8400-e29b-41d4-a716-446655440010';  // What is 2 + 2?
  const q2Id = '550e8400-e29b-41d4-a716-446655440011';  // Capital of France
  const q3Id = '550e8400-e29b-41d4-a716-446655440012';  // Even numbers

  // Additional questions for other tests
  const q4Id = '550e8400-e29b-41d4-a716-446655440013';  // Primary colors
  const q5Id = '550e8400-e29b-41d4-a716-446655440014';  // Sky blue

  await sql.unsafe(`
    INSERT INTO ${schema}.questions (id, text, type, options, correct_answers, tags)
    VALUES
      ('${q1Id}', 'What is 2 + 2?', 'SINGLE', '["3", "4", "5", "6"]', '[1]', '["math", "easy"]'),
      ('${q2Id}', 'What is the capital of France?', 'SINGLE', '["London", "Paris", "Berlin", "Madrid"]', '[1]', '["geography"]'),
      ('${q3Id}', 'Select all even numbers:', 'MULTIPLE', '["1", "2", "3", "4"]', '[1, 3]', '["math"]'),
      ('${q4Id}', 'Select all primary colors:', 'MULTIPLE', '["Red", "Green", "Blue", "Yellow"]', '[0, 2, 3]', '["art"]'),
      ('${q5Id}', 'Is the sky blue?', 'SINGLE', '["Yes", "No"]', '[0]', NULL)
  `);

  // Create tests
  console.log('  Creating tests...');
  const test1Id = '550e8400-e29b-41d4-a716-446655440020';  // Enabled test
  const test2Id = '550e8400-e29b-41d4-a716-446655440021';  // Disabled test
  const test3Id = '550e8400-e29b-41d4-a716-446655440022';  // Empty test

  await sql.unsafe(`
    INSERT INTO ${schema}.tests (id, title, slug, description, is_enabled, pass_threshold)
    VALUES
      ('${test1Id}', 'Math & Geography Test', 'math-geo', 'Test your math and geography knowledge', true, 70),
      ('${test2Id}', 'Disabled Test', 'disabled-test', 'This test is disabled', false, 0),
      ('${test3Id}', 'Empty Test', 'empty-test', 'This test has no questions', true, 0)
  `);

  // Add questions to main test (math-geo)
  // Order and weights match E2E test expectations
  // Use explicit IDs to ensure correct order
  console.log('  Adding questions to tests...');
  const tq1Id = '550e8400-e29b-41d4-a716-446655440050';  // First test_question (math)
  const tq2Id = '550e8400-e29b-41d4-a716-446655440051';  // Second test_question (France)
  const tq3Id = '550e8400-e29b-41d4-a716-446655440052';  // Third test_question (even)

  await sql.unsafe(`
    INSERT INTO ${schema}.test_questions (id, test_id, question_id, weight)
    VALUES
      ('${tq1Id}', '${test1Id}', '${q1Id}', 1),  -- Math question (weight 1)
      ('${tq2Id}', '${test1Id}', '${q2Id}', 2),  -- France question (weight 2)
      ('${tq3Id}', '${test1Id}', '${q3Id}', 2)   -- Even numbers (weight 2)
  `);
  // Total weight: 5

  // Create sample assessments
  console.log('  Creating sample assessments...');

  // Perfect score assessment
  const perfectAssessmentId = '550e8400-e29b-41d4-a716-446655440030';
  await sql.unsafe(`
    INSERT INTO ${schema}.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at)
    VALUES (
      '${perfectAssessmentId}',
      '${test1Id}',
      'Perfect Student',
      'COMPLETED',
      100.0,
      NOW() - INTERVAL '10 minutes',
      NOW() - INTERVAL '5 minutes'
    )
  `);

  await sql.unsafe(`
    INSERT INTO ${schema}.assessment_answers (assessment_id, question_id, selected_options, is_correct)
    VALUES
      ('${perfectAssessmentId}', '${q1Id}', '[1]', true),
      ('${perfectAssessmentId}', '${q2Id}', '[1]', true),
      ('${perfectAssessmentId}', '${q3Id}', '[1,3]', true)
  `);

  // Partial score assessment (40%)
  const partialAssessmentId = '550e8400-e29b-41d4-a716-446655440031';
  await sql.unsafe(`
    INSERT INTO ${schema}.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at)
    VALUES (
      '${partialAssessmentId}',
      '${test1Id}',
      'Average Student',
      'COMPLETED',
      40.0,
      NOW() - INTERVAL '20 minutes',
      NOW() - INTERVAL '15 minutes'
    )
  `);

  await sql.unsafe(`
    INSERT INTO ${schema}.assessment_answers (assessment_id, question_id, selected_options, is_correct)
    VALUES
      ('${partialAssessmentId}', '${q1Id}', '[0]', false),
      ('${partialAssessmentId}', '${q2Id}', '[1]', true),
      ('${partialAssessmentId}', '${q3Id}', '[1]', false)
  `);

  // In-progress assessment
  await sql.unsafe(`
    INSERT INTO ${schema}.assessments (id, test_id, candidate_name, status, started_at)
    VALUES (
      '550e8400-e29b-41d4-a716-446655440032',
      '${test1Id}',
      'Current Student',
      'STARTED',
      NOW() - INTERVAL '2 minutes'
    )
  `);

  console.log('  ✓ Test data seeded');
}

resetTestSchema();

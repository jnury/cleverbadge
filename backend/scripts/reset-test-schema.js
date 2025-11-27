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

    const migration3SQL = fs.readFileSync('./db/migrations/003_add_visibility_enum.sql', 'utf8');
    const testMigration3SQL = migration3SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await sql.unsafe(testMigration3SQL);

    const migration4SQL = fs.readFileSync('./db/migrations/004_add_test_visibility_and_update_slug.sql', 'utf8');
    const testMigration4SQL = migration4SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await sql.unsafe(testMigration4SQL);

    const migration5SQL = fs.readFileSync('./db/migrations/005_add_assessment_access_slug.sql', 'utf8');
    const testMigration5SQL = migration5SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await sql.unsafe(testMigration5SQL);

    const migration6SQL = fs.readFileSync('./db/migrations/006_add_question_title_author_visibility.sql', 'utf8');
    const testMigration6SQL = migration6SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await sql.unsafe(testMigration6SQL);

    const migration7SQL = fs.readFileSync('./db/migrations/007_add_question_is_archived.sql', 'utf8');
    const testMigration7SQL = migration7SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await sql.unsafe(testMigration7SQL);

    const migration8SQL = fs.readFileSync('./db/migrations/008_add_test_is_archived.sql', 'utf8');
    const testMigration8SQL = migration8SQL.replaceAll('__SCHEMA__', TEST_SCHEMA);
    await sql.unsafe(testMigration8SQL);

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
  const q6Id = '550e8400-e29b-41d4-a716-446655440015';  // Markdown question for markdown-test
  const q7Id = '550e8400-e29b-41d4-a716-446655440016';  // Protected question
  const q8Id = '550e8400-e29b-41d4-a716-446655440017';  // Public question

  // Insert questions with visibility and title fields
  // q5 and q4 are NOT in any test, so they can be safely deleted
  // Insert them last so they appear first when ordered by created_at DESC
  await sql.unsafe(`
    INSERT INTO ${schema}.questions (id, title, text, type, options, correct_answers, tags, author_id, visibility, created_at)
    VALUES
      ('${q1Id}', 'Basic Math Question', 'What is 2 + 2?', 'SINGLE', '["3", "4", "5", "6"]', '[1]', '["math", "easy"]', '${adminId}', 'private', NOW() - INTERVAL '8 minutes'),
      ('${q2Id}', 'Geography Capital', 'What is the capital of France?', 'SINGLE', '["London", "Paris", "Berlin", "Madrid"]', '[1]', '["geography"]', '${adminId}', 'public', NOW() - INTERVAL '7 minutes'),
      ('${q3Id}', 'Even Numbers', 'Select all even numbers:', 'MULTIPLE', '["1", "2", "3", "4"]', '[1, 3]', '["math"]', '${adminId}', 'public', NOW() - INTERVAL '6 minutes'),
      ('${q4Id}', 'Primary Colors', 'Select all primary colors:', 'MULTIPLE', '["Red", "Green", "Blue", "Yellow"]', '[0, 2, 3]', '["art"]', '${adminId}', 'private', NOW() - INTERVAL '5 minutes'),
      ('${q5Id}', 'Sky Color', 'Is the sky blue?', 'SINGLE', '["Yes", "No"]', '[0]', NULL, '${adminId}', 'public', NOW() - INTERVAL '4 minutes'),
      ('${q6Id}', 'JavaScript Code Analysis', '**What does this code do?**\n\n\`\`\`javascript\nconst sum = arr => arr.reduce((a, b) => a + b, 0);\n\`\`\`', 'SINGLE', '["Multiplies array elements", "Sums array elements using \`reduce()\`", "Filters array using \`map()\`", "Sorts the array"]', '[1]', '["javascript", "markdown"]', '${adminId}', 'public', NOW() - INTERVAL '3 minutes'),
      ('${q7Id}', 'Protected Question Example', 'This is a protected question. What is 10 / 2?', 'SINGLE', '["3", "4", "5", "6"]', '[2]', '["math"]', '${adminId}', 'protected', NOW() - INTERVAL '2 minutes'),
      ('${q8Id}', 'Public Question Example', 'What color is the sky?', 'SINGLE', '["Red", "Blue", "Green", "Yellow"]', '[1]', '["general"]', '${adminId}', 'public', NOW() - INTERVAL '1 minute')
  `);

  // Create tests
  console.log('  Creating tests...');
  const test1Id = '550e8400-e29b-41d4-a716-446655440020';  // Enabled test (private)
  const test2Id = '550e8400-e29b-41d4-a716-446655440021';  // Disabled test
  const test3Id = '550e8400-e29b-41d4-a716-446655440022';  // Empty test
  const test4Id = '550e8400-e29b-41d4-a716-446655440023';  // Markdown test (public)
  const test5Id = '550e8400-e29b-41d4-a716-446655440024';  // Protected test

  await sql.unsafe(`
    INSERT INTO ${schema}.tests (id, title, slug, description, is_enabled, pass_threshold, visibility)
    VALUES
      ('${test1Id}', 'Math & Geography Test', 'math-geo', 'Test your math and geography knowledge', true, 70, 'private'),
      ('${test2Id}', 'Disabled Test', 'disabled-test', 'This test is disabled', false, 0, 'private'),
      ('${test3Id}', 'Empty Test', 'empty-test', 'This test has no questions', true, 0, 'private'),
      ('${test4Id}', 'Markdown Rendering Test', 'markdown-test', 'This test demonstrates **markdown rendering** with \`code syntax\` highlighting', true, 70, 'public'),
      ('${test5Id}', 'Protected Test', 'protected-test', 'This test is protected and requires special access', true, 70, 'protected')
  `);

  // Add questions to main test (math-geo)
  // Order and weights match E2E test expectations
  // Use explicit IDs to ensure correct order
  console.log('  Adding questions to tests...');
  const tq1Id = '550e8400-e29b-41d4-a716-446655440050';  // First test_question (math)
  const tq2Id = '550e8400-e29b-41d4-a716-446655440051';  // Second test_question (France)
  const tq3Id = '550e8400-e29b-41d4-a716-446655440052';  // Third test_question (even)
  const tq4Id = '550e8400-e29b-41d4-a716-446655440053';  // Markdown test question 1
  const tq5Id = '550e8400-e29b-41d4-a716-446655440054';  // Markdown test question 2
  const tq6Id = '550e8400-e29b-41d4-a716-446655440055';  // Markdown test question 3
  const tq7Id = '550e8400-e29b-41d4-a716-446655440056';  // Protected test question 1
  const tq8Id = '550e8400-e29b-41d4-a716-446655440057';  // Protected test question 2
  const tq9Id = '550e8400-e29b-41d4-a716-446655440058';  // Protected test question 3

  await sql.unsafe(`
    INSERT INTO ${schema}.test_questions (id, test_id, question_id, weight)
    VALUES
      ('${tq1Id}', '${test1Id}', '${q1Id}', 1),  -- Math question (weight 1)
      ('${tq2Id}', '${test1Id}', '${q2Id}', 2),  -- France question (weight 2)
      ('${tq3Id}', '${test1Id}', '${q3Id}', 2),  -- Even numbers (weight 2)
      ('${tq4Id}', '${test4Id}', '${q6Id}', 1),  -- Markdown test - markdown question with code
      ('${tq5Id}', '${test4Id}', '${q3Id}', 1),  -- Markdown test - public question
      ('${tq6Id}', '${test4Id}', '${q8Id}', 1),  -- Markdown test - public question
      ('${tq7Id}', '${test5Id}', '${q6Id}', 2),  -- Protected test - protected question
      ('${tq8Id}', '${test5Id}', '${q7Id}', 2),  -- Protected test - protected question
      ('${tq9Id}', '${test5Id}', '${q2Id}', 1)   -- Protected test - public question
  `);
  // Total weight for math-geo: 5
  // Total weight for markdown-test: 3
  // Total weight for protected-test: 5

  // Create sample assessments
  console.log('  Creating sample assessments...');

  // Perfect score assessment
  const perfectAssessmentId = '550e8400-e29b-41d4-a716-446655440030';
  await sql.unsafe(`
    INSERT INTO ${schema}.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at, access_slug)
    VALUES (
      '${perfectAssessmentId}',
      '${test1Id}',
      'Perfect Student',
      'COMPLETED',
      100.0,
      NOW() - INTERVAL '10 minutes',
      NOW() - INTERVAL '5 minutes',
      'math-geo'
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
    INSERT INTO ${schema}.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at, access_slug)
    VALUES (
      '${partialAssessmentId}',
      '${test1Id}',
      'Average Student',
      'COMPLETED',
      40.0,
      NOW() - INTERVAL '20 minutes',
      NOW() - INTERVAL '15 minutes',
      'math-geo'
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
    INSERT INTO ${schema}.assessments (id, test_id, candidate_name, status, started_at, access_slug)
    VALUES (
      '550e8400-e29b-41d4-a716-446655440032',
      '${test1Id}',
      'Current Student',
      'STARTED',
      NOW() - INTERVAL '2 minutes',
      'math-geo'
    )
  `);

  console.log('  ✓ Test data seeded');
}

resetTestSchema();

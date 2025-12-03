/**
 * Refresh Staging from Production
 *
 * This script copies all data from production schema to staging schema,
 * EXCEPT for the users table (staging users are preserved).
 *
 * Usage:
 *   DATABASE_REFRESH_URL=postgresql://cleverbadge_refresh:pwd@host:5432/db npm run refresh_db
 *
 * The DATABASE_REFRESH_URL must use the cleverbadge_refresh user which has:
 *   - SELECT on production schema
 *   - SELECT, INSERT, UPDATE, DELETE, TRUNCATE on staging schema
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const STAGING_SCHEMA = 'staging';
const PRODUCTION_SCHEMA = 'production';

// Tables to sync (in dependency order - parents first)
// NOTE: 'users' is intentionally excluded to preserve staging admin accounts
const TABLES_TO_SYNC = [
  'questions',
  'tests',
  'test_questions',
  'assessments',
  'assessment_answers'
];

async function refreshStaging() {
  const connectionString = process.env.DATABASE_REFRESH_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_REFRESH_URL environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error('  DATABASE_REFRESH_URL=postgresql://cleverbadge_refresh:pwd@host:5432/db npm run refresh_db');
    process.exit(1);
  }

  console.log('');
  console.log('=============================================================================');
  console.log('CleverBadge - Refreshing Staging from Production');
  console.log('=============================================================================');
  console.log('');
  console.log('⚠️  WARNING: This will DELETE all data in staging (except users) and replace');
  console.log('    it with production data.');
  console.log('');

  const sql = postgres(connectionString, {
    max: 1,
    onnotice: () => {}, // Suppress notices
    ssl: { rejectUnauthorized: false }, // Required for Render
  });

  try {
    // Verify connection and permissions
    console.log('🔌 Connecting to database...');
    await sql`SELECT 1`;
    console.log('✅ Connected successfully');
    console.log('');

    // Start transaction
    await sql.begin(async (tx) => {
      // Step 1: Truncate staging tables using CASCADE (handles FK constraints)
      // This avoids needing table ownership for DISABLE TRIGGER
      console.log('Step 1: Truncating staging tables (CASCADE handles FK constraints)...');
      for (const table of [...TABLES_TO_SYNC].reverse()) {
        await tx.unsafe(`TRUNCATE TABLE ${STAGING_SCHEMA}.${table} CASCADE`);
        console.log(`   ✓ Truncated ${table}`);
      }
      console.log('');

      // Step 2: Copy data from production to staging
      console.log('Step 2: Copying data from production to staging...');

      // questions (cast enums through text to handle cross-schema enum types)
      console.log('   Copying questions...');
      await tx.unsafe(`
        INSERT INTO ${STAGING_SCHEMA}.questions (id, title, text, type, options, tags, author_id, visibility, is_archived, created_at, updated_at)
        SELECT id, title, text, type::text::${STAGING_SCHEMA}.question_type, options, tags, author_id, visibility::text::${STAGING_SCHEMA}.visibility_type, is_archived, created_at, updated_at
        FROM ${PRODUCTION_SCHEMA}.questions
      `);

      // tests (cast enums through text)
      console.log('   Copying tests...');
      await tx.unsafe(`
        INSERT INTO ${STAGING_SCHEMA}.tests (id, title, description, slug, is_enabled, pass_threshold, visibility, show_explanations, explanation_scope, is_archived, created_at, updated_at)
        SELECT id, title, description, slug, is_enabled, pass_threshold, visibility::text::${STAGING_SCHEMA}.visibility_type, show_explanations::text::${STAGING_SCHEMA}.show_explanations_type, explanation_scope::text::${STAGING_SCHEMA}.explanation_scope_type, is_archived, created_at, updated_at
        FROM ${PRODUCTION_SCHEMA}.tests
      `);

      // test_questions
      console.log('   Copying test_questions...');
      await tx.unsafe(`
        INSERT INTO ${STAGING_SCHEMA}.test_questions (id, test_id, question_id, weight)
        SELECT id, test_id, question_id, weight
        FROM ${PRODUCTION_SCHEMA}.test_questions
      `);

      // assessments (cast enum through text)
      console.log('   Copying assessments...');
      await tx.unsafe(`
        INSERT INTO ${STAGING_SCHEMA}.assessments (id, test_id, candidate_name, access_slug, status, score_percentage, started_at, completed_at, is_archived)
        SELECT id, test_id, candidate_name, access_slug, status::text::${STAGING_SCHEMA}.assessment_status, score_percentage, started_at, completed_at, is_archived
        FROM ${PRODUCTION_SCHEMA}.assessments
      `);

      // assessment_answers
      console.log('   Copying assessment_answers...');
      await tx.unsafe(`
        INSERT INTO ${STAGING_SCHEMA}.assessment_answers (id, assessment_id, question_id, selected_options, is_correct, answered_at)
        SELECT id, assessment_id, question_id, selected_options, is_correct, answered_at
        FROM ${PRODUCTION_SCHEMA}.assessment_answers
      `);

      console.log('   ✓ All data copied');
      console.log('');

      // Step 3: Verify counts
      console.log('Step 3: Verifying data counts...');
      console.log('');
      console.log('   Table                  | Production | Staging | Status');
      console.log('   -----------------------|------------|---------|--------');

      let allMatch = true;
      for (const table of TABLES_TO_SYNC) {
        const [prodCount] = await tx.unsafe(`SELECT COUNT(*) as count FROM ${PRODUCTION_SCHEMA}.${table}`);
        const [stagingCount] = await tx.unsafe(`SELECT COUNT(*) as count FROM ${STAGING_SCHEMA}.${table}`);

        const match = prodCount.count === stagingCount.count;
        if (!match) allMatch = false;

        const status = match ? '✓ OK' : '✗ MISMATCH';
        const tablePadded = table.padEnd(21);
        const prodPadded = String(prodCount.count).padStart(10);
        const stagingPadded = String(stagingCount.count).padStart(7);

        console.log(`   ${tablePadded} | ${prodPadded} | ${stagingPadded} | ${status}`);
      }

      // Also show users count (not synced)
      const [prodUsers] = await tx.unsafe(`SELECT COUNT(*) as count FROM ${PRODUCTION_SCHEMA}.users`);
      const [stagingUsers] = await tx.unsafe(`SELECT COUNT(*) as count FROM ${STAGING_SCHEMA}.users`);
      console.log(`   ${'users (preserved)'.padEnd(21)} | ${String(prodUsers.count).padStart(10)} | ${String(stagingUsers.count).padStart(7)} | ℹ️  NOT SYNCED`);

      console.log('');

      if (!allMatch) {
        throw new Error('Data count mismatch detected - rolling back transaction');
      }
    });

    console.log('=============================================================================');
    console.log('✅ Staging refresh complete!');
    console.log('=============================================================================');
    console.log('');
    console.log('Note: Users table was NOT synced - staging admin accounts are preserved.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error during refresh:', error.message);
    console.error('');
    console.error('Transaction rolled back - no changes were made.');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

refreshStaging();

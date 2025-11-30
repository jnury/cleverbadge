import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const schema = process.env.NODE_ENV || 'development';
const adminUrl = process.env.DATABASE_ADMIN_URL;

if (!adminUrl) {
  console.error('DATABASE_ADMIN_URL must be set');
  process.exit(1);
}

const sql = postgres(adminUrl);

try {
  console.log(`Creating tables in schema "${schema}"...`);

  // Set search_path to the target schema
  await sql.unsafe(`SET search_path TO ${schema}, public`);
  console.log(`✓ search_path set to ${schema}`);

  // Create the schema if it doesn't exist
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  console.log(`✓ Schema "${schema}" created/verified`);

  // Create enums in the schema (if they don't already exist)
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE ${schema}.question_type AS ENUM ('SINGLE', 'MULTIPLE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log(`✓ ${schema}.question_type enum created/verified`);

  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE ${schema}.assessment_status AS ENUM ('STARTED', 'COMPLETED', 'ABANDONED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  // Add ABANDONED to existing enum if it doesn't have it
  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TYPE ${schema}.assessment_status ADD VALUE IF NOT EXISTS 'ABANDONED';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log(`✓ ${schema}.assessment_status enum created/verified`);

  // Create tables in the development schema
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log(`✓ ${schema}.users table created/verified`);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      text TEXT NOT NULL,
      type ${schema}.question_type NOT NULL,
      options JSON NOT NULL,
      correct_answers JSON NOT NULL,
      tags JSON,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log(`✓ ${schema}.questions table created/verified`);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.tests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      slug VARCHAR(100) NOT NULL UNIQUE,
      is_enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log(`✓ ${schema}.tests table created/verified`);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.test_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_id UUID NOT NULL REFERENCES ${schema}.tests(id) ON DELETE CASCADE,
      question_id UUID NOT NULL REFERENCES ${schema}.questions(id) ON DELETE RESTRICT,
      weight INTEGER NOT NULL DEFAULT 1
    )
  `);
  console.log(`✓ ${schema}.test_questions table created/verified`);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_id UUID NOT NULL REFERENCES ${schema}.tests(id) ON DELETE CASCADE,
      candidate_name VARCHAR(100) NOT NULL,
      status ${schema}.assessment_status NOT NULL DEFAULT 'STARTED',
      score_percentage DECIMAL(5,2),
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    )
  `);
  console.log(`✓ ${schema}.assessments table created/verified`);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.assessment_answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID NOT NULL REFERENCES ${schema}.assessments(id) ON DELETE CASCADE,
      question_id UUID NOT NULL REFERENCES ${schema}.questions(id) ON DELETE RESTRICT,
      selected_options JSON NOT NULL,
      is_correct BOOLEAN,
      answered_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log(`✓ ${schema}.assessment_answers table created/verified`);

  // Grant permissions to the runtime user
  const runtimeUser = `cleverbadge_dev`;
  console.log(`\nGranting permissions to ${runtimeUser}...`);

  await sql.unsafe(`GRANT USAGE ON SCHEMA ${schema} TO ${runtimeUser}`);
  await sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${runtimeUser}`);
  await sql.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${runtimeUser}`);
  await sql.unsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${runtimeUser}`);
  await sql.unsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT USAGE, SELECT ON SEQUENCES TO ${runtimeUser}`);

  console.log(`✓ Permissions granted to ${runtimeUser}`);

  console.log('\n✅ All tables created successfully!');
} catch (error) {
  console.error('Error creating tables:', error);
  process.exit(1);
} finally {
  await sql.end();
}

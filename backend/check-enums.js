import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

async function checkEnums() {
  const adminUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
  const sql = postgres(adminUrl, { prepare: false });

  try {
    console.log('Checking enums in development schema...');
    const enums = await sql`
      SELECT n.nspname as schema, t.typname as name
      FROM pg_type t
      LEFT JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_class c WHERE c.oid = t.typrelid))
      AND NOT EXISTS(SELECT 1 FROM pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
      AND n.nspname IN ('development', 'public')
      AND t.typname IN ('question_type', 'assessment_status')
      ORDER BY n.nspname, t.typname
    `;
    console.log('Enums found:');
    enums.forEach(e => console.log(`  ${e.schema}.${e.name}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkEnums();

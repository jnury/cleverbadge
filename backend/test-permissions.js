import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

async function testPermissions() {
  // Test with runtime user
  const runtimeUrl = process.env.DATABASE_URL;
  const sql = postgres(runtimeUrl, { prepare: false });

  try {
    console.log('Testing with runtime user (from DATABASE_URL)...');

    // Check current user
    const user = await sql`SELECT current_user`;
    console.log('Current user:', user[0].current_user);

    // Check schemas visible to this user
    const schemas = await sql`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT LIKE 'pg_%'
      AND schema_name != 'information_schema'
    `;
    console.log('Visible schemas:', schemas.map(s => s.schema_name));

    // Check tables in development schema
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'development'
    `;
    console.log('Tables in development schema:', tables.map(t => t.tablename));

    // Try setting search path
    await sql`SET search_path TO development`;
    const path = await sql`SHOW search_path`;
    console.log('Search path after SET:', path[0].search_path);

    // Try selecting from questions
    const questions = await sql`SELECT * FROM questions LIMIT 1`;
    console.log('Questions:', questions);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

testPermissions();

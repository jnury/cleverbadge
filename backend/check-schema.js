import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  const adminUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
  const sql = postgres(adminUrl, { prepare: false });

  try {
    console.log('Checking all schemas...');
    const schemas = await sql`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT LIKE 'pg_%'
      AND schema_name != 'information_schema'
    `;
    console.log('Schemas:', schemas.map(s => s.schema_name));

    console.log('\nChecking tables in development schema...');
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'development'
    `;
    console.log('Tables in development:', tables.map(t => t.tablename));

    console.log('\nChecking tables in public schema...');
    const publicTables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `;
    console.log('Tables in public:', publicTables.map(t => t.tablename));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkSchema();

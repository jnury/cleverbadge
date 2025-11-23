import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

async function checkPerms() {
  const connString = process.env.DATABASE_URL;
  const sql = postgres(connString, { prepare: false });

  try {
    console.log('Checking permissions for cleverbadge_dev...');

    // Check table privileges
    const privs = await sql`
      SELECT grantee, table_schema, table_name, privilege_type
      FROM information_schema.table_privileges
      WHERE grantee = 'cleverbadge_dev'
      AND table_schema = 'development'
    `;
    console.log('\nTable privileges:', privs);

    // Try a direct select with fully qualified name
    console.log('\nTrying SELECT with fully qualified table name...');
    const result = await sql`SELECT * FROM development.questions LIMIT 1`;
    console.log('Success! Found:', result.length, 'rows');

    // Set search path and try without qualification
    await sql`SET search_path TO development`;
    console.log('\nTrying SELECT without schema qualification after setting search_path...');
    const result2 = await sql`SELECT * FROM questions LIMIT 1`;
    console.log('Success! Found:', result2.length, 'rows');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkPerms();

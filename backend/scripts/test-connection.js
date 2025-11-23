import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const schema = process.env.NODE_ENV || 'development';
const dbUrl = process.env.DATABASE_URL;

console.log(`Testing connection for schema "${schema}"...`);

const sql = postgres(dbUrl, {
  onconnect: async (connection) => {
    console.log('Setting search_path...');
    await connection.unsafe(`SET search_path TO ${schema}, public`);
    console.log(`✓ search_path set to ${schema}`);
  }
});

try {
  // Test 1: Check search_path
  const [{ search_path }] = await sql`SHOW search_path`;
  console.log(`Current search_path: ${search_path}`);

  // Test 2: List tables in schema
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = ${schema}
  `;
  console.log(`\nTables in ${schema} schema:`);
  tables.forEach(t => console.log(`  - ${t.table_name}`));

  // Test 3: Try to select from questions table
  console.log(`\n Trying to select from "${schema}"."questions"...`);
  const questions = await sql`SELECT * FROM ${sql(schema)}.questions LIMIT 1`;
  console.log(`✓ Successfully queried questions table, found ${questions.length} rows`);

} catch (error) {
  console.error('Error:', error);
} finally {
  await sql.end();
}

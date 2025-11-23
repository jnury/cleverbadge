import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv;

let connStr = connectionString;
if (connStr && !connStr.includes('search_path')) {
  const separator = connStr.includes('?') ? '&' : '?';
  connStr = `${connStr}${separator}options=-c%20search_path%3D${dbSchema}`;
}

console.log('Testing with modified connection string...');
const sql = postgres(connStr, { prepare: false, onnotice: () => {} });

async function test() {
  try {
    const schema = await sql`SELECT current_schema()`;
    console.log('Current schema:', schema[0].current_schema);

    const questions = await sql`SELECT * FROM questions LIMIT 1`;
    console.log('Questions:', questions);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

test();

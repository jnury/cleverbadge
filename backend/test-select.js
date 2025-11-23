import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv;

// Test with modified connection string (like db/index.js does)
let connStr = connectionString;
if (connStr && !connStr.includes('search_path')) {
  const separator = connStr.includes('?') ? '&' : '?';
  connStr = `${connStr}${separator}options=-c%20search_path%3D${dbSchema}`;
}

console.log('Testing with connection string:', connStr.substring(0, 50) + '...');

const sql = postgres(connStr, { prepare: false, onnotice: () => {} });

async function test() {
  try {
    console.log('\nTest 1: Direct query with schema prefix...');
    const result1 = await sql`select * from "development"."questions"`;
    console.log('Success! Found', result1.length, 'questions');

    console.log('\nTest 2: Query without schema prefix (relying on search_path)...');
    const result2 = await sql`select * from "questions"`;
    console.log('Success! Found', result2.length, 'questions');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

test();

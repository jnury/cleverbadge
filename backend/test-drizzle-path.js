import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv;

// Modify connection string like db/index.js does
let connStr = connectionString;
if (connStr && !connStr.includes('search_path')) {
  const separator = connStr.includes('?') ? '&' : '?';
  connStr = `${connStr}${separator}options=-c%20search_path%3D${dbSchema}`;
}

console.log('Connection string:', connStr);

const client = postgres(connStr, {
  onnotice: () => {}
});

const db = drizzle(client);

async function test() {
  try {
    // Check search_path via Drizzle
    const result = await db.execute(sql`SHOW search_path`);
    console.log('Search path via Drizzle:', result);

    // Check current schema
    const schema = await db.execute(sql`SELECT current_schema()`);
    console.log('Current schema via Drizzle:', schema);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
  process.exit(0);
}

test();

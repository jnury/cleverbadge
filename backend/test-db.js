import dotenv from 'dotenv';
dotenv.config();

import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

async function testDB() {
  try {
    // Test basic connectivity
    console.log('Testing database connection...');
    const result = await db.execute(sql`SELECT current_schema()`);
    console.log('Current schema:', result[0]);

    // List all schemas
    const schemas = await db.execute(sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'`);
    console.log('\nAvailable schemas:');
    schemas.forEach(row => console.log('  -', row.schema_name));

    // Try to list tables
    console.log('\nTrying to list tables in current schema...');
    const tables = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = current_schema()`);
    console.log('Tables:', tables.length);
    tables.forEach(row => console.log('  -', row.tablename));

  } catch (error) {
    console.error('Database test failed:', error.message);
  }

  process.exit(0);
}

testDB();

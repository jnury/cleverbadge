import postgres from 'postgres';
import dotenv from 'dotenv';
import { db } from '../db/index.js';
import { questions } from '../db/schema.js';

dotenv.config();

console.log('Testing connection and Drizzle insert...');

// First, check the search_path with raw SQL
const testSql = postgres(process.env.DATABASE_URL);
try {
  const [{ search_path }] = await testSql`SHOW search_path`;
  console.log(`Raw postgres search_path: ${search_path}`);
} catch (error) {
  console.error('Error checking search_path:', error.message);
} finally {
  await testSql.end();
}

// Now test Drizzle
try {
  const result = await db
    .insert(questions)
    .values({
      text: 'Test question from script',
      type: 'SINGLE',
      options: ['A', 'B', 'C'],
      correct_answers: ['A'],
      tags: ['test']
    })
    .returning();

  console.log('✅ Success!', result);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Cause:', error.cause?.message);
}

process.exit(0);

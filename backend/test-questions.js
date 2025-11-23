import dotenv from 'dotenv';
dotenv.config();

import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { questions } from './db/schema.js';

async function testQuestions() {
  try {
    console.log('Testing questions table...');

    // Try to select from development.questions explicitly
    const result = await db.execute(sql`SELECT * FROM development.questions LIMIT 1`);
    console.log('Direct SQL query result:', result);

    // Try using Drizzle ORM
    const allQuestions = await db.select().from(questions);
    console.log('Drizzle ORM result:', allQuestions);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }

  process.exit(0);
}

testQuestions();

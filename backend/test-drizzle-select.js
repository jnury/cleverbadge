import dotenv from 'dotenv';
dotenv.config();

import { db } from './db/index.js';
import { questions } from './db/schema.js';

async function test() {
  try {
    console.log('Testing Drizzle select...');
    const result = await db.select().from(questions);
    console.log('Success! Questions:', result);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
  process.exit(0);
}

test();

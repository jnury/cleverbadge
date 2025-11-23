import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

async function testInsert() {
  const connString = process.env.DATABASE_URL;
  const sql = postgres(connString, { prepare: false, onnotice: () => {} });

  try {
    console.log('Testing insert with schema-qualified table name...');

    const result = await sql`
      insert into "development"."questions" ("id", "text", "type", "options", "correct_answers", "tags", "created_at", "updated_at")
      values (default, 'Test?', 'SINGLE', '["A","B"]', '["A"]', '["test"]', default, default)
      returning *
    `;

    console.log('Success! Inserted:', result[0]);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Detail:', error.detail);
  } finally {
    await sql.end();
  }
}

testInsert();

import postgres from 'postgres';
import { hashPassword } from '../utils/password.js';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    const dbSchema = process.env.NODE_ENV || 'development';
    const sql = postgres(connectionString, {
      onnotice: () => {}
    });

    console.log(`\n🔐 Create Admin User (schema: ${dbSchema})\n`);

    // Get username
    const username = await question('Enter admin username: ');
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    // Check if username exists
    const existing = await sql`
      SELECT id FROM ${sql(dbSchema)}.users
      WHERE username = ${username}
    `;

    if (existing.length > 0) {
      throw new Error(`User '${username}' already exists`);
    }

    // Get password
    const password = await question('Enter admin password: ');
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Hash password
    console.log('\n🔐 Hashing password...');
    const passwordHash = await hashPassword(password);

    // Insert user
    console.log('💾 Creating admin user...');
    const result = await sql`
      INSERT INTO ${sql(dbSchema)}.users (username, password_hash)
      VALUES (${username}, ${passwordHash})
      RETURNING id, username, created_at
    `;

    const admin = result[0];

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ID:       ', admin.id);
    console.log('Username: ', admin.username);
    console.log('Role:     ', 'ADMIN');
    console.log('Created:  ', admin.created_at);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await sql.end();
    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

createAdmin();

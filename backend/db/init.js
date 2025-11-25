import { sql, dbSchema } from './index.js';
import { hashPassword } from '../utils/password.js';

// Default admin credentials
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'CleverPassword';

/**
 * Ensures a default admin user exists in the database.
 * Creates one with default credentials if no admin users exist.
 */
export async function ensureDefaultAdmin() {
  try {
    // Check if any admin user exists
    const existingUsers = await sql`
      SELECT id, username FROM ${sql(dbSchema)}.users LIMIT 1
    `;

    if (existingUsers.length > 0) {
      console.log(`👤 Admin user exists: ${existingUsers[0].username}`);
      return;
    }

    // No admin exists, create default one
    console.log('👤 No admin user found, creating default admin...');

    const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

    const result = await sql`
      INSERT INTO ${sql(dbSchema)}.users (username, password_hash)
      VALUES (${DEFAULT_ADMIN_USERNAME}, ${passwordHash})
      RETURNING id, username
    `;

    console.log(`✅ Default admin created: ${result[0].username}`);
    console.log(`⚠️  IMPORTANT: Change the default password after first login!`);
    console.log(`   Default credentials: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`);

  } catch (error) {
    // Don't crash the server if admin creation fails
    // This might happen if tables don't exist yet (pre-migration)
    console.error('⚠️  Could not ensure admin user:', error.message);
  }
}

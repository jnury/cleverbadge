import { sql, dbSchema } from './index.js';
import { hashPassword } from '../utils/password.js';

// Default admin credentials
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'CleverPassword';

// Protected demo test configuration
const DEMO_TEST_SLUG = 'demo';
const DEMO_TEST_CONFIG = {
  title: 'Demo Test',
  description: 'Try out CleverBadge with this sample test. Add questions from the admin dashboard to get started.',
  slug: DEMO_TEST_SLUG,
  visibility: 'public',
  is_enabled: true,
  pass_threshold: 70,
  show_explanations: 'after_submit',
  explanation_scope: 'all_answers'
};

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

/**
 * Ensures the demo test exists in the database.
 * Creates one with default configuration if it doesn't exist.
 * The demo test is protected from deletion and slug regeneration.
 */
export async function ensureDemoTest() {
  try {
    // Check if demo test exists (including archived ones)
    const existingTests = await sql`
      SELECT id, slug, is_archived FROM ${sql(dbSchema)}.tests
      WHERE slug = ${DEMO_TEST_SLUG}
    `;

    if (existingTests.length > 0) {
      const test = existingTests[0];
      if (test.is_archived) {
        // Unarchive the demo test if it was somehow archived
        await sql`
          UPDATE ${sql(dbSchema)}.tests
          SET is_archived = false, is_enabled = true
          WHERE id = ${test.id}
        `;
        console.log('🎯 Demo test restored from archive');
      } else {
        console.log('🎯 Demo test exists: /t/demo');
      }
      return;
    }

    // Create demo test
    console.log('🎯 Creating demo test...');

    const result = await sql`
      INSERT INTO ${sql(dbSchema)}.tests (
        title, description, slug, visibility, is_enabled,
        pass_threshold, show_explanations, explanation_scope
      )
      VALUES (
        ${DEMO_TEST_CONFIG.title},
        ${DEMO_TEST_CONFIG.description},
        ${DEMO_TEST_CONFIG.slug},
        ${DEMO_TEST_CONFIG.visibility},
        ${DEMO_TEST_CONFIG.is_enabled},
        ${DEMO_TEST_CONFIG.pass_threshold},
        ${DEMO_TEST_CONFIG.show_explanations},
        ${DEMO_TEST_CONFIG.explanation_scope}
      )
      RETURNING id, slug
    `;

    console.log(`✅ Demo test created: /t/${result[0].slug}`);
    console.log('   Add questions via the admin dashboard to complete setup.');

  } catch (error) {
    // Don't crash the server if demo test creation fails
    console.error('⚠️  Could not ensure demo test:', error.message);
  }
}

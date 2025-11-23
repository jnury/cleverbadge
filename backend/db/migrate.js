import dotenv from 'dotenv';
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database configuration
const connectionString = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv;

if (!connectionString) {
  console.error('❌ DATABASE_URL or DATABASE_ADMIN_URL must be set');
  process.exit(1);
}

console.log(`🗄️  Running migrations for schema: ${dbSchema}`);

// Create admin connection (no search_path set yet)
const sql = postgres(connectionString, {
  max: 1,
});

async function runMigrations() {
  try {
    // 1. Create schema if it doesn't exist
    console.log(`📦 Creating schema "${dbSchema}" if it doesn't exist...`);
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);
    console.log(`✅ Schema "${dbSchema}" ready`);

    // 2. Get all migration files
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically (001, 002, etc.)

    console.log(`📄 Found ${migrationFiles.length} migration file(s)`);

    // 3. Run each migration
    for (const filename of migrationFiles) {
      console.log(`\n🚀 Running migration: ${filename}`);
      const migrationPath = join(migrationsDir, filename);
      let migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Replace __SCHEMA__ placeholder with actual schema name
      migrationSQL = migrationSQL.replaceAll('__SCHEMA__', dbSchema);

      // Run the migration
      try {
        await sql.unsafe(migrationSQL);
        console.log(`✅ ${filename} completed successfully`);
      } catch (error) {
        // If error is "column already exists" or "relation already exists", skip it
        if (error.code === '42701' || error.code === '42P07') {
          console.log(`⚠️  ${filename} already applied (skipping)`);
        } else {
          throw error;
        }
      }
    }

    // 4. Verify tables were created
    console.log(`\n🔍 Verifying tables...`);
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${dbSchema}
      ORDER BY table_name
    `;

    console.log(`📋 Tables in "${dbSchema}" schema:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    console.log(`\n🎉 All migrations completed successfully!`);
  } catch (error) {
    console.error(`❌ Migration failed:`, error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();

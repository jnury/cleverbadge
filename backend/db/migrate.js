import dotenv from 'dotenv';
import postgres from 'postgres';
import { readFileSync } from 'fs';
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

    // 2. Read migration file
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    let migrationSQL = readFileSync(migrationPath, 'utf-8');

    // 3. Replace __SCHEMA__ placeholder with actual schema name
    migrationSQL = migrationSQL.replaceAll('__SCHEMA__', dbSchema);

    // 4. Run the migration
    console.log(`🚀 Applying migration...`);
    await sql.unsafe(migrationSQL);
    console.log(`✅ Migration completed successfully`);

    // 5. Verify tables were created
    console.log(`🔍 Verifying tables...`);
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${dbSchema}
      ORDER BY table_name
    `;

    console.log(`📋 Tables in "${dbSchema}" schema:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    console.log(`\n🎉 Migration successful!`);
  } catch (error) {
    console.error(`❌ Migration failed:`, error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function createSchema() {
  // Use admin URL to create schema
  const adminUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV || 'development';

  console.log(`Creating schema "${nodeEnv}" if it doesn't exist...`);

  const sql = postgres(adminUrl, { prepare: false });

  try {
    // Create schema if it doesn't exist
    await sql`CREATE SCHEMA IF NOT EXISTS ${sql(nodeEnv)}`;
    console.log(`✅ Schema "${nodeEnv}" is ready`);

    // Grant privileges to the runtime user
    const runtimeUser = adminUrl.includes('cleverbadge_dev') ? 'cleverbadge_dev' :
                        adminUrl.includes('cleverbadge_test') ? 'cleverbadge_test' :
                        adminUrl.includes('cleverbadge_staging') ? 'cleverbadge_staging' :
                        'cleverbadge_prod';

    await sql`GRANT ALL ON SCHEMA ${sql(nodeEnv)} TO ${sql(runtimeUser)}`;
    await sql`GRANT ALL ON ALL TABLES IN SCHEMA ${sql(nodeEnv)} TO ${sql(runtimeUser)}`;
    await sql`GRANT ALL ON ALL SEQUENCES IN SCHEMA ${sql(nodeEnv)} TO ${sql(runtimeUser)}`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${sql(nodeEnv)} GRANT ALL ON TABLES TO ${sql(runtimeUser)}`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${sql(nodeEnv)} GRANT ALL ON SEQUENCES TO ${sql(runtimeUser)}`;

    console.log(`✅ Privileges granted to ${runtimeUser}`);

  } catch (error) {
    console.error('Error creating schema:', error.message);
  } finally {
    await sql.end();
  }
}

createSchema();

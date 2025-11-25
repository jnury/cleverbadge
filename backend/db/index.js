import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables if not already loaded
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

// Get database URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set');
}

// Schema is automatically determined from NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv; // development, testing, staging, or production

// SSL required for staging/production (Render)
const requireSSL = nodeEnv === 'staging' || nodeEnv === 'production';

console.log(`🗄️  Database: Connecting to schema "${dbSchema}" (NODE_ENV=${nodeEnv})`);

// Create PostgreSQL client
const sql = postgres(connectionString, {
  // Connection pool settings
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // SSL for Render deployments
  ssl: requireSSL ? { rejectUnauthorized: false } : false,
});

// Test the connection
(async () => {
  try {
    await sql`SELECT 1 as test`;
    console.log(`✅  Database connected - using schema: ${dbSchema}`);
  } catch (error) {
    console.error(`❌  Failed to connect to database:`, error.message);
  }
})();

// Export the sql client and schema name
export { sql, dbSchema };

// Helper function to gracefully close the connection
export async function closeDatabase() {
  await sql.end({ timeout: 5 });
  console.log('🔌 Database connection closed');
}

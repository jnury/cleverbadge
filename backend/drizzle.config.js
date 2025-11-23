import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

// Schema is determined by NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv; // development, testing, staging, or production

console.log(`🗄️  Drizzle: Using schema "${dbSchema}" (from NODE_ENV=${nodeEnv})`);

// For migrations, we need admin access
// Use DATABASE_ADMIN_URL if available, otherwise DATABASE_URL
let dbUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL or DATABASE_ADMIN_URL must be set');
}

// Add schema parameter to use the correct schema
// This sets the search_path so tables are created in the right schema
dbUrl = `${dbUrl}?options=--search_path%3D${dbSchema}`;

export default defineConfig({
  schema: './db/schema.js',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: dbUrl
  }
});

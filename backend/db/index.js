import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

// Get database URL from environment
const connectionString = process.env.DATABASE_URL;

// Schema is automatically determined from NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv; // development, testing, staging, or production

console.log(`🗄️  Database: Connecting to schema "${dbSchema}" (NODE_ENV=${nodeEnv})`);

// Create PostgreSQL client with schema awareness
// Will throw error if DATABASE_URL is not set
const client = postgres(connectionString, {
  onnotice: () => {},
  prepare: false,
  connection: {
    search_path: dbSchema // Set search path to use specific schema
  }
});

// Create Drizzle instance
export const db = drizzle(client, { schema });

import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv;

let connStr = connectionString;
if (connStr && !connStr.includes('search_path')) {
  const separator = connStr.includes('?') ? '&' : '?';
  connStr = `${connStr}${separator}options=-c%20search_path%3D${dbSchema}`;
}

console.log('Original:', connectionString);
console.log('Modified:', connStr);

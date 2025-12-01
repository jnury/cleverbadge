import dotenv from 'dotenv';
import { createRequire } from 'module';

// Load environment variables FIRST, before any other imports
dotenv.config();

// Load package.json for version info
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

import express from 'express';
import cors from 'cors';
import { sql } from './db/index.js';
import { ensureDefaultAdmin } from './db/init.js';
import authRouter from './routes/auth.js';
import questionsRouter from './routes/questions.js';
import testsRouter from './routes/tests.js';
import assessmentsRouter from './routes/assessments.js';
import importRouter from './routes/import.js';
import analyticsRouter from './routes/analytics.js';
import { startAssessmentCleanupJob } from './jobs/assessmentCleanup.js';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware - CORS configuration based on environment
const corsOrigins = {
  production: ['https://cleverbadge.com', 'https://www.cleverbadge.com'],
  staging: ['https://staging.cleverbadge.com'],
  development: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  testing: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
};
app.use(cors({
  origin: corsOrigins[NODE_ENV] || corsOrigins.development
}));
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: pkg.version,
    environment: NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/questions', importRouter); // Mount import under /api/questions
app.use('/api/tests', testsRouter);
app.use('/api/tests', analyticsRouter); // Mount analytics under /api/tests
app.use('/api/assessments', assessmentsRouter);

// Test database connection on startup and ensure default admin exists
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🗄️  Database schema: ${NODE_ENV}`);

  try {
    await sql`SELECT 1 as test`;
    console.log('✅ Database connected successfully');

    // Ensure default admin user exists
    await ensureDefaultAdmin();

    // Start scheduled jobs
    startAssessmentCleanupJob();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
});

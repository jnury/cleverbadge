import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import { sql } from './db/index.js';
import authRouter from './routes/auth.js';
import questionsRouter from './routes/questions.js';
import testsRouter from './routes/tests.js';
import assessmentsRouter from './routes/assessments.js';
import importRouter from './routes/import.js';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://cleverbadge.com'
    : 'http://localhost:5173'
}));
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.7.3',
    environment: NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/questions', importRouter); // Mount import under /api/questions
app.use('/api/tests', testsRouter);
app.use('/api/assessments', assessmentsRouter);

// Test database connection on startup
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🗄️  Database schema: ${NODE_ENV}`);

  try {
    await sql`SELECT 1 as test`;
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
});

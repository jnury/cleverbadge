# Phase 1: Core Candidate Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Candidates can take tests end-to-end without authentication

**Architecture:** Express REST API with Drizzle ORM, React SPA with Tailwind CSS, schema-aware PostgreSQL connection using NODE_ENV

**Tech Stack:** Express.js, Drizzle ORM, PostgreSQL, React, Vite, Tailwind CSS, argon2, JWT (structure only)

**Version:** 0.1.0

---

## Task 1: Backend Foundation - Express Server & Health Endpoint

**Files:**
- Create: `backend/package.json`
- Create: `backend/index.js`
- Create: `backend/.env.example`

**Step 1: Create backend package.json**

```json
{
  "name": "cleverbadge-backend",
  "version": "0.1.0",
  "description": "Clever Badge API Server",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.3"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",
    "nodemon": "^3.0.1"
  }
}
```

**Step 2: Install backend dependencies**

Run: `cd backend && npm install`
Expected: All packages installed successfully

**Step 3: Create .env.example**

```env
# Runtime database connection (environment-specific user, data access only)
DATABASE_URL="postgresql://cleverbadge_dev:password@localhost:5432/cleverbadge"

# Environment (also determines database schema automatically)
NODE_ENV="development"

# JWT secret (will be used in Phase 2)
JWT_SECRET="your_jwt_secret_change_in_production"

# Server port
PORT=3000
```

**Step 4: Create Express server with health endpoint**

Create `backend/index.js`:

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

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
    version: '0.1.0',
    environment: NODE_ENV
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🗄️  Database schema: ${NODE_ENV}`);
});
```

**Step 5: Test health endpoint**

Run: `npm run dev`
Expected: Server starts on port 3000

Run (in new terminal): `curl http://localhost:3000/health`
Expected:
```json
{
  "status": "ok",
  "timestamp": "2025-01-23T...",
  "version": "0.1.0",
  "environment": "development"
}
```

**Step 6: Commit**

```bash
git add backend/package.json backend/index.js backend/.env.example
git commit -m "feat: add Express server with health endpoint"
```

---

## Task 2: Database Setup - Drizzle Schema & Connection

**Files:**
- Create: `backend/db/schema.js`
- Create: `backend/db/index.js`
- Create: `backend/drizzle.config.js`

**Step 1: Create Drizzle schema**

Create `backend/db/schema.js`:

```javascript
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, json, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const questionTypeEnum = pgEnum('question_type', ['SINGLE', 'MULTIPLE']);
export const assessmentStatusEnum = pgEnum('assessment_status', ['STARTED', 'COMPLETED']);

// Users table (for Phase 2)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Questions table
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  type: questionTypeEnum('type').notNull(),
  options: json('options').$type().notNull(),
  correct_answers: json('correct_answers').$type().notNull(),
  tags: json('tags').$type(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Tests table
export const tests = pgTable('tests', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  is_enabled: boolean('is_enabled').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Test Questions junction table
export const testQuestions = pgTable('test_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  test_id: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  question_id: uuid('question_id').references(() => questions.id, { onDelete: 'restrict' }).notNull(),
  weight: integer('weight').default(1).notNull()
});

// Assessments table
export const assessments = pgTable('assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  test_id: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  candidate_name: varchar('candidate_name', { length: 100 }).notNull(),
  status: assessmentStatusEnum('status').default('STARTED').notNull(),
  score_percentage: decimal('score_percentage', { precision: 5, scale: 2 }),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at')
});

// Assessment Answers table
export const assessmentAnswers = pgTable('assessment_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  assessment_id: uuid('assessment_id').references(() => assessments.id, { onDelete: 'cascade' }).notNull(),
  question_id: uuid('question_id').references(() => questions.id, { onDelete: 'restrict' }).notNull(),
  selected_options: json('selected_options').$type().notNull(),
  is_correct: boolean('is_correct'),
  answered_at: timestamp('answered_at').defaultNow().notNull()
});
```

**Step 2: Create database connection with schema awareness**

Create `backend/db/index.js`:

```javascript
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

// Get database URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Schema is automatically determined from NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv; // development, testing, staging, or production

console.log(`🗄️  Database: Connecting to schema "${dbSchema}" (NODE_ENV=${nodeEnv})`);

// Create PostgreSQL client with schema awareness
const client = postgres(connectionString, {
  onnotice: () => {},
  prepare: false,
  connection: {
    search_path: dbSchema // Set search path to use specific schema
  }
});

// Create Drizzle instance
export const db = drizzle(client, { schema });
```

**Step 3: Create Drizzle configuration**

Create `backend/drizzle.config.js`:

```javascript
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

// Schema is determined by NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv; // development, testing, staging, or production

console.log(`🗄️  Drizzle: Using schema "${dbSchema}" (from NODE_ENV=${nodeEnv})`);

// For migrations, we need admin access
// Use DATABASE_ADMIN_URL if available, otherwise DATABASE_URL
const dbUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL or DATABASE_ADMIN_URL must be set');
}

export default defineConfig({
  schema: './db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl
  },
  schemaFilter: [dbSchema] // Only manage our specific schema
});
```

**Step 4: Push schema to database**

Run: `npm run db:push`
Expected: Schema created successfully in development schema

**Step 5: Verify database connection**

Update `backend/index.js` to import db:

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db/index.js';

dotenv.config();

// ... rest of the code

// Test database connection on startup
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🗄️  Database schema: ${NODE_ENV}`);

  try {
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
});
```

**Step 6: Test server restart**

Run: `npm run dev`
Expected: Server starts and shows "✅ Database connected successfully"

**Step 7: Commit**

```bash
git add backend/db/ backend/drizzle.config.js backend/index.js
git commit -m "feat: add Drizzle schema and database connection"
```

---

## Task 3: Questions API (CRUD without auth)

**Files:**
- Create: `backend/routes/questions.js`
- Modify: `backend/index.js`

**Step 1: Create questions routes**

Create `backend/routes/questions.js`:

```javascript
import express from 'express';
import { db } from '../db/index.js';
import { questions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// GET all questions
router.get('/', async (req, res) => {
  try {
    const allQuestions = await db.select().from(questions);
    res.json({ questions: allQuestions, total: allQuestions.length });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET question by ID
router.get('/:id', async (req, res) => {
  try {
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, req.params.id));

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// POST create question
router.post('/', async (req, res) => {
  try {
    const { text, type, options, correct_answers, tags } = req.body;

    // Basic validation
    if (!text || !type || !options || !correct_answers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['SINGLE', 'MULTIPLE'].includes(type)) {
      return res.status(400).json({ error: 'Type must be SINGLE or MULTIPLE' });
    }

    const [newQuestion] = await db
      .insert(questions)
      .values({
        text,
        type,
        options,
        correct_answers,
        tags: tags || []
      })
      .returning();

    res.status(201).json(newQuestion);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT update question
router.put('/:id', async (req, res) => {
  try {
    const { text, type, options, correct_answers, tags } = req.body;

    const [updatedQuestion] = await db
      .update(questions)
      .set({
        text,
        type,
        options,
        correct_answers,
        tags,
        updated_at: new Date()
      })
      .where(eq(questions.id, req.params.id))
      .returning();

    if (!updatedQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE question
router.delete('/:id', async (req, res) => {
  try {
    const [deletedQuestion] = await db
      .delete(questions)
      .where(eq(questions.id, req.params.id))
      .returning();

    if (!deletedQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
```

**Step 2: Register questions routes in main server**

Modify `backend/index.js`:

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db/index.js';
import questionsRouter from './routes/questions.js';

dotenv.config();

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
    version: '0.1.0',
    environment: NODE_ENV
  });
});

// API routes
app.use('/api/questions', questionsRouter);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🗄️  Database schema: ${NODE_ENV}`);

  try {
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
});
```

**Step 3: Test questions API**

Run: `npm run dev`

Test creating a question:
```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What is 2+2?",
    "type": "SINGLE",
    "options": ["3", "4", "5", "6"],
    "correct_answers": ["4"],
    "tags": ["math", "easy"]
  }'
```

Expected: Question created, returns JSON with ID

Test getting all questions:
```bash
curl http://localhost:3000/api/questions
```

Expected: Array with the question you just created

**Step 4: Commit**

```bash
git add backend/routes/questions.js backend/index.js
git commit -m "feat: add questions CRUD API"
```

---

## Task 4: Tests API (CRUD without auth)

**Files:**
- Create: `backend/routes/tests.js`
- Modify: `backend/index.js`

**Step 1: Create tests routes**

Create `backend/routes/tests.js`:

```javascript
import express from 'express';
import { db } from '../db/index.js';
import { tests, testQuestions, questions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// GET all tests
router.get('/', async (req, res) => {
  try {
    const allTests = await db.select().from(tests);
    res.json({ tests: allTests, total: allTests.length });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// GET test by ID (admin view with questions)
router.get('/:id', async (req, res) => {
  try {
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.id, req.params.id));

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get questions for this test
    const testQuestionsData = await db
      .select({
        question_id: testQuestions.question_id,
        weight: testQuestions.weight,
        text: questions.text,
        type: questions.type,
        options: questions.options,
        tags: questions.tags
      })
      .from(testQuestions)
      .innerJoin(questions, eq(testQuestions.question_id, questions.id))
      .where(eq(testQuestions.test_id, req.params.id));

    res.json({ ...test, questions: testQuestionsData });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// GET test by slug (public view)
router.get('/slug/:slug', async (req, res) => {
  try {
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.slug, req.params.slug));

    if (!test || !test.is_enabled) {
      return res.status(404).json({ error: 'Test not found or disabled' });
    }

    // Count questions
    const questionCount = await db
      .select()
      .from(testQuestions)
      .where(eq(testQuestions.test_id, test.id));

    res.json({
      id: test.id,
      title: test.title,
      description: test.description,
      slug: test.slug,
      question_count: questionCount.length
    });
  } catch (error) {
    console.error('Error fetching test by slug:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// POST create test
router.post('/', async (req, res) => {
  try {
    const { title, description, slug, is_enabled } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newTest] = await db
      .insert(tests)
      .values({
        title,
        description,
        slug,
        is_enabled: is_enabled || false
      })
      .returning();

    res.status(201).json(newTest);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Test with this slug already exists' });
    }
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

// PUT update test
router.put('/:id', async (req, res) => {
  try {
    const { title, description, is_enabled } = req.body;

    const [updatedTest] = await db
      .update(tests)
      .set({
        title,
        description,
        is_enabled,
        updated_at: new Date()
      })
      .where(eq(tests.id, req.params.id))
      .returning();

    if (!updatedTest) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(updatedTest);
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// DELETE test
router.delete('/:id', async (req, res) => {
  try {
    const [deletedTest] = await db
      .delete(tests)
      .where(eq(tests.id, req.params.id))
      .returning();

    if (!deletedTest) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({ message: 'Test deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

// POST add questions to test
router.post('/:id/questions', async (req, res) => {
  try {
    const { questions: questionsToAdd } = req.body;

    if (!Array.isArray(questionsToAdd) || questionsToAdd.length === 0) {
      return res.status(400).json({ error: 'Invalid questions array' });
    }

    const values = questionsToAdd.map(q => ({
      test_id: req.params.id,
      question_id: q.question_id,
      weight: q.weight || 1
    }));

    await db.insert(testQuestions).values(values);

    res.json({ message: 'Questions added successfully', added: values.length });
  } catch (error) {
    console.error('Error adding questions to test:', error);
    res.status(500).json({ error: 'Failed to add questions to test' });
  }
});

export default router;
```

**Step 2: Register tests routes**

Modify `backend/index.js`:

```javascript
// ... previous imports
import testsRouter from './routes/tests.js';

// ... middleware

// API routes
app.use('/api/questions', questionsRouter);
app.use('/api/tests', testsRouter);

// ... rest of code
```

**Step 3: Test tests API**

Create a test:
```bash
curl -X POST http://localhost:3000/api/tests \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Math Test",
    "description": "Test your math skills",
    "slug": "sample-math-test",
    "is_enabled": true
  }'
```

Expected: Test created with ID

**Step 4: Add questions to test**

Use the test ID and question ID from previous steps:
```bash
curl -X POST http://localhost:3000/api/tests/{TEST_ID}/questions \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      { "question_id": "{QUESTION_ID}", "weight": 1 }
    ]
  }'
```

Expected: Questions added successfully

**Step 5: Test public slug endpoint**

```bash
curl http://localhost:3000/api/tests/slug/sample-math-test
```

Expected: Returns test info without correct answers

**Step 6: Commit**

```bash
git add backend/routes/tests.js backend/index.js
git commit -m "feat: add tests CRUD API"
```

---

## Task 5: Assessments API (Start, Answer, Submit)

**Files:**
- Create: `backend/routes/assessments.js`
- Modify: `backend/index.js`

**Step 1: Create assessments routes**

Create `backend/routes/assessments.js`:

```javascript
import express from 'express';
import { db } from '../db/index.js';
import { assessments, assessmentAnswers, tests, testQuestions, questions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// POST start assessment
router.post('/start', async (req, res) => {
  try {
    const { test_id, candidate_name } = req.body;

    if (!test_id || !candidate_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if test exists and is enabled
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.id, test_id));

    if (!test || !test.is_enabled) {
      return res.status(404).json({ error: 'Test not found or disabled' });
    }

    // Create assessment
    const [assessment] = await db
      .insert(assessments)
      .values({
        test_id,
        candidate_name,
        status: 'STARTED'
      })
      .returning();

    // Get all questions for this test (without correct answers)
    const testQuestionsData = await db
      .select({
        id: questions.id,
        text: questions.text,
        type: questions.type,
        options: questions.options,
        weight: testQuestions.weight
      })
      .from(testQuestions)
      .innerJoin(questions, eq(testQuestions.question_id, questions.id))
      .where(eq(testQuestions.test_id, test_id));

    // Add question numbers
    const questionsWithNumbers = testQuestionsData.map((q, index) => ({
      ...q,
      question_number: index + 1
    }));

    res.status(201).json({
      assessment_id: assessment.id,
      test: {
        id: test.id,
        title: test.title,
        description: test.description
      },
      questions: questionsWithNumbers,
      total_questions: questionsWithNumbers.length,
      started_at: assessment.started_at
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// POST submit answer
router.post('/:assessmentId/answer', async (req, res) => {
  try {
    const { question_id, selected_options } = req.body;
    const { assessmentId } = req.params;

    if (!question_id || !selected_options) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if assessment exists and is not completed
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, assessmentId));

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (assessment.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Assessment already completed' });
    }

    // Check if answer already exists (update) or create new
    const [existingAnswer] = await db
      .select()
      .from(assessmentAnswers)
      .where(
        and(
          eq(assessmentAnswers.assessment_id, assessmentId),
          eq(assessmentAnswers.question_id, question_id)
        )
      );

    if (existingAnswer) {
      // Update existing answer
      await db
        .update(assessmentAnswers)
        .set({
          selected_options,
          answered_at: new Date()
        })
        .where(eq(assessmentAnswers.id, existingAnswer.id));
    } else {
      // Create new answer
      await db
        .insert(assessmentAnswers)
        .values({
          assessment_id: assessmentId,
          question_id,
          selected_options
        });
    }

    // Count answered questions
    const answeredQuestions = await db
      .select()
      .from(assessmentAnswers)
      .where(eq(assessmentAnswers.assessment_id, assessmentId));

    // Get total questions for this test
    const totalQuestions = await db
      .select()
      .from(testQuestions)
      .where(eq(testQuestions.test_id, assessment.test_id));

    res.json({
      message: 'Answer recorded',
      question_id,
      answered_questions: answeredQuestions.length,
      total_questions: totalQuestions.length
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// POST submit assessment (finalize and score)
router.post('/:assessmentId/submit', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get assessment
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, assessmentId));

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (assessment.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Assessment already completed' });
    }

    // Get all answers for this assessment
    const answers = await db
      .select({
        id: assessmentAnswers.id,
        question_id: assessmentAnswers.question_id,
        selected_options: assessmentAnswers.selected_options,
        correct_answers: questions.correct_answers,
        type: questions.type,
        weight: testQuestions.weight
      })
      .from(assessmentAnswers)
      .innerJoin(questions, eq(assessmentAnswers.question_id, questions.id))
      .innerJoin(testQuestions,
        and(
          eq(testQuestions.question_id, questions.id),
          eq(testQuestions.test_id, assessment.test_id)
        )
      )
      .where(eq(assessmentAnswers.assessment_id, assessmentId));

    // Calculate scores and update is_correct
    let totalScore = 0;
    let maxScore = 0;

    for (const answer of answers) {
      maxScore += answer.weight;

      // Check if answer is correct
      let isCorrect = false;

      if (answer.type === 'SINGLE') {
        isCorrect = answer.selected_options.length === 1 &&
                   answer.correct_answers.includes(answer.selected_options[0]);
      } else { // MULTIPLE
        const selectedSorted = [...answer.selected_options].sort();
        const correctSorted = [...answer.correct_answers].sort();
        isCorrect = JSON.stringify(selectedSorted) === JSON.stringify(correctSorted);
      }

      if (isCorrect) {
        totalScore += answer.weight;
      }

      // Update answer with is_correct
      await db
        .update(assessmentAnswers)
        .set({ is_correct: isCorrect })
        .where(eq(assessmentAnswers.id, answer.id));
    }

    // Calculate percentage
    const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Update assessment
    const [updatedAssessment] = await db
      .update(assessments)
      .set({
        status: 'COMPLETED',
        score_percentage: scorePercentage.toFixed(2),
        completed_at: new Date()
      })
      .where(eq(assessments.id, assessmentId))
      .returning();

    res.json({
      assessment_id: assessmentId,
      score_percentage: parseFloat(updatedAssessment.score_percentage),
      total_questions: answers.length,
      status: 'COMPLETED',
      completed_at: updatedAssessment.completed_at
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

export default router;
```

**Step 2: Register assessments routes**

Modify `backend/index.js`:

```javascript
// ... previous imports
import assessmentsRouter from './routes/assessments.js';

// ... middleware

// API routes
app.use('/api/questions', questionsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/assessments', assessmentsRouter);

// ... rest of code
```

**Step 3: Test assessment flow**

Start assessment:
```bash
curl -X POST http://localhost:3000/api/assessments/start \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "{TEST_ID}",
    "candidate_name": "Test User"
  }'
```

Expected: Returns assessment_id and questions

Submit answer (use assessment_id and question_id from above):
```bash
curl -X POST http://localhost:3000/api/assessments/{ASSESSMENT_ID}/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": "{QUESTION_ID}",
    "selected_options": ["4"]
  }'
```

Expected: Answer recorded

Submit assessment:
```bash
curl -X POST http://localhost:3000/api/assessments/{ASSESSMENT_ID}/submit \
  -H "Content-Type: application/json"
```

Expected: Returns score_percentage

**Step 4: Commit**

```bash
git add backend/routes/assessments.js backend/index.js
git commit -m "feat: add assessments API (start, answer, submit)"
```

---

## Task 6: Frontend Foundation - Vite + React + Tailwind

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/index.css`
- Create: `frontend/.env.example`

**Step 1: Create frontend package.json**

```json
{
  "name": "cleverbadge-frontend",
  "version": "0.1.0",
  "description": "Clever Badge Frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "vite": "^5.0.5"
  }
}
```

**Step 2: Install frontend dependencies**

Run: `cd frontend && npm install`
Expected: All packages installed

**Step 3: Create .env.example**

```env
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

**Step 4: Create Vite configuration**

Create `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(packageJson.version)
  }
});
```

**Step 5: Create Tailwind configuration**

Create `frontend/tailwind.config.js`:

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1D4E5A',
        accent: {
          DEFAULT: '#B55C34',
          dark: '#853F21',
          light: '#D98C63'
        },
        tech: '#4DA6C0',
        circuit: '#2A6373'
      }
    }
  },
  plugins: []
};
```

Create `frontend/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

**Step 6: Create HTML entry point**

Create `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clever Badge</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Step 7: Create base CSS with Tailwind**

Create `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 8: Create React entry point**

Create `frontend/src/main.jsx`:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 9: Create minimal App component**

Create `frontend/src/App.jsx`:

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-primary mb-4">
                  Clever Badge
                </h1>
                <p className="text-gray-600">
                  Frontend v{import.meta.env.VITE_VERSION}
                </p>
                <p className="text-gray-600">
                  Environment: {import.meta.env.VITE_ENV}
                </p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

**Step 10: Test frontend**

Run: `npm run dev`
Expected: Dev server starts on http://localhost:5173

Visit: http://localhost:5173
Expected: See "Clever Badge" heading with version

**Step 11: Commit**

```bash
git add frontend/
git commit -m "feat: add Vite + React + Tailwind frontend foundation"
```

---

## Task 7: Environment Banner Component

**Files:**
- Create: `frontend/src/components/EnvironmentBanner.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Create EnvironmentBanner component**

Create `frontend/src/components/EnvironmentBanner.jsx`:

```javascript
import React from 'react';

const EnvironmentBanner = () => {
  const environment = import.meta.env.VITE_ENV || 'development';

  // Don't show banner in production
  if (environment === 'production') {
    return null;
  }

  // Color based on environment
  const colors = {
    development: 'bg-yellow-400 text-yellow-900',
    testing: 'bg-blue-400 text-blue-900',
    staging: 'bg-purple-400 text-purple-900'
  };

  const bgColor = colors[environment] || colors.development;

  return (
    <div className={`${bgColor} py-2 px-4 text-center text-sm font-semibold`}>
      {environment.toUpperCase()} ENVIRONMENT
    </div>
  );
};

export default EnvironmentBanner;
```

**Step 2: Add banner to App**

Modify `frontend/src/App.jsx`:

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <EnvironmentBanner />
        <Routes>
          <Route path="/" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-primary mb-4">
                  Clever Badge
                </h1>
                <p className="text-gray-600">
                  Frontend v{import.meta.env.VITE_VERSION}
                </p>
                <p className="text-gray-600">
                  Environment: {import.meta.env.VITE_ENV}
                </p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

**Step 3: Test banner**

Visit: http://localhost:5173
Expected: Yellow banner at top showing "DEVELOPMENT ENVIRONMENT"

**Step 4: Commit**

```bash
git add frontend/src/components/EnvironmentBanner.jsx frontend/src/App.jsx
git commit -m "feat: add environment banner component"
```

---

## Task 8: Footer Component with Version Display

**Files:**
- Create: `frontend/src/components/Footer.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Create Footer component**

Create `frontend/src/components/Footer.jsx`:

```javascript
import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [backendVersion, setBackendVersion] = useState('...');
  const [backendEnv, setBackendEnv] = useState('...');
  const frontendVersion = import.meta.env.VITE_VERSION;
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Fetch backend version from health endpoint
    fetch(`${apiUrl}/health`)
      .then(res => res.json())
      .then(data => {
        setBackendVersion(data.version || 'unknown');
        setBackendEnv(data.environment || 'unknown');
      })
      .catch(err => {
        console.error('Failed to fetch backend version:', err);
        setBackendVersion('error');
        setBackendEnv('error');
      });
  }, [apiUrl]);

  return (
    <footer className="bg-gray-800 text-gray-300 py-4 px-6 text-center text-sm">
      <p>
        Copyright Clever Badge 2025 - Frontend: v{frontendVersion} - Backend: v{backendVersion} ({backendEnv})
      </p>
    </footer>
  );
};

export default Footer;
```

**Step 2: Add Footer to App**

Modify `frontend/src/App.jsx`:

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <EnvironmentBanner />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={
              <div className="flex items-center justify-center min-h-full">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-primary mb-4">
                    Clever Badge
                  </h1>
                  <p className="text-gray-600">
                    Frontend v{import.meta.env.VITE_VERSION}
                  </p>
                  <p className="text-gray-600">
                    Environment: {import.meta.env.VITE_ENV}
                  </p>
                </div>
              </div>
            } />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
```

**Step 3: Test footer**

Make sure backend is running on http://localhost:3000

Visit: http://localhost:5173
Expected: Footer at bottom showing "Frontend: v0.1.0 - Backend: v0.1.0 (development)"

**Step 4: Commit**

```bash
git add frontend/src/components/Footer.jsx frontend/src/App.jsx
git commit -m "feat: add footer with version display"
```

---

## Task 9: Test Landing Page

**Files:**
- Create: `frontend/src/pages/TestLanding.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Create TestLanding page**

Create `frontend/src/pages/TestLanding.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TestLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [candidateName, setCandidateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Fetch test by slug
    fetch(`${apiUrl}/api/tests/slug/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Test not found or disabled');
        return res.json();
      })
      .then(data => {
        setTest(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug, apiUrl]);

  const handleStart = async (e) => {
    e.preventDefault();

    if (!candidateName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      // Start assessment
      const response = await fetch(`${apiUrl}/api/assessments/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: test.id,
          candidate_name: candidateName.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to start assessment');

      const data = await response.json();

      // Navigate to question runner with state
      navigate(`/t/${slug}/run`, {
        state: {
          assessmentId: data.assessment_id,
          questions: data.questions,
          candidateName: candidateName.trim()
        }
      });
    } catch (err) {
      alert('Failed to start test: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading test...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {test.title}
        </h1>

        {test.description && (
          <p className="text-gray-600 mb-6">
            {test.description}
          </p>
        )}

        <div className="bg-blue-50 border-l-4 border-tech p-4 mb-6">
          <p className="text-sm text-gray-700">
            <strong>Questions:</strong> {test.question_count}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Format:</strong> One question at a time
          </p>
        </div>

        <form onSubmit={handleStart}>
          <div className="mb-6">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tech"
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-tech hover:bg-tech/90 text-white font-semibold py-3 px-6 rounded-md transition-colors"
          >
            Start Test
          </button>
        </form>
      </div>
    </div>
  );
};

export default TestLanding;
```

**Step 2: Add route to App**

Modify `frontend/src/App.jsx`:

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import TestLanding from './pages/TestLanding';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <EnvironmentBanner />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={
              <div className="flex items-center justify-center min-h-full">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-primary mb-4">
                    Clever Badge
                  </h1>
                  <p className="text-gray-600">
                    Online Skills Assessment Platform
                  </p>
                </div>
              </div>
            } />
            <Route path="/t/:slug" element={<TestLanding />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
```

**Step 3: Test landing page**

Visit: http://localhost:5173/t/sample-math-test
Expected:
- See test title and description
- See question count
- Input field for candidate name
- Start Test button

**Step 4: Commit**

```bash
git add frontend/src/pages/TestLanding.jsx frontend/src/App.jsx
git commit -m "feat: add test landing page"
```

---

## Task 10: Question Runner Page

**Files:**
- Create: `frontend/src/pages/QuestionRunner.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Create QuestionRunner page**

Create `frontend/src/pages/QuestionRunner.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const QuestionRunner = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Get data from navigation state
  const { assessmentId, questions, candidateName } = location.state || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Redirect if no state
  useEffect(() => {
    if (!assessmentId || !questions) {
      navigate(`/t/${slug}`);
    }
  }, [assessmentId, questions, slug, navigate]);

  if (!questions || questions.length === 0) {
    return <div>Loading...</div>;
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Get current answer
  const currentAnswer = answers[currentQuestion.id] || [];

  const handleOptionChange = (option) => {
    if (currentQuestion.type === 'SINGLE') {
      // Single choice - replace selection
      setAnswers({
        ...answers,
        [currentQuestion.id]: [option]
      });
    } else {
      // Multiple choice - toggle selection
      const current = answers[currentQuestion.id] || [];
      if (current.includes(option)) {
        setAnswers({
          ...answers,
          [currentQuestion.id]: current.filter(o => o !== option)
        });
      } else {
        setAnswers({
          ...answers,
          [currentQuestion.id]: [...current, option]
        });
      }
    }
  };

  const saveAnswer = async () => {
    const selectedOptions = answers[currentQuestion.id] || [];

    if (selectedOptions.length === 0) {
      return; // Don't save empty answers
    }

    try {
      await fetch(`${apiUrl}/api/assessments/${assessmentId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_options: selectedOptions
        })
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
    }
  };

  const handleNext = async () => {
    await saveAnswer();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit your test? You cannot change your answers after submission.')) {
      return;
    }

    setSubmitting(true);

    // Save current answer
    await saveAnswer();

    try {
      // Submit assessment
      const response = await fetch(`${apiUrl}/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to submit assessment');

      const data = await response.json();

      // Navigate to results page
      navigate(`/t/${slug}/result`, {
        state: {
          score: data.score_percentage,
          candidateName
        }
      });
    } catch (err) {
      alert('Failed to submit test: ' + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">
            {candidateName}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-tech h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = currentAnswer.includes(option);
            const inputType = currentQuestion.type === 'SINGLE' ? 'radio' : 'checkbox';

            return (
              <label
                key={index}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-tech bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type={inputType}
                  name={`question-${currentQuestion.id}`}
                  checked={isSelected}
                  onChange={() => handleOptionChange(option)}
                  className="mr-3"
                />
                <span className="text-gray-800">{option}</span>
              </label>
            );
          })}
        </div>

        {currentQuestion.type === 'MULTIPLE' && (
          <p className="text-sm text-gray-500 mt-4">
            Select all that apply
          </p>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-2 bg-accent hover:bg-accent-dark text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-tech hover:bg-tech/90 text-white font-semibold rounded-md"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionRunner;
```

**Step 2: Add route to App**

Modify `frontend/src/App.jsx`:

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import TestLanding from './pages/TestLanding';
import QuestionRunner from './pages/QuestionRunner';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <EnvironmentBanner />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={
              <div className="flex items-center justify-center min-h-full">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-primary mb-4">
                    Clever Badge
                  </h1>
                  <p className="text-gray-600">
                    Online Skills Assessment Platform
                  </p>
                </div>
              </div>
            } />
            <Route path="/t/:slug" element={<TestLanding />} />
            <Route path="/t/:slug/run" element={<QuestionRunner />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
```

**Step 3: Test question runner**

1. Visit: http://localhost:5173/t/sample-math-test
2. Enter your name and click "Start Test"
3. Expected: Question runner page with first question
4. Try selecting answers (radio for SINGLE, checkboxes for MULTIPLE)
5. Click "Next" to go to next question
6. Click "Previous" to go back
7. Progress bar should update

**Step 4: Commit**

```bash
git add frontend/src/pages/QuestionRunner.jsx frontend/src/App.jsx
git commit -m "feat: add question runner page with navigation"
```

---

## Task 11: Results Page

**Files:**
- Create: `frontend/src/pages/TestResults.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Create TestResults page**

Create `frontend/src/pages/TestResults.jsx`:

```javascript
import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

const TestResults = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from navigation state
  const { score, candidateName } = location.state || {};

  // Redirect if no state
  if (score === undefined) {
    navigate(`/t/${slug}`);
    return null;
  }

  const scoreNum = parseFloat(score);

  // Determine result status
  let status = 'passed';
  let statusColor = 'text-green-600';
  let statusBg = 'bg-green-50';
  let statusBorder = 'border-green-200';

  if (scoreNum < 50) {
    status = 'needs improvement';
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusBorder = 'border-red-200';
  } else if (scoreNum < 75) {
    status = 'good';
    statusColor = 'text-yellow-600';
    statusBg = 'bg-yellow-50';
    statusBorder = 'border-yellow-200';
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="w-20 h-20 mx-auto text-tech"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Test Completed!
        </h1>

        <p className="text-gray-600 mb-8">
          Thank you, {candidateName}
        </p>

        <div className={`${statusBg} ${statusBorder} border-2 rounded-lg p-8 mb-6`}>
          <div className="text-6xl font-bold text-primary mb-2">
            {scoreNum.toFixed(1)}%
          </div>
          <div className={`text-xl font-semibold ${statusColor}`}>
            {status.toUpperCase()}
          </div>
        </div>

        <div className="text-gray-600">
          <p>Your score has been recorded.</p>
          <p className="mt-2 text-sm">
            You may close this page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
```

**Step 2: Add route to App**

Modify `frontend/src/App.jsx`:

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import TestLanding from './pages/TestLanding';
import QuestionRunner from './pages/QuestionRunner';
import TestResults from './pages/TestResults';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <EnvironmentBanner />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={
              <div className="flex items-center justify-center min-h-full">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-primary mb-4">
                    Clever Badge
                  </h1>
                  <p className="text-gray-600">
                    Online Skills Assessment Platform
                  </p>
                </div>
              </div>
            } />
            <Route path="/t/:slug" element={<TestLanding />} />
            <Route path="/t/:slug/run" element={<QuestionRunner />} />
            <Route path="/t/:slug/result" element={<TestResults />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
```

**Step 3: Test complete flow**

1. Start fresh: Visit http://localhost:5173/t/sample-math-test
2. Enter name and start test
3. Answer all questions
4. Click "Submit Test" on last question
5. Confirm submission
6. Expected: Results page showing score percentage and status

**Step 4: Commit**

```bash
git add frontend/src/pages/TestResults.jsx frontend/src/App.jsx
git commit -m "feat: add test results page"
```

---

## Task 12: Final Testing & Version Update

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

**Step 1: Verify all features work**

Backend:
- Health endpoint returns version and environment
- Questions CRUD works
- Tests CRUD works
- Assessments start/answer/submit works

Frontend:
- Environment banner shows (yellow for development)
- Footer shows both versions
- Test landing page loads
- Question runner works with prev/next
- Results page shows score

**Step 2: Confirm versions are 0.1.0**

Check `backend/package.json` and `frontend/package.json` both show `"version": "0.1.0"`

**Step 3: Create test data via API**

Create at least 3 questions and 1 test for manual testing

**Step 4: Full end-to-end test**

1. Create questions via API
2. Create test via API
3. Add questions to test via API
4. Enable test via API
5. Take test as candidate via frontend
6. Verify score calculated correctly

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1 complete - version 0.1.0"
git tag v0.1.0
```

---

## Success Criteria

- ✅ Backend server running on port 3000
- ✅ Database connected with schema-aware connection
- ✅ Health endpoint returns version and environment
- ✅ Questions CRUD API works (no auth)
- ✅ Tests CRUD API works (no auth)
- ✅ Assessments API works (start, answer, submit)
- ✅ Scoring logic works for SINGLE and MULTIPLE choice
- ✅ Frontend running on port 5173
- ✅ Environment banner displays (yellow for development)
- ✅ Footer shows both frontend and backend versions
- ✅ Test landing page works
- ✅ Question runner works with navigation
- ✅ Results page shows final score
- ✅ Complete end-to-end flow functional
- ✅ Both package.json files show version 0.1.0

---

## Next Steps (Phase 2)

After Phase 1 is complete and tested:
- Add admin authentication (argon2 + JWT)
- Add auth middleware to protect admin endpoints
- Create admin login page
- Add test enable/disable functionality
- Deploy to Render testing environment

---

## Notes

- No authentication in Phase 1 - all endpoints are public
- Use curl or Bruno for API testing
- Focus on getting the core flow working end-to-end
- Keep code simple and clear
- Test each task before moving to the next
- Commit frequently with clear messages

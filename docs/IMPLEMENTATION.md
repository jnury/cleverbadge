# Implementation Guide

Complete implementation guide for Clever Badge MVP.

## Tech Stack

### Backend
- **Runtime**: Node.js (JavaScript, no TypeScript)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: argon2 + JWT (admin only)
- **Validation**: express-validator
- **Environment**: dotenv (local dev), Render dashboard (production)

### Frontend
- **Build Tool**: Vite
- **Framework**: React (JavaScript, no TypeScript)
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State**: React Router navigation state (no global state library)

### Deployment
- **Platform**: Render.com
- **Services**: 2 web services (backend + static frontend) + 1 PostgreSQL database
- **Tier**: Free tier for MVP

---

## Project Structure

```
CleverBadge/
├── backend/
│   ├── db/
│   │   └── schema.js          # Drizzle schema definitions
│   ├── routes/
│   │   ├── auth.js            # Login endpoint
│   │   ├── questions.js       # Question CRUD + YAML import
│   │   ├── tests.js           # Test CRUD + enable/disable
│   │   ├── assessments.js     # Start, answer, submit endpoints
│   │   └── analytics.js       # Question success rate stats
│   ├── middleware/
│   │   ├── auth.js            # JWT verification middleware
│   │   └── validation.js      # express-validator helpers
│   ├── utils/
│   │   ├── jwt.js             # JWT sign/verify functions
│   │   └── password.js        # argon2 hash/verify functions
│   ├── index.js               # Express server entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/           # Reusable UI components
│   │   ├── pages/
│   │   │   ├── candidate/   # Test landing, runner, results
│   │   │   └── admin/       # Dashboard, login
│   │   ├── App.jsx          # React Router setup
│   │   └── main.jsx         # Entry point
│   ├── package.json
│   └── .env.example
```

---

## Implementation Steps

### Phase 1: Backend Foundation

#### 1.0 Local Database Setup (First Time Only)

**Create PostgreSQL database and users:**

```bash
# Connect to PostgreSQL as superuser
psql postgres

# Create database
CREATE DATABASE cleverbadge;

# Create admin user (for migrations)
CREATE USER cleverbadge_admin WITH PASSWORD 'admin_dev_password';
GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;

# Create development runtime user
CREATE USER cleverbadge_dev WITH PASSWORD 'dev_password';

# Connect to the database
\c cleverbadge

# Create development schema
CREATE SCHEMA IF NOT EXISTS development;

# Grant admin full access to development schema
GRANT ALL PRIVILEGES ON SCHEMA development TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA development TO cleverbadge_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT ALL ON TABLES TO cleverbadge_admin;

# Grant runtime user limited access (data only, no schema changes)
GRANT USAGE ON SCHEMA development TO cleverbadge_dev;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_dev;

# Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT USAGE ON SEQUENCES TO cleverbadge_dev;

# Verify
\du
\dn
\q
```

**User Summary:**
- `cleverbadge_admin`: Full privileges, use for migrations only
- `cleverbadge_dev`: Data access only, use for runtime

#### 1.1 Initialize Backend Project

```bash
cd backend
npm init -y
npm install express dotenv cors drizzle-orm postgres
npm install -D nodemon drizzle-kit
```

**Create `backend/package.json` scripts:**
```json
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

**Create `backend/.env.example`:**
```env
# Runtime database connection (environment-specific user, data access only)
DATABASE_URL="postgresql://cleverbadge_dev:password@localhost:5432/cleverbadge"

# Environment (also determines database schema automatically)
NODE_ENV="development"

# Server configuration
PORT=3000
JWT_SECRET="your_jwt_secret_change_in_production"

# MIGRATIONS ONLY - DO NOT USE IN RUNTIME!
# Uncomment temporarily when running npm run db:push
# DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:admin_password@localhost:5432/cleverbadge"
```

**CRITICAL - Database User Security:**

**Runtime Connection (`DATABASE_URL`):**
- MUST use environment-specific user (cleverbadge_dev, cleverbadge_staging, cleverbadge_prod)
- These users have **READ/WRITE permissions ONLY**
- CANNOT create/alter/drop tables (prevents accidental schema changes)
- Can only access their designated schema

**Migration Connection (`DATABASE_ADMIN_URL`):**
- Uses `cleverbadge_admin` user with **FULL privileges**
- Used ONLY for `npm run db:push` (schema migrations)
- **NEVER use admin user for runtime application**
- Keep commented out in .env, uncomment only when running migrations

**Environment Configuration:**
- `NODE_ENV`: Controls environment AND database schema (development, staging, production)
  - `NODE_ENV=development` → uses `development` schema + `cleverbadge_dev` user
  - `NODE_ENV=staging` → uses `staging` schema + `cleverbadge_staging` user
  - `NODE_ENV=production` → uses `production` schema + `cleverbadge_prod` user
- **Schema is automatically derived from NODE_ENV** - no separate DB_SCHEMA variable
- This ensures you can never accidentally mix environments and schemas
- All environments can share same Render PostgreSQL instance using different schemas

#### 1.2 Setup Express Server

**Create `backend/index.js`:**
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const VERSION = packageJson.version;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://cleverbadge.com', 'https://www.cleverbadge.com']
    : 'http://localhost:5173'
}));
app.use(express.json());

// Health check - returns version and environment
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: VERSION,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes (to be added)
// app.use('/api/auth', authRoutes);
// app.use('/api/questions', questionRoutes);
// app.use('/api/tests', testRoutes);
// app.use('/api/assessments', assessmentRoutes);
// app.use('/api/tests/:testId/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (v${VERSION}, ${process.env.NODE_ENV})`);
});
```

#### 1.3 Define Drizzle Schema

**Create `backend/db/schema.js`:**
```javascript
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, json, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const questionTypeEnum = pgEnum('question_type', ['SINGLE', 'MULTIPLE']);
export const assessmentStatusEnum = pgEnum('assessment_status', ['STARTED', 'COMPLETED']);

// Users table
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

**Create `backend/drizzle.config.js`:**
```javascript
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

// For migrations, use admin URL if provided, otherwise fall back to regular URL
// IMPORTANT: Only use DATABASE_ADMIN_URL when running npm run db:push
const dbUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;

// Schema is determined by NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv; // development, testing, staging, or production

if (!process.env.DATABASE_ADMIN_URL) {
  console.warn('⚠️  WARNING: Using DATABASE_URL for migrations.');
  console.warn('⚠️  For schema changes, set DATABASE_ADMIN_URL to use admin user.');
}

console.log(`🗄️  Using schema: ${dbSchema} (from NODE_ENV=${nodeEnv})`);

export default defineConfig({
  schema: './db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl
  },
  schemaFilter: [dbSchema]
});
```

**Create `backend/db/index.js`:**
```javascript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

// Schema is automatically determined from NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const dbSchema = nodeEnv; // development, testing, staging, or production

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log(`🗄️  Database: Connecting to schema "${dbSchema}" (NODE_ENV=${nodeEnv})`);

const client = postgres(connectionString, {
  onnotice: () => {}, // Suppress notices
  prepare: false,
  connection: {
    search_path: dbSchema // Set search path to use specific schema
  }
});

export const db = drizzle(client, { schema });
export const currentSchema = dbSchema;
```

**Note on Schema Isolation:**
- Each environment uses its own PostgreSQL schema, automatically determined from `NODE_ENV`
- `NODE_ENV=development` → `development` schema
- `NODE_ENV=staging` → `staging` schema
- `NODE_ENV=production` → `production` schema
- This ensures you can never accidentally mix environments
- Multiple environments share the same database instance on Render
- Before first use in each environment, create the schema:
  ```sql
  CREATE SCHEMA IF NOT EXISTS development;
  CREATE SCHEMA IF NOT EXISTS staging;
  CREATE SCHEMA IF NOT EXISTS production;
  ```

#### 1.4 Create Utility Functions

**Create `backend/utils/password.js`:**
```javascript
import argon2 from 'argon2';

export async function hashPassword(password) {
  return await argon2.hash(password);
}

export async function verifyPassword(hash, password) {
  return await argon2.verify(hash, password);
}
```

**Install argon2:**
```bash
npm install argon2
```

**Create `backend/utils/jwt.js`:**
```javascript
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
```

**Install jsonwebtoken:**
```bash
npm install jsonwebtoken
```

#### 1.5 Create Middleware

**Create `backend/middleware/auth.js`:**
```javascript
import { verifyToken } from '../utils/jwt.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}
```

**Create `backend/middleware/validation.js`:**
```javascript
import { validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}
```

**Install express-validator:**
```bash
npm install express-validator
```

#### 1.6 Create Admin User Script

**Create `backend/scripts/createAdmin.js`:**
```javascript
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { hashPassword } from '../utils/password.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    const username = await question('Enter admin username: ');
    const password = await question('Enter admin password: ');

    const passwordHash = await hashPassword(password);

    const [admin] = await db.insert(users).values({
      username,
      password_hash: passwordHash
    }).returning();

    console.log('Admin user created successfully!');
    console.log('Username:', admin.username);
    console.log('ID:', admin.id);
  } catch (error) {
    console.error('Error creating admin:', error.message);
  } finally {
    rl.close();
    process.exit();
  }
}

createAdmin();
```

**Add script to package.json:**
```json
{
  "scripts": {
    "create-admin": "node scripts/createAdmin.js"
  }
}
```

---

### Phase 2: API Routes

#### 2.1 Authentication Routes

**Create `backend/routes/auth.js`:**
```javascript
import express from 'express';
import { body } from 'express-validator';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

router.post('/login',
  body('username').isString().trim().isLength({ min: 3, max: 50 }),
  body('password').isString().isLength({ min: 6 }),
  validate,
  async (req, res) => {
    try {
      const { username, password } = req.body;

      const [user] = await db.select().from(users).where(eq(users.username, username));

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await verifyPassword(user.password_hash, password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = signToken({
        id: user.id,
        username: user.username
      });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
```

#### 2.2 Questions Routes

**Create `backend/routes/questions.js`:**
```javascript
import express from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import { db } from '../db/index.js';
import { questions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Import questions from YAML
router.post('/import',
  authenticateToken,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileContent = await fs.readFile(req.file.path, 'utf8');
      const data = yaml.load(fileContent);

      if (!data.questions || !Array.isArray(data.questions)) {
        return res.status(400).json({ error: 'Invalid YAML format' });
      }

      // Validate and insert questions
      const insertedQuestions = [];
      for (const q of data.questions) {
        // Validation
        if (!q.text || !q.type || !q.options || !q.correct_answers) {
          throw new Error('Missing required fields in question');
        }

        if (!['SINGLE', 'MULTIPLE'].includes(q.type)) {
          throw new Error('Invalid question type');
        }

        const [inserted] = await db.insert(questions).values({
          text: q.text,
          type: q.type,
          options: q.options,
          correct_answers: q.correct_answers,
          tags: q.tags || null
        }).returning();

        insertedQuestions.push(inserted);
      }

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      res.status(201).json({
        imported: insertedQuestions.length,
        questions: insertedQuestions
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Get all questions
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const allQuestions = await db.select().from(questions);
      res.json({ questions: allQuestions });
    } catch (error) {
      console.error('Get questions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete question
router.delete('/:id',
  authenticateToken,
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const [deleted] = await db.delete(questions)
        .where(eq(questions.id, req.params.id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json({ message: 'Question deleted successfully', id: deleted.id });
    } catch (error) {
      console.error('Delete question error:', error);
      if (error.code === '23503') { // Foreign key violation
        return res.status(409).json({ error: 'Cannot delete question: currently used in tests' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
```

**Install dependencies:**
```bash
npm install multer js-yaml
```

#### 2.3 Tests Routes

See `docs/API.md` for complete endpoint specifications. Implementation follows similar patterns:
- Use express-validator for input validation
- Use authenticateToken middleware for protected routes
- Use Drizzle ORM for database operations
- Return appropriate HTTP status codes

#### 2.4 Assessments Routes

See `docs/API.md` for complete endpoint specifications.

**Key implementation notes:**
- Start assessment: Create assessment record and return questions (without correct_answers)
- Submit answer: Upsert assessment_answer record
- Submit assessment: Calculate score using weighted scoring logic, update assessment status

**Scoring logic example:**
```javascript
// Calculate score
const answers = await db.select().from(assessmentAnswers)
  .where(eq(assessmentAnswers.assessment_id, assessmentId));

let totalScore = 0;
let maxScore = 0;

for (const answer of answers) {
  const question = await db.select().from(questions)
    .where(eq(questions.id, answer.question_id));

  const testQuestion = await db.select().from(testQuestions)
    .where(eq(testQuestions.question_id, answer.question_id));

  const weight = testQuestion[0].weight;
  maxScore += weight;

  // Check if answer is correct
  let isCorrect = false;
  if (question[0].type === 'SINGLE') {
    isCorrect = answer.selected_options.length === 1 &&
                question[0].correct_answers.includes(answer.selected_options[0]);
  } else { // MULTIPLE
    const sorted1 = [...answer.selected_options].sort();
    const sorted2 = [...question[0].correct_answers].sort();
    isCorrect = JSON.stringify(sorted1) === JSON.stringify(sorted2);
  }

  if (isCorrect) {
    totalScore += weight;
  }

  // Update answer with is_correct
  await db.update(assessmentAnswers)
    .set({ is_correct: isCorrect })
    .where(eq(assessmentAnswers.id, answer.id));
}

const scorePercentage = (totalScore / maxScore) * 100;

// Update assessment
await db.update(assessments)
  .set({
    score_percentage: scorePercentage,
    status: 'COMPLETED',
    completed_at: new Date()
  })
  .where(eq(assessments.id, assessmentId));
```

#### 2.5 Analytics Routes

**Create `backend/routes/analytics.js`:**

Implement question success rate calculation per test. Query all completed assessments for a test, calculate success rate for each question.

---

### Phase 3: Frontend Foundation

#### 3.1 Initialize Frontend Project

```bash
cd frontend
npm create vite@latest . -- --template react
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 3.2 Configure Tailwind

**Update `frontend/tailwind.config.js`:**
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#1D4E5A',
        'accent': '#B55C34',
        'accent-dark': '#853F21',
        'accent-light': '#D98C63',
        'tech-blue': '#4DA6C0',
        'circuit-blue': '#2A6373',
      }
    },
  },
  plugins: [],
}
```

**Update `frontend/src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### 3.3 Setup React Router

**Create `frontend/src/App.jsx`:**
```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TestLanding from './pages/candidate/TestLanding';
import QuestionRunner from './pages/candidate/QuestionRunner';
import TestResult from './pages/candidate/TestResult';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Candidate routes */}
        <Route path="/t/:slug" element={<TestLanding />} />
        <Route path="/t/:slug/run" element={<QuestionRunner />} />
        <Route path="/t/:slug/result" element={<TestResult />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

#### 3.4 Create API Helper

**Create `frontend/src/utils/api.js`:**
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}
```

**Create `frontend/.env.example`:**
```env
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

---

### Phase 4: Frontend Pages

#### 4.1 Environment Banner Component

**Create `frontend/src/components/EnvironmentBanner.jsx`:**
```javascript
function EnvironmentBanner() {
  const env = import.meta.env.VITE_ENV || 'development';

  // Don't show banner in production
  if (env === 'production') {
    return null;
  }

  const envColors = {
    development: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    staging: 'bg-purple-100 text-purple-800 border-purple-300'
  };

  const colorClass = envColors[env] || envColors.development;

  return (
    <div className={`w-full py-1 px-4 text-center text-sm border-b ${colorClass}`}>
      <strong>Environment: {env.toUpperCase()}</strong>
    </div>
  );
}

export default EnvironmentBanner;
```

#### 4.2 Footer Component

**Create `frontend/src/components/Footer.jsx`:**
```javascript
import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

function Footer() {
  const [backendVersion, setBackendVersion] = useState('...');
  const frontendVersion = import.meta.env.VITE_VERSION || '0.0.0';

  useEffect(() => {
    // Fetch backend version from health endpoint
    async function fetchBackendVersion() {
      try {
        const health = await fetch(import.meta.env.VITE_API_URL + '/health');
        const data = await health.json();
        setBackendVersion(data.version || 'unknown');
      } catch (error) {
        setBackendVersion('unavailable');
      }
    }

    fetchBackendVersion();
  }, []);

  return (
    <footer className="w-full py-4 px-4 text-center text-sm text-gray-600 border-t border-gray-200 mt-auto">
      <p>
        Copyright Clever Badge 2025 - Frontend: v{frontendVersion} - Backend: v{backendVersion}
      </p>
    </footer>
  );
}

export default Footer;
```

#### 4.3 Update App.jsx with Banner and Footer

**Update `frontend/src/App.jsx`:**
```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import TestLanding from './pages/candidate/TestLanding';
import QuestionRunner from './pages/candidate/QuestionRunner';
import TestResult from './pages/candidate/TestResult';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <EnvironmentBanner />

        <main className="flex-1">
          <Routes>
            {/* Candidate routes */}
            <Route path="/t/:slug" element={<TestLanding />} />
            <Route path="/t/:slug/run" element={<QuestionRunner />} />
            <Route path="/t/:slug/result" element={<TestResult />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
```

#### 4.4 Version Injection at Build Time

**Update `frontend/package.json`:**
```json
{
  "name": "cleverbadge-frontend",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Create `frontend/vite.config.js`:**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(packageJson.version)
  }
});
```

#### 4.5 Candidate Pages

Implement:
- **TestLanding**: Fetch test by slug, show info, name input form
- **QuestionRunner**: Display questions one at a time, prev/next navigation, progress bar
- **TestResult**: Show final score percentage

**Note:** All pages will automatically include the environment banner (top) and footer (bottom) via App.jsx layout.

#### 4.6 Admin Pages

Implement:
- **AdminLogin**: Login form, store JWT in localStorage
- **AdminDashboard**: Tabs for tests, questions, assessments, analytics

#### 4.7 Reusable Components

Create in `frontend/src/components/ui/`:
- Button
- Input
- Card
- Modal
- ProgressBar
- Spinner/Loading

---

## Code Style Guidelines

- **JavaScript only** (no TypeScript)
- **No unnecessary abstractions** - keep it simple
- **Express-validator** for all request validation
- **Drizzle queries** - use query builder, not raw SQL unless necessary
- **Async/await** over promise chains
- **Error handling** - always catch errors and return meaningful messages
- **No console.log in production** - use proper logging if needed later

---

## Testing Checklist

### Backend
- [ ] Health endpoint returns 200
- [ ] Admin login with valid credentials returns JWT
- [ ] Admin login with invalid credentials returns 401
- [ ] YAML import creates questions in database
- [ ] Create test with unique slug succeeds
- [ ] Create test with duplicate slug returns 409
- [ ] Start assessment creates assessment record
- [ ] Submit answer records answer
- [ ] Submit assessment calculates correct score
- [ ] Question success rate analytics return correct percentages

### Frontend
- [ ] Test landing page shows test info
- [ ] Question runner displays questions
- [ ] Navigation between questions works
- [ ] Progress indicator shows correct position
- [ ] Submit test shows final score
- [ ] Admin login stores JWT
- [ ] Admin dashboard shows tests
- [ ] Question import works from admin UI

### Integration
- [ ] Full candidate flow (landing → run → result)
- [ ] Full admin flow (login → create test → view results)
- [ ] Disabled test returns 404 to candidates
- [ ] SINGLE choice scoring works correctly
- [ ] MULTIPLE choice scoring works correctly
- [ ] Weighted scoring calculates correctly

---

## Deployment

See `render.yaml` for configuration.

**Steps:**
1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables in Render dashboard:
   - `DATABASE_URL` (auto-injected from database service)
   - `JWT_SECRET` (generate secure random string)
   - `NODE_ENV=production`
4. Deploy services
5. Run database migrations via Render shell
6. Create admin user via Render shell

---

## Next Steps After MVP

1. Add automated tests (Jest, Vitest)
2. Implement web UI for question creation
3. Add test categories/tags filtering
4. Build analytics dashboard with charts
5. Add CSV export functionality
6. Implement time limits
7. Add email notifications

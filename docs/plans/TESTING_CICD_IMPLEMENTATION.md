# Testing & CI/CD Implementation Plan

**Created:** 2025-01-23
**Status:** Ready for Implementation
**Approach:** Postgres-everywhere with transaction rollback

## Overview

Comprehensive testing strategy with automated CI/CD pipeline for Clever Badge. Tests run on every push to develop/staging/main branches. Render.com deployments triggered only on staging/main branches and only if all tests pass.

## Architecture Summary

**Testing Stack:**
- **Backend:** Vitest (unit, integration, API tests)
- **Frontend:** Vitest (component tests)
- **E2E:** Playwright (full user journeys)
- **Database:** PostgreSQL with transaction rollback (fast isolation)

**CI/CD Flow:**
```
Push to develop → Run all tests → ❌ No deployment
Push to staging → Run all tests → ✅ Deploy to staging.cleverbadge.com (if pass)
Push to main    → Run all tests → ✅ Deploy to cleverbadge.com (if pass)
```

**Environment Strategy:**
- `development` - Local dev schema
- `test` - Test suite schema (transaction rollback)
- `staging` - Render staging (renamed from "testing")
- `production` - Render production

## Implementation Tasks

### Task 1: Rename Environment (testing → staging)

**Files to update:**
- `render.yaml` - Service names, branches, domains, env vars
- `docs/ENVIRONMENT_SETUP.md` - All references
- `docs/DEPLOYMENT.md` - All references
- `README.md` - Environment list
- `CLAUDE.md` - Environment strategy
- `backend/.env.example` - Comments
- `frontend/.env.example` - Comments

**Changes:**
- Branch `testing` → `staging`
- Schema `testing` → `staging`
- User `cleverbadge_test` → `cleverbadge_staging`
- Domains: `testing.cleverbadge.com` → `staging.cleverbadge.com`
- Domains: `api-testing.cleverbadge.com` → `api-staging.cleverbadge.com`

**Verification:**
- Search for all occurrences of "testing" and verify context
- Ensure no confusion between test suite and staging environment

---

### Task 2: Backend Test Infrastructure

**Install dependencies:**
```bash
cd backend
npm install --save-dev vitest @vitest/ui c8
```

**Create test configuration:**

`backend/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      include: ['routes/**', 'middleware/**', 'utils/**', 'db/**'],
      exclude: ['**/*.test.js', '**/node_modules/**']
    },
    testTimeout: 10000
  }
});
```

**Create test setup file:**

`backend/tests/setup.js`:
```javascript
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import postgres from 'postgres';
import fs from 'fs';

// Test database connection
const TEST_DB_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://cleverbadge_admin:password@localhost:5432/cleverbadge';

const testSql = postgres(TEST_DB_URL, {
  onnotice: () => {},
  prepare: false
});

const TEST_SCHEMA = 'test';

// Setup: Create test schema before all tests
beforeAll(async () => {
  console.log('Setting up test schema...');

  // Drop and recreate test schema
  await testSql.unsafe(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  await testSql.unsafe(`CREATE SCHEMA ${TEST_SCHEMA}`);

  // Run migration with __SCHEMA__ replacement
  const migrationSQL = fs.readFileSync('./db/migrations/001_initial_schema.sql', 'utf8');
  const testMigrationSQL = migrationSQL.replaceAll('__SCHEMA__', TEST_SCHEMA);

  await testSql.unsafe(testMigrationSQL);

  // Seed test data
  await seedTestData();

  console.log('Test schema created and seeded');
});

// Cleanup: Drop test schema after all tests
afterAll(async () => {
  console.log('Cleaning up test schema...');
  await testSql.unsafe(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  await testSql.end();
  console.log('Test schema dropped');
});

// Transaction isolation per test
let currentTransaction;

beforeEach(async () => {
  // Start transaction
  currentTransaction = await testSql.begin(async sql => {
    // This transaction will be available to tests via getTestDb()
    return sql;
  });
});

afterEach(async () => {
  // Rollback transaction
  if (currentTransaction) {
    await testSql`ROLLBACK`;
  }
});

// Seed comprehensive test data
async function seedTestData() {
  // User: admin (for future auth tests)
  const adminId = '550e8400-e29b-41d4-a716-446655440001';
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.users (id, username, password_hash, role)
    VALUES ('${adminId}', 'testadmin', '$argon2id$v=19$m=65536,t=3,p=4$fakehash', 'ADMIN')
  `);

  // Questions: Comprehensive set
  const questions = [
    // SINGLE choice - correct answer
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      text: 'What is 2 + 2?',
      type: 'SINGLE',
      options: JSON.stringify(['3', '4', '5', '6']),
      correct_answers: JSON.stringify([1]),
      tags: JSON.stringify(['math', 'easy'])
    },
    // SINGLE choice - for wrong answer test
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      text: 'What is the capital of France?',
      type: 'SINGLE',
      options: JSON.stringify(['London', 'Paris', 'Berlin', 'Madrid']),
      correct_answers: JSON.stringify([1]),
      tags: JSON.stringify(['geography'])
    },
    // MULTIPLE choice
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      text: 'Select all even numbers:',
      type: 'MULTIPLE',
      options: JSON.stringify(['1', '2', '3', '4']),
      correct_answers: JSON.stringify([1, 3]),
      tags: JSON.stringify(['math'])
    },
    // MULTIPLE choice - for partial answer test
    {
      id: '550e8400-e29b-41d4-a716-446655440013',
      text: 'Select all primary colors:',
      type: 'MULTIPLE',
      options: JSON.stringify(['Red', 'Green', 'Blue', 'Yellow']),
      correct_answers: JSON.stringify([0, 2, 3]),
      tags: JSON.stringify(['art'])
    },
    // SINGLE choice - no tags
    {
      id: '550e8400-e29b-41d4-a716-446655440014',
      text: 'Is the sky blue?',
      type: 'SINGLE',
      options: JSON.stringify(['Yes', 'No']),
      correct_answers: JSON.stringify([0]),
      tags: null
    }
  ];

  for (const q of questions) {
    await testSql.unsafe(`
      INSERT INTO ${TEST_SCHEMA}.questions (id, text, type, options, correct_answers, tags)
      VALUES ('${q.id}', '${q.text}', '${q.type}', '${q.options}', '${q.correct_answers}', ${q.tags ? `'${q.tags}'` : 'NULL'})
    `);
  }

  // Tests
  const tests = [
    // Enabled test with questions
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      title: 'Math & Geography Test',
      slug: 'math-geo',
      description: 'Test your math and geography knowledge',
      is_enabled: true
    },
    // Disabled test
    {
      id: '550e8400-e29b-41d4-a716-446655440021',
      title: 'Disabled Test',
      slug: 'disabled-test',
      description: 'This test is disabled',
      is_enabled: false
    },
    // Empty test (no questions)
    {
      id: '550e8400-e29b-41d4-a716-446655440022',
      title: 'Empty Test',
      slug: 'empty-test',
      description: 'This test has no questions',
      is_enabled: true
    }
  ];

  for (const t of tests) {
    await testSql.unsafe(`
      INSERT INTO ${TEST_SCHEMA}.tests (id, title, slug, description, is_enabled, created_by)
      VALUES ('${t.id}', '${t.title}', '${t.slug}', '${t.description}', ${t.is_enabled}, '${adminId}')
    `);
  }

  // Test questions (for math-geo test)
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.test_questions (test_id, question_id, weight)
    VALUES
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 1.0),
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440011', 1.5),
      ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440012', 2.0)
  `);

  // Assessment - completed with perfect score
  const perfectAssessmentId = '550e8400-e29b-41d4-a716-446655440030';
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, score, started_at, completed_at)
    VALUES (
      '${perfectAssessmentId}',
      '550e8400-e29b-41d4-a716-446655440020',
      'Perfect Student',
      'COMPLETED',
      100.0,
      NOW() - INTERVAL '10 minutes',
      NOW() - INTERVAL '5 minutes'
    )
  `);

  // Assessment answers - all correct
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessment_answers (assessment_id, question_id, selected_options)
    VALUES
      ('${perfectAssessmentId}', '550e8400-e29b-41d4-a716-446655440010', '[1]'),
      ('${perfectAssessmentId}', '550e8400-e29b-41d4-a716-446655440011', '[1]'),
      ('${perfectAssessmentId}', '550e8400-e29b-41d4-a716-446655440012', '[1,3]')
  `);

  // Assessment - completed with partial score
  const partialAssessmentId = '550e8400-e29b-41d4-a716-446655440031';
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, score, started_at, completed_at)
    VALUES (
      '${partialAssessmentId}',
      '550e8400-e29b-41d4-a716-446655440020',
      'Average Student',
      'COMPLETED',
      33.33,
      NOW() - INTERVAL '20 minutes',
      NOW() - INTERVAL '15 minutes'
    )
  `);

  // Assessment answers - some wrong
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessment_answers (assessment_id, question_id, selected_options)
    VALUES
      ('${partialAssessmentId}', '550e8400-e29b-41d4-a716-446655440010', '[0]'),
      ('${partialAssessmentId}', '550e8400-e29b-41d4-a716-446655440011', '[1]'),
      ('${partialAssessmentId}', '550e8400-e29b-41d4-a716-446655440012', '[1]')
  `);

  // Assessment - in progress
  await testSql.unsafe(`
    INSERT INTO ${TEST_SCHEMA}.assessments (id, test_id, candidate_name, status, started_at)
    VALUES (
      '550e8400-e29b-41d4-a716-446655440032',
      '550e8400-e29b-41d4-a716-446655440020',
      'Current Student',
      'IN_PROGRESS',
      NOW() - INTERVAL '2 minutes'
    )
  `);
}

// Export test database accessor
export function getTestDb() {
  return testSql;
}

export function getTestSchema() {
  return TEST_SCHEMA;
}
```

**Update package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

### Task 3: Backend Unit Tests

Create unit tests for scoring logic, validation, and utilities.

`backend/tests/unit/scoring.test.js`:
```javascript
import { describe, it, expect } from 'vitest';

// Extract scoring logic to utils/scoring.js first
import { calculateScore, isAnswerCorrect } from '../../utils/scoring.js';

describe('Scoring Logic', () => {
  describe('isAnswerCorrect - SINGLE choice', () => {
    it('should return true for correct single choice', () => {
      const result = isAnswerCorrect(
        'SINGLE',
        [1], // selected
        [1]  // correct
      );
      expect(result).toBe(true);
    });

    it('should return false for wrong single choice', () => {
      const result = isAnswerCorrect('SINGLE', [0], [1]);
      expect(result).toBe(false);
    });

    it('should return false when multiple options selected for SINGLE', () => {
      const result = isAnswerCorrect('SINGLE', [0, 1], [1]);
      expect(result).toBe(false);
    });

    it('should return false when no option selected', () => {
      const result = isAnswerCorrect('SINGLE', [], [1]);
      expect(result).toBe(false);
    });
  });

  describe('isAnswerCorrect - MULTIPLE choice', () => {
    it('should return true for correct multiple choice', () => {
      const result = isAnswerCorrect('MULTIPLE', [1, 3], [1, 3]);
      expect(result).toBe(true);
    });

    it('should return true for correct multiple choice (different order)', () => {
      const result = isAnswerCorrect('MULTIPLE', [3, 1], [1, 3]);
      expect(result).toBe(true);
    });

    it('should return false for partial answer', () => {
      const result = isAnswerCorrect('MULTIPLE', [1], [1, 3]);
      expect(result).toBe(false);
    });

    it('should return false for extra wrong option', () => {
      const result = isAnswerCorrect('MULTIPLE', [0, 1, 3], [1, 3]);
      expect(result).toBe(false);
    });

    it('should return false when no options selected', () => {
      const result = isAnswerCorrect('MULTIPLE', [], [1, 3]);
      expect(result).toBe(false);
    });
  });

  describe('calculateScore - weighted scoring', () => {
    it('should calculate 100% for all correct answers', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 },
        { id: 'q2', type: 'SINGLE', correct_answers: [2], weight: 1.5 },
        { id: 'q3', type: 'MULTIPLE', correct_answers: [1, 3], weight: 2.0 }
      ];
      const answers = {
        'q1': [1],
        'q2': [2],
        'q3': [1, 3]
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(100.0);
    });

    it('should calculate partial score correctly', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 },
        { id: 'q2', type: 'SINGLE', correct_answers: [2], weight: 1.0 }
      ];
      const answers = {
        'q1': [1],  // correct
        'q2': [0]   // wrong
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(50.0);
    });

    it('should handle weighted scoring', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 },
        { id: 'q2', type: 'SINGLE', correct_answers: [2], weight: 3.0 }
      ];
      const answers = {
        'q1': [0],  // wrong (1 point)
        'q2': [2]   // correct (3 points)
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(75.0); // 3 / 4 = 0.75
    });

    it('should return 0 for all wrong answers', () => {
      const questions = [
        { id: 'q1', type: 'SINGLE', correct_answers: [1], weight: 1.0 }
      ];
      const answers = {
        'q1': [0]
      };

      const score = calculateScore(questions, answers);
      expect(score).toBe(0.0);
    });
  });
});
```

**Action required:** Extract scoring logic from `routes/assessments.js` to `utils/scoring.js` to make it testable.

---

### Task 4: Backend Integration Tests

Test database operations with transaction rollback.

`backend/tests/integration/questions.test.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, getTestSchema } from '../setup.js';

const sql = getTestDb();
const schema = getTestSchema();

describe('Questions Database Operations', () => {
  it('should fetch all questions', async () => {
    const questions = await sql`
      SELECT * FROM ${sql(schema)}.questions
      ORDER BY created_at DESC
    `;

    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]).toHaveProperty('id');
    expect(questions[0]).toHaveProperty('text');
    expect(questions[0]).toHaveProperty('type');
  });

  it('should create a new question', async () => {
    const [newQuestion] = await sql`
      INSERT INTO ${sql(schema)}.questions (text, type, options, correct_answers, tags)
      VALUES ('Test question?', 'SINGLE', '["A", "B", "C"]'::jsonb, '[0]'::jsonb, '["test"]'::jsonb)
      RETURNING *
    `;

    expect(newQuestion.text).toBe('Test question?');
    expect(newQuestion.type).toBe('SINGLE');

    // Verify it was created (transaction will rollback after test)
    const [found] = await sql`
      SELECT * FROM ${sql(schema)}.questions WHERE id = ${newQuestion.id}
    `;
    expect(found).toBeDefined();
  });

  it('should update a question', async () => {
    const questionId = '550e8400-e29b-41d4-a716-446655440010';

    await sql`
      UPDATE ${sql(schema)}.questions
      SET text = 'Updated question text'
      WHERE id = ${questionId}
    `;

    const [updated] = await sql`
      SELECT * FROM ${sql(schema)}.questions WHERE id = ${questionId}
    `;

    expect(updated.text).toBe('Updated question text');
  });

  it('should delete a question', async () => {
    const questionId = '550e8400-e29b-41d4-a716-446655440014';

    await sql`
      DELETE FROM ${sql(schema)}.questions WHERE id = ${questionId}
    `;

    const questions = await sql`
      SELECT * FROM ${sql(schema)}.questions WHERE id = ${questionId}
    `;

    expect(questions.length).toBe(0);
  });

  it('should filter questions by tags', async () => {
    const questions = await sql`
      SELECT * FROM ${sql(schema)}.questions
      WHERE tags @> '["math"]'::jsonb
    `;

    expect(questions.length).toBeGreaterThan(0);
    questions.forEach(q => {
      expect(q.tags).toContain('math');
    });
  });
});
```

---

### Task 5: Backend API Tests

Test full HTTP request/response cycles.

`backend/tests/api/tests.test.js`:
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import cors from 'cors';
import testsRouter from '../../routes/tests.js';
import { getTestSchema } from '../setup.js';

let app;

beforeAll(() => {
  // Create Express app for testing
  app = express();
  app.use(cors());
  app.use(express.json());

  // Override NODE_ENV to use test schema
  process.env.NODE_ENV = 'test';

  app.use('/api/tests', testsRouter);
});

describe('Tests API', () => {
  describe('GET /api/tests', () => {
    it('should return all tests', async () => {
      const response = await request(app)
        .get('/api/tests')
        .expect(200);

      expect(response.body).toHaveProperty('tests');
      expect(response.body.tests.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tests/slug/:slug', () => {
    it('should return enabled test by slug', async () => {
      const response = await request(app)
        .get('/api/tests/slug/math-geo')
        .expect(200);

      expect(response.body.slug).toBe('math-geo');
      expect(response.body.is_enabled).toBe(true);
      expect(response.body.questions).toBeDefined();
      expect(response.body.questions.length).toBe(3);
    });

    it('should return 403 for disabled test', async () => {
      const response = await request(app)
        .get('/api/tests/slug/disabled-test')
        .expect(403);

      expect(response.body.error).toContain('disabled');
    });

    it('should return 404 for non-existent test', async () => {
      await request(app)
        .get('/api/tests/slug/non-existent')
        .expect(404);
    });
  });

  describe('GET /api/tests/:id', () => {
    it('should return test by id', async () => {
      const testId = '550e8400-e29b-41d4-a716-446655440020';
      const response = await request(app)
        .get(`/api/tests/${testId}`)
        .expect(200);

      expect(response.body.id).toBe(testId);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app)
        .get('/api/tests/invalid-uuid')
        .expect(400);
    });
  });

  // Add POST, PUT, DELETE tests here (will need auth in Phase 2)
});
```

**Install supertest:**
```bash
npm install --save-dev supertest
```

---

### Task 6: Frontend Test Infrastructure

**Install dependencies:**
```bash
cd frontend
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

**Create test configuration:**

`frontend/vitest.config.js`:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', '**/*.test.{js,jsx}', '**/node_modules/**']
    }
  }
});
```

**Create test setup:**

`frontend/tests/setup.js`:
```javascript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_API_URL = 'http://localhost:3000';
process.env.VITE_ENV = 'test';
process.env.VITE_VERSION = '0.3.0';
```

**Update package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

### Task 7: Frontend Component Tests

`frontend/tests/components/Footer.test.jsx`:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Footer from '../../src/components/Footer';

describe('Footer Component', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn();
  });

  it('should render copyright text', () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '0.3.0', environment: 'production' })
    });

    render(<Footer />);
    expect(screen.getByText(/Copyright Clever Badge 2025/i)).toBeInTheDocument();
  });

  it('should display frontend version', () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '0.3.0', environment: 'production' })
    });

    render(<Footer />);
    expect(screen.getByText(/Frontend: v0.3.0/i)).toBeInTheDocument();
  });

  it('should fetch and display backend version', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '0.3.0', environment: 'production' })
    });

    render(<Footer />);

    await waitFor(() => {
      expect(screen.getByText(/Backend: v0.3.0/i)).toBeInTheDocument();
    });
  });

  it('should handle fetch error gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Footer />);

    await waitFor(() => {
      expect(screen.getByText(/Backend: error/i)).toBeInTheDocument();
    });
  });
});
```

`frontend/tests/components/EnvironmentBanner.test.jsx`:
```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnvironmentBanner from '../../src/components/EnvironmentBanner';

describe('EnvironmentBanner Component', () => {
  it('should not render in production', () => {
    const { container } = render(<EnvironmentBanner environment="production" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render yellow banner in development', () => {
    render(<EnvironmentBanner environment="development" />);
    const banner = screen.getByText(/DEVELOPMENT ENVIRONMENT/i);
    expect(banner).toBeInTheDocument();
    expect(banner.className).toContain('bg-yellow-400');
  });

  it('should render blue banner in staging', () => {
    render(<EnvironmentBanner environment="staging" />);
    const banner = screen.getByText(/STAGING ENVIRONMENT/i);
    expect(banner).toBeInTheDocument();
    expect(banner.className).toContain('bg-blue-400');
  });
});
```

---

### Task 8: Playwright E2E Tests

**Install Playwright:**
```bash
cd frontend
npm install --save-dev @playwright/test
npx playwright install
```

**Create Playwright configuration:**

`frontend/playwright.config.js`:
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
```

**Create E2E tests:**

`frontend/tests/e2e/candidate-flow.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test.describe('Candidate Test Taking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assume backend is seeded with math-geo test
    await page.goto('/t/math-geo');
  });

  test('should complete full happy path', async ({ page }) => {
    // Landing page
    await expect(page.locator('h1')).toContainText('Math & Geography Test');
    await page.fill('input[name="candidateName"]', 'Test Candidate');
    await page.click('button:has-text("Start Test")');

    // Question 1 (SINGLE: What is 2 + 2?)
    await expect(page.locator('h2')).toContainText('What is 2 + 2?');
    await page.click('input[type="radio"][value="1"]'); // Select "4"
    await page.click('button:has-text("Next")');

    // Question 2 (SINGLE: Capital of France?)
    await expect(page.locator('h2')).toContainText('capital of France');
    await page.click('input[type="radio"][value="1"]'); // Select "Paris"
    await page.click('button:has-text("Next")');

    // Question 3 (MULTIPLE: Even numbers)
    await expect(page.locator('h2')).toContainText('even numbers');
    await page.click('input[type="checkbox"][value="1"]'); // 2
    await page.click('input[type="checkbox"][value="3"]'); // 4
    await page.click('button:has-text("Submit Test")');

    // Results page
    await expect(page.locator('text=100')).toBeVisible(); // Perfect score
    await expect(page.locator('text=PASSED')).toBeVisible();
  });

  test('should handle disabled test', async ({ page }) => {
    await page.goto('/t/disabled-test');

    await expect(page.locator('text=/not available|disabled/i')).toBeVisible();
  });

  test('should handle non-existent test', async ({ page }) => {
    await page.goto('/t/non-existent-slug');

    await expect(page.locator('text=/not found|doesn\'t exist/i')).toBeVisible();
  });

  test('should allow navigation back and forth', async ({ page }) => {
    // Start test
    await page.fill('input[name="candidateName"]', 'Navigator');
    await page.click('button:has-text("Start Test")');

    // Answer Q1
    await page.click('input[type="radio"][value="1"]');
    await page.click('button:has-text("Next")');

    // Go back
    await page.click('button:has-text("Previous")');

    // Verify answer persisted
    const radio = page.locator('input[type="radio"][value="1"]');
    await expect(radio).toBeChecked();
  });

  test('should show progress indicator', async ({ page }) => {
    await page.fill('input[name="candidateName"]', 'Progress Checker');
    await page.click('button:has-text("Start Test")');

    // Check progress text
    await expect(page.locator('text=/Question 1 of 3/i')).toBeVisible();

    // Navigate to Q2
    await page.click('input[type="radio"][value="1"]');
    await page.click('button:has-text("Next")');

    await expect(page.locator('text=/Question 2 of 3/i')).toBeVisible();
  });

  test('should handle partial answers', async ({ page }) => {
    // Start test
    await page.fill('input[name="candidateName"]', 'Partial Answerer');
    await page.click('button:has-text("Start Test")');

    // Answer Q1 correctly
    await page.click('input[type="radio"][value="1"]');
    await page.click('button:has-text("Next")');

    // Answer Q2 incorrectly
    await page.click('input[type="radio"][value="0"]'); // Wrong answer
    await page.click('button:has-text("Next")');

    // Answer Q3 partially (MULTIPLE - only select one correct option)
    await page.click('input[type="checkbox"][value="1"]'); // Only 2, missing 4
    await page.click('button:has-text("Submit Test")');

    // Should get partial score
    await expect(page.locator('text=/22|33/i')).toBeVisible(); // Approximately 33%
  });

  test('should prevent submission without name', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start Test")');

    // Try to start without entering name
    await startButton.click();

    // Should still be on landing page (HTML5 validation)
    await expect(page.locator('input[name="candidateName"]')).toBeVisible();
  });
});
```

**Update frontend package.json:**
```json
{
  "scripts": {
    "test:e2e": "playwright test --reporter=line",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

### Task 9: GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches:
      - develop
      - staging
      - main
  pull_request:
    branches:
      - develop
      - staging
      - main

env:
  NODE_VERSION: '20'  # Align with Render.com default

jobs:
  backend-tests:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: cleverbadge
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install backend dependencies
        working-directory: backend
        run: npm ci

      - name: Create test database user
        env:
          PGPASSWORD: postgres
        run: |
          psql -h localhost -U postgres -d cleverbadge -c "CREATE USER cleverbadge_admin WITH PASSWORD 'testpass';"
          psql -h localhost -U postgres -d cleverbadge -c "GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;"
          psql -h localhost -U postgres -d cleverbadge -c "GRANT ALL ON SCHEMA public TO cleverbadge_admin;"

      - name: Run backend tests
        working-directory: backend
        env:
          TEST_DATABASE_URL: postgresql://cleverbadge_admin:testpass@localhost:5432/cleverbadge
          NODE_ENV: test
        run: npm test

      - name: Upload backend coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: backend-coverage
          path: backend/coverage/

  frontend-tests:
    name: Frontend Tests
    runs-on: ubuntu-latest
    needs: backend-tests  # Sequential: backend → frontend

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Run frontend unit tests
        working-directory: frontend
        run: npm test

      - name: Upload frontend coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: frontend-coverage
          path: frontend/coverage/

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: frontend-tests  # Sequential: frontend → e2e

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: cleverbadge
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install backend dependencies
        working-directory: backend
        run: npm ci

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Install Playwright browsers
        working-directory: frontend
        run: npx playwright install --with-deps chromium

      - name: Setup test database
        env:
          PGPASSWORD: postgres
        run: |
          psql -h localhost -U postgres -d cleverbadge -c "CREATE USER cleverbadge_admin WITH PASSWORD 'testpass';"
          psql -h localhost -U postgres -d cleverbadge -c "GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;"
          psql -h localhost -U postgres -d cleverbadge -c "GRANT ALL ON SCHEMA public TO cleverbadge_admin;"

      - name: Run migrations
        working-directory: backend
        env:
          DATABASE_ADMIN_URL: postgresql://cleverbadge_admin:testpass@localhost:5432/cleverbadge
          NODE_ENV: test
        run: npm run migrate

      - name: Start backend server
        working-directory: backend
        env:
          DATABASE_URL: postgresql://cleverbadge_admin:testpass@localhost:5432/cleverbadge
          NODE_ENV: test
          PORT: 3000
          JWT_SECRET: test-secret
        run: |
          node index.js &
          echo $! > backend.pid
          sleep 3

      - name: Run E2E tests
        working-directory: frontend
        env:
          VITE_API_URL: http://localhost:3000
        run: npm run test:e2e

      - name: Stop backend server
        if: always()
        run: |
          if [ -f backend/backend.pid ]; then
            kill $(cat backend/backend.pid) || true
          fi

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: github.ref == 'refs/heads/staging' && github.event_name == 'push'
    environment: staging

    steps:
      - name: Trigger Render backend deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_BACKEND_STAGING }}"

      - name: Trigger Render frontend deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_FRONTEND_STAGING }}"

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production

    steps:
      - name: Trigger Render backend deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_BACKEND_PRODUCTION }}"

      - name: Trigger Render frontend deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_FRONTEND_PRODUCTION }}"
```

---

### Task 10: Configure GitHub Secrets

**In GitHub repository:**

1. Go to Settings → Environments
2. Create two environments:
   - `staging`
   - `production`

3. For each environment, add secrets:

**Staging environment:**
- `RENDER_DEPLOY_HOOK_BACKEND_STAGING`: `https://api.render.com/deploy/srv-xxx?key=xxx`
- `RENDER_DEPLOY_HOOK_FRONTEND_STAGING`: `https://api.render.com/deploy/srv-yyy?key=yyy`

**Production environment:**
- `RENDER_DEPLOY_HOOK_BACKEND_PRODUCTION`: `https://api.render.com/deploy/srv-zzz?key=zzz`
- `RENDER_DEPLOY_HOOK_FRONTEND_PRODUCTION`: `https://api.render.com/deploy/srv-www?key=www`

**To get Render Deploy Hooks:**
1. Go to Render.com dashboard
2. Select each service
3. Go to Settings → Deploy Hook
4. Click "Create Deploy Hook"
5. Copy the URL

---

### Task 11: Update Documentation

**Update CLAUDE.md:**

Add to "Critical Rules":
```markdown
- NEVER push to git - user will push manually to control CI/CD costs
- Always run tests locally before committing: `npm test` (backend and frontend)
- Tests must pass before any commit
```

Add new section:
```markdown
## Testing Strategy

**Stack:**
- Backend: Vitest (unit, integration, API tests) + Postgres with transaction rollback
- Frontend: Vitest (component tests) + Playwright (E2E tests)
- Database: PostgreSQL everywhere (local, CI, Render)

**Running tests:**
```bash
# Backend
cd backend
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage

# Frontend
cd frontend
npm test                 # Component tests
npm run test:e2e         # E2E tests with Playwright
npm run test:coverage    # Coverage report
```

**CI/CD:**
- Tests run on push to develop, staging, main
- Render deploys only on staging/main and only if tests pass
- GitHub Actions uses environment secrets for deploy hooks
```

**Update README.md:**

Add to Development Commands:
```markdown
### Testing

**Backend:**
```bash
npm test              # Run all backend tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```

**Frontend:**
```bash
npm test              # Run component tests
npm run test:e2e      # Run Playwright E2E tests
npm run test:coverage # Generate coverage report
```

**CI/CD:**
- All tests run automatically on push to develop/staging/main
- Render.com deploys triggered only on staging/main (if tests pass)
- Manual push required (prevents unnecessary CI runs)
```

---

## Summary

**What you'll have:**
1. ✅ Comprehensive backend tests (unit, integration, API)
2. ✅ Frontend component tests with React Testing Library
3. ✅ End-to-end tests with Playwright
4. ✅ GitHub Actions CI/CD pipeline
5. ✅ Automated Render deployments (staging + production)
6. ✅ Environment renamed (testing → staging)
7. ✅ Fast test execution with Postgres transaction rollback
8. ✅ Manual push control (prevents CI cost overruns)

**Test coverage:**
- Backend: Scoring logic, database operations, API endpoints, error handling
- Frontend: Component rendering, state management, error states
- E2E: Complete candidate flow, navigation, edge cases

**CI/CD flow:**
```
Push to develop → Tests run → ❌ No deploy
Push to staging → Tests run → ✅ Deploy to staging.cleverbadge.com
Push to main    → Tests run → ✅ Deploy to cleverbadge.com
```

Ready to implement?

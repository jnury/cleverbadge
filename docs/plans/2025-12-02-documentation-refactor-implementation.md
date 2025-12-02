# Documentation Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor 12 root docs + 21 v1 plans into 5 clean files optimized for AI context loading.

**Architecture:** Create 3 new merged files (ARCHITECTURE.md, DEVELOPMENT.md, CHANGELOG.md), clean 2 existing files (API.md, DATABASE.md), move v2 plans up, delete all v1 artifacts.

**Tech Stack:** Markdown, Git

---

## Task 1: Create ARCHITECTURE.md

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Source (read-only): `docs/IMPLEMENTATION.md`, `docs/DATABASE_SECURITY.md`, `docs/MARKDOWN.md`

**Step 1: Create the ARCHITECTURE.md file**

```markdown
# Architecture

Clever Badge - Online skills assessment platform. Candidates take MCQ tests via shareable links. Admins manage tests, import questions via YAML, review results.

## Tech Stack

### Backend
- **Runtime**: Node.js (JavaScript, no TypeScript)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: argon2 + JWT (admin only)
- **Validation**: express-validator

### Frontend
- **Build Tool**: Vite
- **Framework**: React (JavaScript, no TypeScript)
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State**: React Router navigation state (no global state library)

### Deployment
- **Platform**: Render.com
- **Services**: 2 web services (backend + static frontend) + 1 PostgreSQL database

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
│   └── index.js               # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/            # Reusable UI components
│   │   ├── pages/
│   │   │   ├── candidate/     # Test landing, runner, results
│   │   │   └── admin/         # Dashboard, login
│   │   ├── App.jsx            # React Router setup
│   │   └── main.jsx           # Entry point
│   └── public/
│       └── questions-example.yaml  # YAML example file
```

## Key Concepts

### Visibility System
- **Questions**: public, private, protected
- **Tests**: public, private, protected (with access_slug for protected)

### Scoring Formula
Weighted scoring: `(correct_score / max_score) × 100`

Each question in a test has a weight. Final score = sum of weights for correct answers / sum of all weights.

### Slug Generation
Auto-generated from title + 6-character random suffix. Example: `javascript-basics-a1b2c3`

### Schema-per-Environment
- `NODE_ENV` determines database schema automatically
- `development` → development schema
- `testing` → testing schema
- `staging` → staging schema
- `production` → production schema

## Security Model

### Database Users
| User | Purpose | Permissions |
|------|---------|-------------|
| `cleverbadge_admin` | Migrations only | Full schema access (CREATE, ALTER, DROP) |
| `cleverbadge_dev` | Development runtime | Data only (SELECT, INSERT, UPDATE, DELETE) |
| `cleverbadge_test` | Testing runtime | Data only |
| `cleverbadge_prod` | Production runtime | Data only |

**Principle**: Runtime users cannot modify schema structure. This prevents accidental schema changes in production.

### JWT Authentication
- Admin endpoints require Bearer token in Authorization header
- Token contains: id, username, role
- 7-day expiration

## Markdown Support

Markdown is rendered in:
- Question text
- Answer options
- Test description
- Admin preview

### Supported Features
- Code blocks with syntax highlighting (` ```javascript ... ``` `)
- Inline code (`` `code` ``)
- Bold, italic, headings, lists
- Tables

### Security
- Raw HTML disabled (prevents XSS)
- Database stores raw markdown, rendering on client side
```

**Step 2: Verify file was created**

```bash
head -50 docs/ARCHITECTURE.md
```

Expected: First 50 lines of ARCHITECTURE.md content

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: create ARCHITECTURE.md from merged sources"
```

---

## Task 2: Create DEVELOPMENT.md

**Files:**
- Create: `docs/DEVELOPMENT.md`
- Source (read-only): `docs/LOCAL_SETUP.md`, `docs/ENVIRONMENT_SETUP.md`, `docs/DEPLOYMENT.md`

**Step 1: Create the DEVELOPMENT.md file**

```markdown
# Development

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git

## Local Setup

### 1. Create Database and Users

```bash
psql postgres
```

```sql
-- Create database
CREATE DATABASE cleverbadge;

-- Create admin user (migrations only)
CREATE USER cleverbadge_admin WITH PASSWORD 'admin_local_password';

-- Create runtime user (application)
CREATE USER cleverbadge_dev WITH PASSWORD 'dev_local_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_admin;
\c cleverbadge

-- Create schema
CREATE SCHEMA IF NOT EXISTS development;

-- Admin: full access
GRANT ALL PRIVILEGES ON SCHEMA development TO cleverbadge_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA development TO cleverbadge_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT ALL ON TABLES TO cleverbadge_admin;

-- Runtime: data only
GRANT USAGE ON SCHEMA development TO cleverbadge_dev;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cleverbadge_dev;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA development TO cleverbadge_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT USAGE ON SEQUENCES TO cleverbadge_dev;

\q
```

### 2. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure Environment

**backend/.env:**
```env
DATABASE_URL="postgresql://cleverbadge_dev:dev_local_password@localhost:5432/cleverbadge"
NODE_ENV="development"
PORT=3000
JWT_SECRET="local_dev_secret"
```

**frontend/.env:**
```env
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

### 4. Run Migrations

```bash
cd backend
export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:admin_local_password@localhost:5432/cleverbadge"
npm run migrate
unset DATABASE_ADMIN_URL
```

### 5. Create Admin User

```bash
npm run create-admin
# Default: admin / CleverPassword
```

### 6. Start Servers

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

## Environment Variables

### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Runtime DB connection | `postgresql://cleverbadge_dev:...` |
| `NODE_ENV` | Environment (determines schema) | `development` |
| `JWT_SECRET` | JWT signing secret | 64+ random characters |
| `PORT` | Server port | `3000` |

### Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend URL | `http://localhost:3000` |
| `VITE_ENV` | Environment name | `development` |

## Testing

### Unit Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### E2E Tests

```bash
# Uses ports 5433/3001/5174 to run parallel with dev
./scripts/start-test.sh      # Start test environment
./scripts/e2e-tests.sh       # Run all E2E tests
./scripts/stop-test.sh       # Clean up
```

**Test credentials:** admin / admin123

## Database Migrations

```bash
cd backend
export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:PASSWORD@host:5432/cleverbadge"
npm run migrate
unset DATABASE_ADMIN_URL
```

**Important:** Always use `cleverbadge_admin` for migrations, never runtime users.

## Deployment (Render.com)

### Environment Strategy
- Single PostgreSQL database with separate schemas per environment
- `NODE_ENV` determines schema automatically
- Runtime users have data-only permissions

### Services
1. **Backend**: Node.js web service
2. **Frontend**: Static site
3. **Database**: PostgreSQL (shared, schema-isolated)

### Deploy Steps
1. Push to GitHub
2. Render auto-deploys from branch
3. Run migrations via Render shell (with admin user)
4. Verify health endpoint: `curl https://api.cleverbadge.com/health`

### Health Endpoint

```json
{
  "status": "ok",
  "timestamp": "2025-01-23T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```
```

**Step 2: Verify file was created**

```bash
head -50 docs/DEVELOPMENT.md
```

**Step 3: Commit**

```bash
git add docs/DEVELOPMENT.md
git commit -m "docs: create DEVELOPMENT.md from merged sources"
```

---

## Task 3: Create CHANGELOG.md

**Files:**
- Create: `docs/CHANGELOG.md`
- Source (read-only): `docs/PHASE_4_COMPLETE.md`, `docs/PHASE_5_COMPLETE.md`, `docs/DEVELOPMENT_PHASES.md`

**Step 1: Create the CHANGELOG.md file**

```markdown
# Changelog

## v1.0.0 - MVP Complete (2025-11-24)

### Features
- **Candidate Flow**: Take tests via shareable links (`/t/:slug`)
- **Question Types**: SINGLE and MULTIPLE choice with weighted scoring
- **Admin Dashboard**: Manage tests, questions, assessments
- **YAML Import**: Bulk question import with validation
- **Analytics**: Per-question success rate statistics
- **Markdown Support**: Syntax highlighting in questions and options

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database isolation | Schema-per-environment | Cost savings (one DB), complete data isolation |
| Scoring | Weighted formula | Flexibility to emphasize important questions |
| Visibility | public/private/protected | Control over question and test access |
| State management | React Router navigation state | Simplicity, no global state library needed |
| ORM | Drizzle | Type safety, clean API, good PostgreSQL support |
| Auth | argon2 + JWT | Security (argon2), stateless sessions (JWT) |

### Lessons Learned

- **Playwright**: Always use `--reporter=line` for cleaner CI output
- **Feather icons**: Never rely on dynamic icon updates - use CSS visibility or dual-button patterns
- **E2E tests**: Use 'testing' schema with `cleverbadge_test` user
- **Markdown bundle**: react-markdown + react-syntax-highlighter adds ~4MB - use dynamic imports

### Development Phases

| Phase | Version | Focus |
|-------|---------|-------|
| 1 | 0.1.0 | Core candidate flow (take tests) |
| 2 | 0.2.0 | Admin authentication (argon2 + JWT) |
| 3 | 0.3.0 | Admin UI (tests, questions, assessments) |
| 4 | 0.4.0 | YAML import + assessment details |
| 5 | 1.0.0 | Analytics + polish |

### MVP Checklist

- [x] Shareable test links (`/t/:slug`)
- [x] One question per page with navigation
- [x] SINGLE and MULTIPLE choice questions
- [x] Weighted scoring system
- [x] Admin authentication (argon2 + JWT)
- [x] YAML question import
- [x] Test enable/disable
- [x] Detailed assessment results
- [x] Per-question analytics
- [x] Responsive UI
- [x] Accessibility basics
```

**Step 2: Verify file was created**

```bash
head -30 docs/CHANGELOG.md
```

**Step 3: Commit**

```bash
git add docs/CHANGELOG.md
git commit -m "docs: create CHANGELOG.md with v1 decisions and learnings"
```

---

## Task 4: Clean API.md

**Files:**
- Modify: `docs/API.md`

**Step 1: Read current API.md**

Read the entire file to understand current content.

**Step 2: Review and clean**

- Verify all endpoints are current
- Remove any outdated endpoints
- Ensure response examples are accurate
- No content changes needed unless outdated info found

**Step 3: Commit if changes made**

```bash
git add docs/API.md
git commit -m "docs: clean up API.md"
```

If no changes needed, skip this commit.

---

## Task 5: Clean DATABASE.md

**Files:**
- Modify: `docs/DATABASE.md`

**Step 1: Read current DATABASE.md**

Read the entire file to understand current content.

**Step 2: Review and clean**

- Verify schema matches current implementation
- Remove any "planned" field notes that are now implemented
- Ensure all 6 tables documented: users, questions, tests, test_questions, assessments, assessment_answers

**Step 3: Commit if changes made**

```bash
git add docs/DATABASE.md
git commit -m "docs: clean up DATABASE.md"
```

If no changes needed, skip this commit.

---

## Task 6: Move v2 Plans to docs/plans/

**Files:**
- Move: `docs/plans/v2/*` → `docs/plans/`

**Step 1: Move all v2 feature folders**

```bash
mv docs/plans/v2/analytics-charts docs/plans/
mv docs/plans/v2/dashboard docs/plans/
mv docs/plans/v2/export-results docs/plans/
mv docs/plans/v2/gdpr docs/plans/
mv docs/plans/v2/question-randomization docs/plans/
mv docs/plans/v2/time-limits docs/plans/
mv docs/plans/v2/user-management docs/plans/
```

**Step 2: Remove empty v2 folder**

```bash
rmdir docs/plans/v2
```

**Step 3: Verify structure**

```bash
ls docs/plans/
```

Expected: `analytics-charts`, `dashboard`, `export-results`, `gdpr`, `question-randomization`, `time-limits`, `user-management`, plus the design and implementation plan files

**Step 4: Commit**

```bash
git add docs/plans/
git commit -m "docs: flatten v2 plans into docs/plans/"
```

---

## Task 7: Delete v1 Plans

**Files:**
- Delete: `docs/plans/v1/` (entire folder, 21 files)

**Step 1: Delete v1 folder**

```bash
rm -rf docs/plans/v1
```

**Step 2: Verify deletion**

```bash
ls docs/plans/
```

Expected: No `v1` folder

**Step 3: Commit**

```bash
git add docs/plans/
git commit -m "docs: remove archived v1 implementation plans"
```

---

## Task 8: Delete Migrated Root Docs

**Files:**
- Delete: 10 files from `docs/` root

**Step 1: Delete migrated source files**

```bash
rm docs/DATABASE_SECURITY.md
rm docs/DEPLOYMENT.md
rm docs/DEVELOPMENT_PHASES.md
rm docs/ENVIRONMENT_SETUP.md
rm docs/IMPLEMENTATION.md
rm docs/LOCAL_SETUP.md
rm docs/MARKDOWN.md
rm docs/PHASE_4_COMPLETE.md
rm docs/PHASE_5_COMPLETE.md
rm docs/TASK4-TESTING-GUIDE.md
```

**Step 2: Verify remaining files**

```bash
ls docs/
```

Expected: `ARCHITECTURE.md`, `API.md`, `CHANGELOG.md`, `DATABASE.md`, `DEVELOPMENT.md`, `examples/`, `plans/`

**Step 3: Commit**

```bash
git add docs/
git commit -m "docs: delete migrated source files"
```

---

## Task 9: Final Verification

**Step 1: Verify final structure**

```bash
ls -la docs/
ls -la docs/plans/
```

Expected structure:
```
docs/
├── ARCHITECTURE.md
├── API.md
├── CHANGELOG.md
├── DATABASE.md
├── DEVELOPMENT.md
├── examples/
│   └── demo_questions.yaml
└── plans/
    ├── 2025-12-02-documentation-refactor-design.md
    ├── 2025-12-02-documentation-refactor-implementation.md
    ├── analytics-charts/
    ├── dashboard/
    ├── export-results/
    ├── gdpr/
    ├── question-randomization/
    ├── time-limits/
    └── user-management/
```

**Step 2: Verify line counts**

```bash
wc -l docs/*.md
```

Expected: Each file under 300 lines

**Step 3: Run git status**

```bash
git status
```

Expected: Clean working tree

**Step 4: Final commit (if needed)**

If any uncommitted changes:
```bash
git add .
git commit -m "docs: complete documentation refactor for v2"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Create ARCHITECTURE.md | +1 new |
| 2 | Create DEVELOPMENT.md | +1 new |
| 3 | Create CHANGELOG.md | +1 new |
| 4 | Clean API.md | 0-1 modified |
| 5 | Clean DATABASE.md | 0-1 modified |
| 6 | Move v2 plans | 7 moved |
| 7 | Delete v1 plans | -21 deleted |
| 8 | Delete migrated docs | -10 deleted |
| 9 | Final verification | 0 |

**Result:** 5 clean documentation files + organized plans folder

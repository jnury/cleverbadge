# CLAUDE.md

This file provides essential guidance to Claude Code when working with this repository.

## Project Overview

Clever Badge is an online skills assessment platform. Candidates take MCQ tests via shareable links without accounts. Admins manage tests, import questions via YAML, and review detailed results with analytics.

## Tech Stack

**Backend:** Node.js + Express + postgres-js (raw SQL) + PostgreSQL + argon2 + JWT
**Frontend:** React + Vite + Tailwind CSS + React Router
**Testing:** Vitest (unit/integration) + Playwright (E2E) + c8 (coverage)
**CI/CD:** GitHub Actions
**Deployment:** Render.com (2 web services + PostgreSQL)
**Language:** JavaScript only (no TypeScript)

## Key Architecture Decisions

- **Database Layer:** Raw SQL with postgres-js for full control and multi-schema support
- **Authentication:** Admin only (argon2 + JWT), candidates are anonymous
- **Validation:** express-validator for all request validation
- **State Management:** React Router navigation state (no global state library)
- **Question Import:** YAML files only (no web UI in MVP)
- **Scoring:** Weighted scoring - (correct_score / max_score) × 100

## Critical Rules (Never Violate)
- Keep evything simple so a beginer/medium experimented developer can understand and maintain the code.
- No external library except if it greatly simplify the code and it's a very well maintened library. Always ask me if you want to add a library and expose the pros/cons of building your own code vs adding a library.
- Each time you touch the code, update version in package.json with the following rule: if you just implemented a new important feature, increment the minor version digit; else increment the patch version digit.
- Commit the repository only when I ask. NEVER push to git - user will push manually to control CI/CD costs.
- Always run tests locally before committing: `npm test` (backend and frontend). Tests must pass before any commit.
- If you learn something interesting and usefull for the rest of the project, update this CLAUDE.md file in section "Today I learned". But before, ask me if your new knowledge is correct.
- If you made a mistake in your interpretation of the specs, architecture, features etc. update this CLAUDE.md file in section "Never again". But before, ask me if your new knowledge is correct.
- Always ask questions when you need clarification or if you have the choice between multiple solutions.
- Always ask for validation before commiting changes
- **YAML Example File:** The YAML example file is maintained only in `frontend/public/questions-example.yaml` (downloadable from the UI). When the YAML format is updated, update this file only.

## Always Think Step by Step
- Read specification → Check dependencies → Validate data flow → Implement incrementally → Test immediately

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

## Today I learned
- When using playwright, always add ' --reporter=line' so you don't have to wait for results
- E2E tests (NODE_ENV=testing) must use the 'testing' schema with cleverbadge_test user, NOT cleverbadge_dev. The reset-test-schema.js script grants permissions to the E2E user, and this must match the DATABASE_URL in playwright.config.js and CI workflow

## Never again
- Never add features that weren't explicitly requested (like the Auto-save toggle I added to Settings). Always implement exactly what was asked for, but DO propose good ideas as suggestions for the user to accept or decline. Frame additional features as questions: "Would you also like me to add [feature], or should we keep it as-is for now?"
- Never rely on dynamic feather icon updates - they break when innerHTML is replaced. Use CSS visibility or dual-button patterns instead.

## Data Model

**6 tables:**
- `users` - Admin accounts
- `questions` - MCQ questions (SINGLE/MULTIPLE types)
- `tests` - Test collections with slug
- `test_questions` - Many-to-many with weight
- `assessments` - Candidate attempts
- `assessment_answers` - Individual answers

**See:** `docs/DATABASE.md` for complete schema

## API Endpoints

**Public (no auth):**
- `GET /api/tests/slug/:slug` - Get test info
- `POST /api/assessments/start` - Start assessment
- `POST /api/assessments/:id/answer` - Submit answer
- `POST /api/assessments/:id/submit` - Complete assessment

**Admin (requires JWT):**
- `POST /api/auth/login` - Get JWT token
- `POST /api/questions/import` - Import YAML
- `GET/POST/PUT/DELETE /api/tests` - Test CRUD
- `GET /api/tests/:testId/analytics/questions` - Success rates

**See:** `docs/API.md` for complete endpoint documentation

## Frontend Routes

**Candidate:**
- `/t/:slug` - Test landing (enter name)
- `/t/:slug/run` - Question runner (one question per page)
- `/t/:slug/result` - Final score

**Admin:**
- `/admin/login` - Login form
- `/admin` - Dashboard (tests, questions, results, analytics)

## Brand Colors (from STYLE.md)

- Primary (Deep Teal): `#1D4E5A`
- Accent (Copper): `#B55C34`, `#853F21`, `#D98C63`
- Tech Blue: `#4DA6C0` (focus states, progress)
- Circuit Blue: `#2A6373` (borders)

## MVP Scope

**Included in v1:**
✅ Shareable test links, one question per page, progress indicators
✅ SINGLE/MULTIPLE choice, weighted scoring
✅ Admin auth (argon2+JWT), YAML import, test enable/disable
✅ Detailed results, per-question success rates

**Post-MVP:**
⏳ Web UI for questions, test categories, analytics dashboard, CSV export, time limits

## Code Style

- JavaScript only (no TypeScript)
- Keep it simple (no unnecessary abstractions)
- Always use express-validator for validation
- Async/await over promise chains
- Proper error handling with meaningful messages

## Development Commands

**Backend:**
```bash
npm run dev          # Start with nodemon
npm run migrate      # Run SQL migrations to create/update schema
npm run create-admin # Create admin user
```

**Frontend:**
```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
```

## Environment Variables & Multi-Environment Setup

**Backend:**
- `DATABASE_URL` - PostgreSQL connection string (use environment-specific user)
- `NODE_ENV` - Environment (development, testing, staging, production) - **also determines DB schema**
- `JWT_SECRET` - Secret for signing JWTs
- `PORT` - Server port (default: 3000)

**Frontend:**
- `VITE_API_URL` - Backend API URL
- `VITE_ENV` - Environment (development, testing, staging, production)

**Database Security & User Separation (CRITICAL):**
- Each environment has **dedicated database user** with access to ONLY its schema
- Runtime users: `cleverbadge_dev`, `cleverbadge_test`, `cleverbadge_staging`, `cleverbadge_prod`
- Runtime users have **READ/WRITE data permissions ONLY** (no schema modification rights)
- Admin user: `cleverbadge_admin` with **FULL access to all schemas**
- Admin user used ONLY for migrations and schema changes via `npm run migrate`
- **NEVER use admin user for runtime** - applications must use environment-specific users
- `DATABASE_URL` (runtime) = environment user connection string
- `DATABASE_ADMIN_URL` (migrations only) = admin user connection string

**Schema Isolation (Automatic from NODE_ENV):**
- `NODE_ENV=development` → uses `development` schema + `cleverbadge_dev` user
- `NODE_ENV=testing` → uses `testing` schema + `cleverbadge_test` user
- `NODE_ENV=staging` → uses `staging` schema + `cleverbadge_staging` user
- `NODE_ENV=production` → uses `production` schema + `cleverbadge_prod` user
- **No separate DB_SCHEMA variable** - schema is always derived from NODE_ENV

## Important Implementation Notes

1. **Test disable behavior:** When `is_enabled=false`, blocks both new starts AND in-progress assessments
2. **Question import:** Transactional (all or nothing), uses js-yaml package
3. **Scoring logic:**
   - SINGLE: Exact match of one option
   - MULTIPLE: Arrays must match (order-independent)
4. **Analytics:** Success rates scoped to specific test (not global)
5. **Candidate flow:** State passed via React Router navigation state
6. **Admin flow:** JWT stored in localStorage
7. **Environment awareness:**
   - Backend `/health` endpoint returns `{ status, timestamp, version, environment }`
   - Frontend displays environment banner on non-production (top of page, light colored)
   - Footer on all pages: "Copyright Clever Badge 2025 - Frontend: v.x.x.x - Backend: v.x.x.x"
   - Backend version fetched from `/health` endpoint
   - Frontend version read from package.json at build time
8. **Version tracking:**
   - Both frontend and backend have version in package.json
   - Always increment version when touching code (minor for features, patch for fixes)
   - Versions displayed in footer and accessible via health endpoint

## Documentation

- **README.md** - Setup and quick start
- **docs/API.md** - Complete API documentation
- **docs/DATABASE.md** - Database schema and relationships
- **docs/IMPLEMENTATION.md** - Detailed implementation guide with code examples
- **STYLE.md** - Brand colors and design system
- **examples/questions.yaml** - Sample YAML format

## Common Tasks

**Import questions:**
```bash
curl -X POST http://localhost:3000/api/questions/import \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@questions.yaml"
```

**Create admin user:**
```bash
cd backend && npm run create-admin
```

**See `docs/IMPLEMENTATION.md` for detailed implementation steps.**

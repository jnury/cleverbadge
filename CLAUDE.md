# CLAUDE.md

## Project Overview

Clever Badge - Online skills assessment platform. Candidates take MCQ tests via shareable links. Admins manage tests, import questions via YAML, review results.

**Tech:** Node.js/Express + postgres-js + PostgreSQL | React + Vite + Tailwind | JavaScript only (no TypeScript)

## Critical Rules

- Keep code simple for beginner/medium developers
- No external libraries without asking first (expose pros/cons)
- Update package.json version on code changes (minor for features, patch for fixes)
- Commit only when asked. NEVER push - user pushes manually
- Run `npm test` (backend + frontend) before any commit
- Ask questions when unclear or multiple solutions exist
- Ask for validation before committing
- YAML example file: only `frontend/public/questions-example.yaml`

## Testing

```bash
# Unit tests
cd backend && npm test
cd frontend && npm test

# E2E tests (uses ports 5433/3001/5174 to run parallel with dev)
./scripts/e2e-tests.sh                    # Self-contained: starts, tests, cleans up

# Debug E2E (persistent environment)
./scripts/start-test.sh                   # Start test env
cd frontend && PLAYWRIGHT_REUSE_SERVER=1 TEST_BACKEND_PORT=3001 TEST_FRONTEND_PORT=5174 npx playwright test <file>
./scripts/stop-test.sh                    # Clean up
```

**Test credentials:** admin / admin123

## Database

**Schema per environment:** NODE_ENV determines schema (development/testing/staging/production)
- Runtime users: `cleverbadge_dev`, `cleverbadge_test`, etc. (data only)
- Admin user: `cleverbadge_admin` (migrations only via `npm run migrate`)

**6 tables:** users, questions, tests, test_questions, assessments, assessment_answers

## Key Implementation Details

- **Visibility:** Questions (public/private/protected), Tests (public/private/protected with access_slug)
- **Scoring:** Weighted - (correct_score / max_score) × 100
- **Slugs:** Auto-generated from title + 6-char random suffix
- **Default admin:** admin / CleverPassword (auto-created on startup)

## Today I Learned

- Playwright: always use `--reporter=line`
- E2E tests use 'testing' schema with cleverbadge_test user

## Never Again

- Never add unrequested features - propose as questions instead
- Never rely on dynamic feather icon updates - use CSS visibility or dual-button patterns

## Documentation

See `docs/` folder: API.md, DATABASE.md, IMPLEMENTATION.md, STYLE.md

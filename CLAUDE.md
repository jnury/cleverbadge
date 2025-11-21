# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clever Badge is an online skills assessment tool with a React frontend and Express/Prisma backend. Candidates take tests via shareable links, and admins manage tests and review results.

## Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS 4.1 + React Router 7
- **Backend**: Express 5.1 + Prisma 6.19 (CommonJS)
- **Database**: PostgreSQL
- **Deployment**: Render.com (configuration in `render.yaml`)

## Development Commands

### Backend (from `/backend`)
```bash
npm install              # Install dependencies
npm run dev              # Start development server with nodemon on port 3000
npx prisma migrate dev   # Create and apply a new migration
npx prisma migrate deploy # Apply migrations (production)
npx prisma generate      # Regenerate Prisma Client after schema changes
npx prisma studio        # Open Prisma Studio GUI for database inspection
```

### Frontend (from `/frontend`)
```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (default port 5173)
npm run build            # Build for production (outputs to dist/)
npm run preview          # Preview production build locally
npm run lint             # Run ESLint
```

### Testing Individual Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Get tests
curl http://localhost:3000/api/tests

# Get test by slug
curl http://localhost:3000/api/tests/slug/my-test-slug

# Start assessment
curl -X POST http://localhost:3000/api/assessments/start \
  -H "Content-Type: application/json" \
  -d '{"test_id": "uuid-here", "candidate_name": "Test User"}'
```

## Database Setup

The application requires PostgreSQL. For local development:

```bash
# Enter PostgreSQL console
psql postgres

# Create user and database
CREATE USER cleverbadge_user WITH PASSWORD 'secure_password';
CREATE DATABASE cleverbadge;
GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_user;
\c cleverbadge
GRANT ALL ON SCHEMA public TO cleverbadge_user;
```

Then configure `backend/.env`:
```env
DATABASE_URL="postgresql://cleverbadge_user:secure_password@localhost:5432/cleverbadge?schema=public"
PORT=3000
JWT_SECRET="supersecretkey_change_me"
```

After database setup, run migrations from `/backend`:
```bash
npx prisma migrate dev --name init
```

## Architecture

### Data Model (Prisma Schema)

The application uses a relational model with the following key entities:

- **Question**: MCQ questions with type (SINGLE/MULTIPLE), options (JSON), correct_answers (JSON), and tags
- **Test**: A collection of questions with a slug for candidate access
- **TestQuestion**: Many-to-many join table linking Tests to Questions with a weight field for scoring
- **Assessment**: A candidate's attempt at a Test, tracks status (STARTED/COMPLETED) and final score percentage
- **AssessmentAnswer**: Individual answers submitted during an assessment
- **User**: Authentication (username/password_hash) - not fully implemented yet

### API Structure

All routes are in `/backend/routes/`:

- **questions.js**: CRUD for questions, supports importing from YAML files (see `/backend/questions.yaml`)
- **tests.js**: CRUD for tests, includes endpoints to fetch by slug and get test questions
- **assessments.js**:
  - `POST /api/assessments/start` - Creates new assessment instance
  - `POST /api/assessments/submit` - Scores assessment by comparing answers to correct_answers, updates status to COMPLETED

The scoring logic in assessments.js:
- SINGLE type: Exact match of one selected option against correct_answers array
- MULTIPLE type: Selected options array must exactly match correct_answers (order-independent)
- Final score is weighted: (totalScore / maxScore) * 100

### Frontend Structure

Routes defined in `/frontend/src/App.jsx`:

- **Candidate Flow**:
  - `/t/:slug` - TestLanding: Shows test info, candidate enters name
  - `/t/:slug/run` - QuestionRunner: Displays questions, collects answers
  - `/t/:slug/result` - TestResult: Shows final score after submission

- **Admin Flow**:
  - `/admin` - AdminDashboard: Manage tests, questions, view assessments

Reusable UI components are in `/frontend/src/components/ui/`.

### State Management

The frontend uses React Router's navigation state to pass data between routes (e.g., assessment_id from start to run to result). No global state library is currently used.

## Brand & Styling

Brand colors are defined in `/frontend/STYLE.md`:
- **Primary (Deep Teal)**: #1D4E5A - Headers, primary brand color
- **Accent (Copper tones)**: #B55C34, #853F21, #D98C63 - CTA buttons with gradients
- **Tech Blue**: #4DA6C0 - Focus states, active indicators, progress
- **Circuit Blue**: #2A6373 - Subtle borders and backgrounds

Use these colors consistently. Primary buttons should use copper gradients, secondary buttons use teal, and active/focus states use tech blue.

## Important Notes

- The backend runs in **CommonJS** mode (`type: "commonjs"` in package.json)
- Prisma schema uses UUIDs for all primary keys
- Questions can be bulk-imported from YAML (see `/backend/questions.yaml` for format)
- The `render.yaml` deployment config expects environment variables to be set via Render dashboard
- JWT_SECRET exists in .env.example but authentication is not yet fully implemented
- All API responses should be JSON; errors return `{ error: message }`

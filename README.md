# Clever Badge

Online skills assessment platform for evaluating candidates through shareable MCQ tests.

## Overview

Clever Badge allows administrators to create and manage skills assessment tests, while candidates take tests via simple shareable links without needing accounts.

### Key Features

- **Candidate Experience**: Take tests via `/t/:slug` links, one question at a time with navigation
- **Admin Dashboard**: Manage tests, import questions via YAML, view detailed results and analytics
- **Question Types**: Single-choice and multiple-choice questions with weighted scoring
- **Analytics**: Per-question success rates to identify difficult questions

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js (JavaScript)
- **Database**: PostgreSQL (Drizzle ORM)
- **Authentication**: argon2 + JWT
- **Validation**: express-validator
- **Environment**: dotenv (local), Render dashboard (production)

### Frontend
- **Build Tool**: Vite
- **Framework**: React (JavaScript)
- **Styling**: Tailwind CSS
- **Routing**: React Router

### Deployment
- **Platform**: Render.com
- **Services**: 2 web services (backend + static frontend) + 1 PostgreSQL database
- **Tier**: Free tier for MVP

## Project Structure

```
CleverBadge/
├── backend/                 # Express API server
│   ├── db/                 # Drizzle schema and migrations
│   ├── routes/             # API route handlers
│   ├── middleware/         # Auth and validation middleware
│   ├── utils/              # Helpers (JWT, password hashing)
│   ├── index.js            # Server entry point
│   └── .env.example        # Environment variables template
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── App.jsx        # Router setup
│   │   └── main.jsx       # Entry point
│   └── .env.example       # Frontend env template
├── docs/                   # Documentation
│   ├── API.md             # API endpoints specification
│   ├── DATABASE.md        # Database schema design
│   └── DEPLOYMENT.md      # Deployment guide
├── examples/              # Example files
│   └── questions.yaml     # Sample question import format
├── CLAUDE.md              # Instructions for Claude Code
├── STYLE.md               # Brand colors and design system
└── render.yaml            # Render deployment configuration
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Local Development Setup

#### 1. Clone and Install

```bash
git clone <repository-url>
cd CleverBadge

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### 2. Database Setup

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE USER cleverbadge_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE cleverbadge;
GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_user;
\c cleverbadge
GRANT ALL ON SCHEMA public TO cleverbadge_user;
\q
```

#### 3. Environment Configuration

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://cleverbadge_user:your_secure_password@localhost:5432/cleverbadge"
PORT=3000
JWT_SECRET="your_jwt_secret_change_in_production"
NODE_ENV="development"
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

#### 4. Run Migrations

```bash
cd backend
npm run db:push    # Push schema to database
```

#### 5. Create Admin User

```bash
cd backend
npm run create-admin    # Follow prompts to create admin account
```

#### 6. Start Development Servers

**Backend** (in `backend/` directory):
```bash
npm run dev    # Starts on http://localhost:3000
```

**Frontend** (in `frontend/` directory):
```bash
npm run dev    # Starts on http://localhost:5173
```

### Testing the Setup

```bash
# Health check
curl http://localhost:3000/health

# Get all tests
curl http://localhost:3000/api/tests
```

Visit `http://localhost:5173` to access the frontend.

## Key Workflows

### Importing Questions

Create a YAML file (see `examples/questions.yaml` for format):

```yaml
questions:
  - text: "What is the capital of France?"
    type: "SINGLE"
    options:
      - "London"
      - "Paris"
      - "Berlin"
      - "Madrid"
    correct_answers: ["Paris"]
    tags: ["geography", "europe"]
```

Import via admin dashboard or API:
```bash
curl -X POST http://localhost:3000/api/questions/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@questions.yaml"
```

### Creating a Test

1. Log in to admin dashboard
2. Create new test with title, description, and unique slug
3. Import or select questions with weights
4. Enable the test
5. Share link: `https://cleverbadge.com/t/your-test-slug`

### Taking a Test (Candidate)

1. Visit `/t/:slug` link
2. Enter name on landing page
3. Navigate through questions (one per page)
4. Submit when complete
5. View final score percentage

## MVP Feature Scope

### Included in v1
- ✅ Test access via shareable links
- ✅ One question per page with navigation
- ✅ Progress indicators
- ✅ SINGLE and MULTIPLE choice questions
- ✅ Weighted scoring
- ✅ Admin authentication
- ✅ YAML question import/delete
- ✅ Test enable/disable
- ✅ Detailed assessment results
- ✅ Per-question success rate analytics

### Post-MVP (v2+)
- ⏳ Web UI for question creation/editing
- ⏳ Test categories and tags
- ⏳ Admin analytics dashboard
- ⏳ CSV export
- ⏳ Time limits
- ⏳ Candidate answer review
- ⏳ Email results

## Documentation

- **[Development Phases](docs/DEVELOPMENT_PHASES.md)**: 5-phase MVP development roadmap
- **[API Specification](docs/API.md)**: Complete API endpoint documentation
- **[Database Schema](docs/DATABASE.md)**: Data model and relationships
- **[Database Security](docs/DATABASE_SECURITY.md)**: User separation and permission architecture
- **[Implementation Guide](docs/IMPLEMENTATION.md)**: Detailed implementation steps with code examples
- **[Deployment Guide](docs/DEPLOYMENT.md)**: Multi-environment deployment on Render
- **[Environment Setup](docs/ENVIRONMENT_SETUP.md)**: Environment configuration quick reference
- **[Style Guide](STYLE.md)**: Brand colors and UI guidelines

## Development Commands

### Backend

```bash
npm install              # Install dependencies
npm run dev              # Start dev server with nodemon
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Drizzle Studio (database GUI)
npm run create-admin     # Create admin user
```

### Frontend

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
```

## Environment Variables

### Backend Required
- `DATABASE_URL`: PostgreSQL connection string
- `DB_SCHEMA`: Database schema name (development/testing/staging/production)
- `JWT_SECRET`: Secret for signing JWT tokens
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/testing/staging/production)

### Frontend Required
- `VITE_API_URL`: Backend API URL
- `VITE_ENV`: Environment name (development/testing/staging/production)

### Multi-Environment Support

Clever Badge supports multiple environments using PostgreSQL schema isolation:
- Each environment (development, testing, staging, production) uses its own database schema
- All environments can share the same PostgreSQL instance on Render
- Environment banner displays on non-production frontends
- Footer shows frontend and backend versions on all pages

See **[Environment Setup Guide](docs/ENVIRONMENT_SETUP.md)** for details.

## Contributing

This is a personal project. For questions or issues, please open a GitHub issue.

## License

MIT License - see LICENSE file for details

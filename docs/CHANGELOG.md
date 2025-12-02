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
- **Transactional imports**: YAML import uses `sql.begin()` for all-or-nothing inserts
- **Public endpoints**: Assessment details deliberately public (candidates view with UUID)
- **File validation**: Server-side validation for YAML files (type, size, structure)
- **Error messages**: Detailed validation errors with question numbers improve UX

### Development Phases

| Phase | Version | Focus | Features Added |
|-------|---------|-------|----------------|
| 1 | 0.1.0 | Core candidate flow | Test landing, question runner, results page |
| 2 | 0.2.0 | Admin authentication | argon2 + JWT, login, protected routes |
| 3 | 0.3.0 | Admin UI | Tests, questions, assessments management |
| 4 | 0.4.0 | YAML import + details | Bulk import, assessment details view |
| 5 | 1.0.0 | Analytics + polish | Question stats, success rates, UI polish |

### MVP Checklist

Core Features:
- [x] Shareable test links (`/t/:slug`)
- [x] One question per page with navigation
- [x] SINGLE and MULTIPLE choice questions
- [x] Weighted scoring system
- [x] Test enable/disable
- [x] Question visibility (public/private/protected)

Admin Features:
- [x] Admin authentication (argon2 + JWT)
- [x] YAML question import with validation
- [x] Test management UI
- [x] Question management UI
- [x] Detailed assessment results view
- [x] Per-question analytics (success rates)

Quality:
- [x] Responsive UI
- [x] Accessibility basics (ARIA roles, skip links)
- [x] Markdown support with syntax highlighting
- [x] Empty states with helpful messages
- [x] Loading states throughout
- [x] Error handling and user feedback

### Database Schema

6 tables:
- **users**: Admin accounts (argon2 hashed passwords)
- **questions**: Question bank with type, options, tags
- **tests**: Test configurations with slug and visibility
- **test_questions**: Many-to-many with weights
- **assessments**: Candidate test sessions
- **assessment_answers**: Individual answers with correctness

### API Endpoints

**Public:**
- `GET /health` - Health check with version
- `GET /api/tests/slug/:slug` - Get test by slug
- `POST /api/assessments/start` - Start assessment
- `POST /api/assessments/:id/answer` - Submit answer
- `POST /api/assessments/:id/submit` - Finalize assessment
- `GET /api/assessments/:id/details` - View results

**Admin (JWT required):**
- `POST /api/auth/login` - Admin login
- Questions CRUD (`/api/questions`)
- Tests CRUD (`/api/tests`)
- `POST /api/questions/import` - YAML import
- `GET /api/tests/:testId/analytics/questions` - Question stats

### Deployment

**Platform**: Render.com
- Backend: Node.js web service
- Frontend: Static site
- Database: PostgreSQL (shared, schema-isolated)

**Schema Strategy**: Single database with schema-per-environment (development, testing, staging, production)

**Security**: Runtime users have data-only permissions, migrations require admin user

### Known Limitations

**YAML Import:**
- No duplicate detection
- No bulk edit/update (import creates new only)
- 5 MB file size limit
- No automated tests for import endpoint

**Assessment Details:**
- Public endpoint (no candidate authentication)
- No export functionality (CSV, PDF)
- No filtering/sorting of questions in detail view

**Analytics:**
- No charts/visualizations (table only)
- Only success rate metric (no time tracking)
- No question-level difficulty recommendations

### Post-MVP Roadmap (v2.0+)

**Question Management:**
- Web UI for question editing (replace YAML workflow)
- Question versioning
- Duplicate detection
- Bulk operations (edit, delete, tag)

**Analytics:**
- Charts and visualizations
- Time spent per question
- Candidate performance trends
- Export to CSV

**Features:**
- Time limits (per test and per question)
- Question randomization
- Candidate answer review before submit
- Email notifications
- Test templates

**Admin:**
- Multi-admin support with roles
- Audit logs
- Dashboard metrics (tests created, candidates assessed)

**Security:**
- GDPR compliance (data export, deletion)
- Candidate authentication (optional)
- Rate limiting

### Dependencies

**Backend:**
- express@4.21.2
- postgres@3.4.5
- drizzle-orm@0.38.6
- argon2@0.41.1
- jsonwebtoken@9.0.2
- multer@2.0.2
- js-yaml@4.1.1
- express-validator@7.2.1

**Frontend:**
- react@18.3.1
- react-router-dom@7.1.1
- tailwindcss@4.0.0
- react-markdown@9.0.3
- react-syntax-highlighter@15.6.1

### Testing

**Backend Unit Tests:**
- 69 tests across 10 test files
- Coverage: Routes, authentication, validation

**Frontend Unit Tests:**
- 31 tests across 7 test files
- Coverage: Components, API utils, UI elements

**E2E Tests:**
- 11 Playwright tests
- Coverage: Candidate flow, admin workflows, analytics

### Contributors

This MVP was developed incrementally over 5 phases with continuous testing and deployment to Render.com.

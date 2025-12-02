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
| `cleverbadge_staging` | Staging runtime | Data only |
| `cleverbadge_prod` | Production runtime | Data only |

**Principle**: Runtime users cannot modify schema structure. This prevents accidental schema changes in production.

### Permission Matrix

| Operation | Runtime User | Admin User |
|-----------|-------------|------------|
| SELECT    | ✅ Yes      | ✅ Yes     |
| INSERT    | ✅ Yes      | ✅ Yes     |
| UPDATE    | ✅ Yes      | ✅ Yes     |
| DELETE    | ✅ Yes      | ✅ Yes     |
| CREATE TABLE | ❌ No    | ✅ Yes     |
| ALTER TABLE | ❌ No     | ✅ Yes     |
| DROP TABLE | ❌ No      | ✅ Yes     |
| CREATE INDEX | ❌ No    | ✅ Yes     |
| GRANT | ❌ No          | ✅ Yes     |
| Access other schemas | ❌ No | ✅ Yes |

### Safety Mechanisms

**Preventing Accidental Schema Changes:**

Runtime users physically cannot modify schema:

```sql
-- Runtime user tries to create table
CREATE TABLE new_table (id INT);
-- ERROR: permission denied for schema production
```

**Schema Isolation:**

Each environment can only access its own schema:

```sql
-- Production user tries to access staging data
SELECT * FROM staging.tests;
-- ERROR: permission denied for schema staging
```

**Admin User Not in Runtime:**

Admin credentials are never stored in application environment variables:

- ✅ `DATABASE_URL` = runtime user (set in Render dashboard)
- ❌ `DATABASE_ADMIN_URL` = not set in runtime (only used manually)

### JWT Authentication
- Admin endpoints require Bearer token in Authorization header
- Token contains: id, username, role
- 7-day expiration

### Connection Strings

**Runtime (Application):**
```
Development: postgresql://cleverbadge_dev:PASSWORD@localhost:5432/cleverbadge
Testing:     postgresql://cleverbadge_test:PASSWORD@localhost:5432/cleverbadge
Staging:     postgresql://cleverbadge_staging:PASSWORD@host:5432/cleverbadge
Production:  postgresql://cleverbadge_prod:PASSWORD@host:5432/cleverbadge
```

**Migrations Only:**
```
postgresql://cleverbadge_admin:PASSWORD@host:5432/cleverbadge
```

### Migration Workflow

Safe migration process:

1. **Develop locally** with admin user + development schema
2. **Test with runtime user** to verify permissions
3. **Deploy to staging** via Render shell with admin user + staging schema
4. **Test staging application** with runtime user
5. **Deploy to production** via Render shell with admin user + production schema
6. **Verify production** works with runtime user

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
- Validation during YAML import catches malformed markdown

### Technical Implementation
- **Frontend**: react-markdown + react-syntax-highlighter + Prism
- **Backend**: Validation with marked library
- **Storage**: Raw markdown in PostgreSQL text fields
- **Theme**: Custom Clever Badge brand colors

### Examples

**Code block in question:**
```yaml
- text: |
    What does this code do?
    ```javascript
    const sum = (a, b) => a + b;
    console.log(sum(5, 3));
    ```
  type: SINGLE
  options:
    - "`8`"
    - "`53`"
  correct_answers:
    - "`8`"
```

**Inline code in options:**
```yaml
- text: "What is the output of `typeof null`?"
  type: SINGLE
  options:
    - text: "`object`"
      is_correct: true
    - text: "`null`"
      is_correct: false
```

**Table in question:**
```yaml
- text: |
    Given these complexities:

    | Operation | Complexity |
    |-----------|------------|
    | Binary Search | O(log n) |
    | Linear Search | O(n) |

    Which is faster?
  type: SINGLE
```

### Performance Considerations
- Markdown libraries add ~4MB to frontend bundle
- Mitigation: Dynamic imports for syntax highlighter
- Memoized MarkdownRenderer component prevents unnecessary re-renders

## Database Schema

### Tables

**users** (1 table)
- Admin authentication
- Fields: id, username, password_hash, created_at, updated_at

**questions** (1 table)
- Question bank with markdown support
- Fields: id, text, type, options, correct_answers, tags, visibility, created_at, updated_at

**tests** (1 table)
- Test definitions
- Fields: id, title, description, slug, is_enabled, visibility, access_slug, created_at, updated_at

**test_questions** (1 table)
- Junction table with weights
- Fields: id, test_id, question_id, weight

**assessments** (1 table)
- Candidate test sessions
- Fields: id, test_id, candidate_name, status, score_percentage, started_at, completed_at

**assessment_answers** (1 table)
- Individual question answers
- Fields: id, assessment_id, question_id, selected_options, is_correct, answered_at

### Relationships

```
users (standalone)

questions ←── test_questions ──→ tests
    ↓              ↓                  ↓
assessment_answers ← assessments ────┘
```

### Schema Isolation

Each environment uses a separate PostgreSQL schema:
- `development` schema → cleverbadge_dev user
- `testing` schema → cleverbadge_test user
- `staging` schema → cleverbadge_staging user
- `production` schema → cleverbadge_prod user

All share the same PostgreSQL database instance but have complete data isolation.

## Default Admin User

On first startup, the application automatically creates a default admin user if none exists:

- **Username**: admin
- **Password**: CleverPassword

**Important**: Change this password immediately in production.

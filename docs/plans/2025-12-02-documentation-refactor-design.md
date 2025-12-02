# Documentation Refactor Design

**Date:** 2025-12-02
**Status:** Approved
**Goal:** Comprehensive but evolutive documentation optimized for developer + AI assistant usage

## Context

Current state:
- 12 root-level docs (~5900 lines) with overlapping content
- 21 v1 implementation plans (historical)
- 7 v2 feature designs in separate folders
- Mix of reference docs, setup guides, and phase summaries

Problems:
- Redundant setup docs (3 files covering similar content)
- Historical artifacts mixed with active reference
- No clear separation between "what exists" vs "what's planned"

## Final Structure

```
docs/
├── ARCHITECTURE.md      # Tech stack, project structure, key patterns
├── API.md               # Endpoint reference (existing, cleaned up)
├── DATABASE.md          # Schema reference (existing, cleaned up)
├── DEVELOPMENT.md       # Setup, testing, deployment (merged from 3 docs)
├── CHANGELOG.md         # Key decisions & learnings from v1
├── examples/
│   └── demo_questions.yaml
└── plans/
    ├── analytics-charts/
    ├── dashboard/
    ├── export-results/
    ├── gdpr/
    ├── question-randomization/
    ├── time-limits/
    └── user-management/
```

## File Content Specifications

### ARCHITECTURE.md (~200-300 lines)

**Purpose:** Single source of truth for understanding the codebase structure and key patterns.

**Sections:**
1. **Tech Stack** - Backend (Node.js/Express + postgres-js + PostgreSQL), Frontend (React + Vite + Tailwind), JavaScript only
2. **Project Structure** - Directory layout for backend/ and frontend/
3. **Key Concepts** - Visibility system, scoring formula, slug generation, schema-per-environment
4. **Security Model** - Runtime users vs Admin user, JWT authentication, role-based access
5. **Markdown Support** - Where it works, syntax highlighting

**Merges content from:** IMPLEMENTATION.md, DATABASE_SECURITY.md, MARKDOWN.md

### DEVELOPMENT.md (~150-200 lines)

**Purpose:** Everything needed to run, test, and deploy the app.

**Sections:**
1. **Prerequisites** - Node.js 18+, PostgreSQL 14+, Git
2. **Local Setup** - Step-by-step: clone, create DB/users, configure .env, migrate, start
3. **Environment Variables** - Backend and frontend env vars
4. **Running the App** - Dev server commands
5. **Testing** - Unit tests (npm test), E2E tests (scripts), test credentials
6. **Database Migrations** - npm run migrate command
7. **Deployment** - Render.com, schema-per-environment, services overview

**Merges content from:** LOCAL_SETUP.md, ENVIRONMENT_SETUP.md, DEPLOYMENT.md

### CHANGELOG.md (~100-150 lines)

**Purpose:** Capture key decisions and learnings from v1 development.

**Sections:**
1. **v1.0.0 - MVP Complete** - What was built (features list)
2. **Key Technical Decisions** - Schema isolation, scoring, visibility, state management, ORM choice
3. **Lessons Learned** - Playwright tips, icon gotchas, testing schema
4. **Phases Summary** - Brief description of phases 1-5

**Extracts from:** PHASE_4_COMPLETE.md, PHASE_5_COMPLETE.md, DEVELOPMENT_PHASES.md, v1 plans

### API.md (cleanup only)

- Remove outdated endpoints
- Ensure all current endpoints documented
- Keep response format examples

### DATABASE.md (cleanup only)

- Ensure schema matches current implementation
- Remove legacy "planned" field notes

## Migration Plan

### Step 1: Create new files
1. Create ARCHITECTURE.md (merge from IMPLEMENTATION.md, DATABASE_SECURITY.md, MARKDOWN.md)
2. Create DEVELOPMENT.md (merge from LOCAL_SETUP.md, ENVIRONMENT_SETUP.md, DEPLOYMENT.md)
3. Create CHANGELOG.md (extract from PHASE_4_COMPLETE.md, PHASE_5_COMPLETE.md, DEVELOPMENT_PHASES.md, TASK4-TESTING-GUIDE.md)

### Step 2: Clean up existing files
4. Review and clean API.md
5. Review and clean DATABASE.md

### Step 3: Reorganize plans folder
6. Move contents of `docs/plans/v2/*` to `docs/plans/`
7. Delete `docs/plans/v1/` folder (21 files)
8. Delete empty `docs/plans/v2/` folder

### Step 4: Delete migrated source files
9. Delete these files from docs root:
   - DATABASE_SECURITY.md
   - DEPLOYMENT.md
   - DEVELOPMENT_PHASES.md
   - ENVIRONMENT_SETUP.md
   - IMPLEMENTATION.md
   - LOCAL_SETUP.md
   - MARKDOWN.md
   - PHASE_4_COMPLETE.md
   - PHASE_5_COMPLETE.md
   - TASK4-TESTING-GUIDE.md

## Files Summary

### Keep (5 files)
- ARCHITECTURE.md (new)
- API.md (existing, cleaned)
- DATABASE.md (existing, cleaned)
- DEVELOPMENT.md (new)
- CHANGELOG.md (new)

### Delete (31 files)
- 10 root docs (merged into new files)
- 21 v1 plan files

### Move (7 folders)
- v2 feature folders → plans/ root

## Success Criteria

- [ ] 5 clean documentation files at docs root
- [ ] All v1 historical content extracted to CHANGELOG.md
- [ ] v2 feature plans accessible at docs/plans/<feature>/
- [ ] No duplicate or overlapping content
- [ ] Each file under 300 lines

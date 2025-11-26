# Question Titles & Test Visibility Design

**Date:** 2025-11-26
**Status:** Approved

## Overview

This design adds:
1. Required titles for questions (easier to find in lists)
2. Author tracking for questions (unique titles per author)
3. Visibility modes for tests and questions (public/private/protected)
4. Random slugs for test links (8 lowercase alphanumeric characters)
5. Slug regeneration with warning

## Schema Changes

### New ENUM Type

```sql
CREATE TYPE visibility_type AS ENUM ('public', 'private', 'protected');
```

### Questions Table

Add columns:
- `title` (VARCHAR 200, NOT NULL) — required for all questions
- `author_id` (UUID, FOREIGN KEY → users.id, NOT NULL) — tracks creator
- `visibility` (visibility_type, NOT NULL, DEFAULT 'private')

Add constraint:
- UNIQUE on `(author_id, title)` — each admin's question titles must be unique

### Tests Table

Add column:
- `visibility` (visibility_type, NOT NULL, DEFAULT 'private')

Modify column:
- `slug` — now contains 8 lowercase alphanumeric characters for new tests

### Assessments Table

Add column:
- `access_slug` (VARCHAR, NOT NULL) — stores the slug used when candidate started

## Visibility Matrix

Questions can only be used in tests with equal or higher restriction level:

| Question ↓ / Test → | public test | private test | protected test |
|---------------------|-------------|--------------|----------------|
| public question     | Yes         | Yes          | Yes            |
| private question    | No          | Yes          | Yes            |
| protected question  | No          | No           | Yes            |

## Visibility Behavior (v1)

| Visibility | Accessible via link | Listed on home page | Requires login |
|------------|---------------------|---------------------|----------------|
| public     | Yes                 | No (v2)             | No             |
| private    | Yes                 | No                  | No             |
| protected  | No ("Access restricted") | No             | v2             |

- `is_enabled=false` still blocks all access regardless of visibility
- Public tests behave like private in v1 (home page listing in v2)
- Protected tests show "Access restricted" message until v2 login

## Slug Generation

- Format: 8 lowercase alphanumeric characters (a-z, 0-9)
- Example: `k7m2x9pq`
- ~2.8 trillion combinations
- Auto-generated on test creation (no manual input)
- Collision check before saving

## Slug Regeneration

- Admin can regenerate from test edit page
- Warning: "Regenerating the link will make the current link invalid. Candidates with the old link will no longer be able to access this test."
- Confirmation required
- Old slug preserved in `assessments.access_slug` for historical reference

## API Changes

### Modified Endpoints

- `POST /api/tests` — auto-generates random slug, accepts `visibility` field
- `PUT /api/tests/:id` — allows updating `visibility`, no slug editing, validates visibility matrix
- `POST /api/questions/import` — requires `title` field, sets `author_id` from JWT, accepts `visibility`
- `GET /api/questions` — add `author_id` filter query param
- `GET /api/tests/slug/:slug` — returns 403 for protected tests

### New Endpoints

- `POST /api/tests/:id/regenerate-slug` — regenerates slug, returns new slug

## YAML Format

```yaml
questions:
  - title: "Capital of France"        # Required
    text: "What is the capital of France?"
    type: SINGLE
    visibility: public                # Optional, defaults to 'private'
    options:
      - Paris
      - London
      - Berlin
    correct_answers:
      - Paris
    tags:
      - geography
```

## Admin UI Changes

### Questions List
- Title as primary column
- Visibility badge (color-coded)
- Author filter dropdown
- Visibility filter dropdown

### Test Create/Edit
- Visibility dropdown (public/private/protected)
- No slug input field (auto-generated)
- Display slug with "Copy link" button
- "Regenerate link" button with warning modal
- Visibility dropdown disabled with tooltip if change would break matrix

### Question Selector (in Test Edit)
- Only show compatible questions based on test visibility
- Or show all but disable incompatible questions with explanation

## Visibility Change Validation

### Changing Question Visibility
Block if it would break existing test assignments:
- Error: "Cannot change question to protected: it is used in private test 'Test Name'"

### Changing Test Visibility
Block if it would break compatibility with assigned questions:
- Error: "Cannot change test to public: it contains private questions: 'Question Title 1', 'Question Title 2'"

## Migration Strategy

### Order of Migrations

1. **Add `visibility` enum type**

2. **Add `visibility` to tests**
   - Add column with DEFAULT 'private'
   - All existing tests become private

3. **Add `access_slug` to assessments**
   - Add nullable column
   - Backfill with current test slug
   - Make NOT NULL

4. **Add `title`, `author_id`, `visibility` to questions**
   - Add columns as nullable
   - Backfill: assign to default admin, generate titles from first ~50 chars of text
   - Add NOT NULL constraints
   - Add unique constraint on `(author_id, title)`

### Breaking Changes

- YAML import requires `title` field — old files without title will fail
- No breaking changes for candidates or existing test links

### Existing Tests

- Keep current slugs (e.g., `javascript-fundamentals`)
- New tests get random slugs
- Admins can regenerate existing slugs manually

## V2 Deferred Features

- Public tests listed on home page
- Protected tests require login and privileges
- Author role with edit restrictions (only own questions)
- Specify author in YAML import

## Final Schema

### Questions Table
| Column          | Type         | Constraints                       |
|-----------------|--------------|-----------------------------------|
| id              | UUID         | PRIMARY KEY                       |
| title           | VARCHAR(200) | NOT NULL                          |
| text            | TEXT         | NOT NULL                          |
| type            | ENUM         | NOT NULL                          |
| visibility      | ENUM         | NOT NULL, DEFAULT 'private'       |
| options         | JSON         | NOT NULL                          |
| correct_answers | JSON         | NOT NULL                          |
| tags            | JSON         | NULL                              |
| author_id       | UUID         | FK → users(id), NOT NULL          |
| created_at      | TIMESTAMP    | NOT NULL, DEFAULT NOW             |
| updated_at      | TIMESTAMP    | NOT NULL, DEFAULT NOW             |

Unique: `(author_id, title)`

### Tests Table
| Column      | Type         | Constraints                       |
|-------------|--------------|-----------------------------------|
| id          | UUID         | PRIMARY KEY                       |
| title       | VARCHAR(200) | NOT NULL                          |
| description | TEXT         | NULL                              |
| slug        | VARCHAR      | UNIQUE, NOT NULL                  |
| visibility  | ENUM         | NOT NULL, DEFAULT 'private'       |
| is_enabled  | BOOLEAN      | NOT NULL, DEFAULT false           |
| created_at  | TIMESTAMP    | NOT NULL, DEFAULT NOW             |
| updated_at  | TIMESTAMP    | NOT NULL, DEFAULT NOW             |

### Assessments Table (new column)
| Column      | Type         | Constraints                       |
|-------------|--------------|-----------------------------------|
| access_slug | VARCHAR      | NOT NULL                          |

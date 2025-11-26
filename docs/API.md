# API Documentation

Base URL (local): `http://localhost:3000`
Base URL (production): `https://api.cleverbadge.com`

## Authentication

Most admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All responses are in JSON format.

**Success Response:**
```json
{
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": "Error message description"
}
```

---

## Endpoints

### Health Check

#### `GET /health`

Check if the API is running.

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-23T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### Login

#### `POST /api/auth/login`

Authenticate admin user and receive JWT token.

**Authentication:** Not required

**Request Body:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Validation:**
- `username`: Required, string, 3-50 characters
- `password`: Required, string, minimum 6 characters

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "created_at": "2025-01-20T10:00:00.000Z"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

## Question Endpoints

### Import Questions from YAML

#### `POST /api/questions/import`

Bulk import questions from a YAML file.

**Authentication:** Required (Admin)

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- File type: `.yaml` or `.yml`

**YAML Format:**
```yaml
questions:
  - title: "Geography - France Capital"
    text: "What is the capital of France?"
    type: "SINGLE"
    visibility: "PUBLIC"
    options:
      - "London"
      - "Paris"
      - "Berlin"
      - "Madrid"
    correct_answers: ["Paris"]
    tags: ["geography", "europe"]

  - title: "Programming Languages Identification"
    text: "Select all programming languages"
    type: "MULTIPLE"
    visibility: "PRIVATE"
    options:
      - "Python"
      - "HTML"
      - "JavaScript"
      - "CSS"
    correct_answers: ["Python", "JavaScript"]
    tags: ["programming", "languages"]
```

**Validation:**
- `title`: Optional, string, 3-200 characters (auto-generated from first 50 chars of text if not provided)
- `text`: Required, string, 10-1000 characters
- `type`: Required, enum: "SINGLE" or "MULTIPLE"
- `visibility`: Optional, enum: "PUBLIC" or "PRIVATE", default: "PUBLIC"
- `options`: Required, array of 2-10 strings
- `correct_answers`: Required, array of strings matching options
- `tags`: Optional, array of strings

**Success Response (201):**
```json
{
  "imported": 25,
  "questions": [
    {
      "id": "uuid-1",
      "title": "Geography - France Capital",
      "text": "What is the capital of France?",
      "type": "SINGLE",
      "visibility": "PUBLIC",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correct_answers": ["Paris"],
      "tags": ["geography", "europe"],
      "author_id": "uuid-admin",
      "created_at": "2025-01-23T10:30:00.000Z"
    }
  ]
}
```

**Error Response (400):**
```json
{
  "error": "Invalid YAML format",
  "details": "Missing required field 'text' in question 3"
}
```

### Get All Questions

#### `GET /api/questions`

Retrieve all questions with optional filtering.

**Authentication:** Required (Admin)

**Query Parameters:**
- `type`: Filter by question type (SINGLE or MULTIPLE)
- `visibility`: Filter by visibility (PUBLIC or PRIVATE)
- `author_id`: Filter by author ID (UUID)
- `tags`: Comma-separated list of tags to filter by
- `limit`: Number of results (default: 100, max: 500)
- `offset`: Pagination offset (default: 0)

**Example:**
```
GET /api/questions?type=SINGLE&visibility=PUBLIC&tags=geography,europe&limit=20&offset=0
```

**Success Response (200):**
```json
{
  "questions": [
    {
      "id": "uuid",
      "title": "Geography - France Capital",
      "text": "What is the capital of France?",
      "type": "SINGLE",
      "visibility": "PUBLIC",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correct_answers": ["Paris"],
      "tags": ["geography", "europe"],
      "author_id": "uuid-admin",
      "author_name": "admin",
      "created_at": "2025-01-23T10:30:00.000Z",
      "updated_at": "2025-01-23T10:30:00.000Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### Get Question by ID

#### `GET /api/questions/:id`

Retrieve a single question by ID.

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "id": "uuid",
  "title": "Geography - France Capital",
  "text": "What is the capital of France?",
  "type": "SINGLE",
  "visibility": "PUBLIC",
  "options": ["London", "Paris", "Berlin", "Madrid"],
  "correct_answers": ["Paris"],
  "tags": ["geography", "europe"],
  "author_id": "uuid-admin",
  "author_name": "admin",
  "created_at": "2025-01-23T10:30:00.000Z",
  "updated_at": "2025-01-23T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "Question not found"
}
```

### Delete Question

#### `DELETE /api/questions/:id`

Delete a question by ID.

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "message": "Question deleted successfully",
  "id": "uuid"
}
```

**Error Response (404):**
```json
{
  "error": "Question not found"
}
```

**Error Response (409):**
```json
{
  "error": "Cannot delete question: currently used in 3 active tests"
}
```

### Get Question Authors

#### `GET /api/questions/authors`

Get a list of all authors who have created questions (for filtering purposes).

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "authors": [
    {
      "id": "uuid-1",
      "username": "admin"
    },
    {
      "id": "uuid-2",
      "username": "john_doe"
    }
  ]
}
```

**Notes:**
- Returns only authors who have created at least one question
- Ordered alphabetically by username

---

## Test Endpoints

### Create Test

#### `POST /api/tests`

Create a new test.

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "title": "JavaScript Fundamentals",
  "description": "Test your knowledge of JavaScript basics",
  "visibility": "PUBLIC",
  "is_enabled": true,
  "pass_threshold": 70
}
```

**Validation:**
- `title`: Required, string, 3-200 characters
- `description`: Optional, string, max 2000 characters
- `visibility`: Optional, enum: "PUBLIC" or "PRIVATE", default: "PUBLIC"
- `is_enabled`: Optional, boolean, default: false
- `pass_threshold`: Optional, integer, 0-100, default: 0 (0 = neutral scoring, >0 = pass/fail mode)

**Notes:**
- `slug` is auto-generated from title (not provided in request body)
- Slug is URL-friendly: lowercase, hyphens, with random suffix for uniqueness

**Success Response (201):**
```json
{
  "id": "uuid",
  "title": "JavaScript Fundamentals",
  "description": "Test your knowledge of JavaScript basics",
  "slug": "javascript-fundamentals-a1b2c3",
  "visibility": "PUBLIC",
  "is_enabled": true,
  "pass_threshold": 70,
  "created_at": "2025-01-23T10:30:00.000Z",
  "updated_at": "2025-01-23T10:30:00.000Z"
}
```

### Get All Tests

#### `GET /api/tests`

Retrieve all tests.

**Authentication:** Required (Admin)

**Query Parameters:**
- `visibility`: Filter by visibility (PUBLIC or PRIVATE)
- `is_enabled`: Filter by enabled status (true/false)
- `limit`: Number of results (default: 100, max: 500)
- `offset`: Pagination offset (default: 0)

**Success Response (200):**
```json
{
  "tests": [
    {
      "id": "uuid",
      "title": "JavaScript Fundamentals",
      "description": "Test your knowledge of JavaScript basics",
      "slug": "javascript-fundamentals-a1b2c3",
      "visibility": "PUBLIC",
      "is_enabled": true,
      "pass_threshold": 70,
      "question_count": 25,
      "created_at": "2025-01-23T10:30:00.000Z",
      "updated_at": "2025-01-23T10:30:00.000Z"
    }
  ],
  "total": 10,
  "limit": 100,
  "offset": 0
}
```

### Get Test by Slug (Public)

#### `GET /api/tests/slug/:slug`

Retrieve test information for candidates (public endpoint).

**Authentication:** Not required

**Query Parameters:**
- `access_slug`: Optional, required for PRIVATE tests to verify access

**Example:**
```
GET /api/tests/slug/javascript-fundamentals-a1b2c3
GET /api/tests/slug/secret-test-x1y2z3?access_slug=abc123def456
```

**Success Response (200):**
```json
{
  "id": "uuid",
  "title": "JavaScript Fundamentals",
  "description": "Test your knowledge of JavaScript basics",
  "slug": "javascript-fundamentals-a1b2c3",
  "visibility": "PUBLIC",
  "question_count": 25
}
```

**Error Response (404):**
```json
{
  "error": "Test not found or disabled"
}
```

**Error Response (403) - PRIVATE test without valid access_slug:**
```json
{
  "error": "Access denied. This is a private test."
}
```

**Notes:**
- PUBLIC tests: Can be accessed by anyone with just the slug
- PRIVATE tests: Require both slug and access_slug in query parameter
- access_slug is a separate 12-character token for PRIVATE tests

### Get Test by ID (Admin)

#### `GET /api/tests/:id`

Retrieve full test details including questions.

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "id": "uuid",
  "title": "JavaScript Fundamentals",
  "description": "Test your knowledge of JavaScript basics",
  "slug": "javascript-fundamentals-a1b2c3",
  "access_slug": "abc123def456",
  "visibility": "PRIVATE",
  "is_enabled": true,
  "pass_threshold": 70,
  "questions": [
    {
      "question_id": "uuid",
      "weight": 1,
      "title": "JavaScript Closures",
      "text": "What is a closure?",
      "type": "SINGLE",
      "visibility": "PUBLIC",
      "options": ["A", "B", "C", "D"],
      "tags": ["javascript", "functions"]
    }
  ],
  "created_at": "2025-01-23T10:30:00.000Z",
  "updated_at": "2025-01-23T10:30:00.000Z"
}
```

**Notes:**
- `access_slug` is only present for PRIVATE tests
- Use access_slug when sharing PRIVATE test links with candidates

### Update Test

#### `PUT /api/tests/:id`

Update test details.

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "title": "JavaScript Advanced",
  "description": "Updated description",
  "visibility": "PRIVATE",
  "is_enabled": false,
  "pass_threshold": 80
}
```

**Notes:**
- Cannot update `slug` or `access_slug` after creation (use regenerate-slug endpoint)
- Changing visibility from PUBLIC to PRIVATE auto-generates access_slug

**Success Response (200):**
```json
{
  "id": "uuid",
  "title": "JavaScript Advanced",
  "description": "Updated description",
  "slug": "javascript-fundamentals-a1b2c3",
  "access_slug": "xyz789abc012",
  "visibility": "PRIVATE",
  "is_enabled": false,
  "pass_threshold": 80,
  "updated_at": "2025-01-23T11:00:00.000Z"
}
```

### Delete Test

#### `DELETE /api/tests/:id`

Delete a test and all associated data.

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "message": "Test deleted successfully",
  "id": "uuid"
}
```

### Regenerate Test Slug

#### `POST /api/tests/:id/regenerate-slug`

Regenerate the main slug for a test (invalidates previous test links).

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "message": "Slug regenerated successfully",
  "slug": "javascript-fundamentals-x9y8z7",
  "access_slug": "def456ghi789"
}
```

**Notes:**
- Generates a new random slug based on the test title
- Also regenerates access_slug for PRIVATE tests
- Invalidates all previous links to this test
- Use with caution - existing links will stop working

### Add Questions to Test

#### `POST /api/tests/:id/questions`

Add questions to a test with weights.

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "questions": [
    {
      "question_id": "uuid-1",
      "weight": 1
    },
    {
      "question_id": "uuid-2",
      "weight": 2
    }
  ]
}
```

**Validation:**
- `questions`: Required, array of objects
- `question_id`: Required, valid UUID
- `weight`: Required, positive integer (1-10)

**Success Response (200):**
```json
{
  "message": "Questions added successfully",
  "added": 2
}
```

### Remove Question from Test

#### `DELETE /api/tests/:testId/questions/:questionId`

Remove a specific question from a test.

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "message": "Question removed from test"
}
```

---

## Assessment Endpoints

### Start Assessment

#### `POST /api/assessments/start`

Create a new assessment instance for a candidate.

**Authentication:** Not required

**Request Body:**
```json
{
  "test_id": "uuid",
  "candidate_name": "John Doe",
  "access_slug": "abc123def456"
}
```

**Validation:**
- `test_id`: Required, valid UUID
- `candidate_name`: Required, string, 2-100 characters
- `access_slug`: Required for PRIVATE tests, optional for PUBLIC tests

**Success Response (201):**
```json
{
  "assessment_id": "uuid",
  "access_slug": "abc123def456",
  "test": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "description": "Test your knowledge of JavaScript basics",
    "visibility": "PRIVATE"
  },
  "questions": [
    {
      "id": "uuid",
      "text": "What is a closure?",
      "type": "SINGLE",
      "options": ["A", "B", "C", "D"],
      "question_number": 1
    }
  ],
  "total_questions": 25,
  "started_at": "2025-01-23T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "Test not found or disabled"
}
```

**Error Response (403) - PRIVATE test without valid access_slug:**
```json
{
  "error": "Access denied. This is a private test."
}
```

**Notes:**
- `access_slug` is stored with the assessment for continued access
- Questions returned do not include correct_answers (for security)

### Submit Answer

#### `POST /api/assessments/:assessmentId/answer`

Submit an answer for a specific question.

**Authentication:** Not required

**Request Body:**
```json
{
  "question_id": "uuid",
  "selected_options": ["Paris"]
}
```

**Validation:**
- `question_id`: Required, valid UUID
- `selected_options`: Required, array of strings matching question options

**Success Response (200):**
```json
{
  "message": "Answer recorded",
  "question_id": "uuid",
  "answered_questions": 5,
  "total_questions": 25
}
```

**Error Response (400):**
```json
{
  "error": "Invalid options selected"
}
```

### Submit Assessment

#### `POST /api/assessments/:assessmentId/submit`

Finalize and score the assessment.

**Authentication:** Not required

**Success Response (200):**
```json
{
  "assessment_id": "uuid",
  "score_percentage": 85.5,
  "total_questions": 25,
  "status": "COMPLETED",
  "completed_at": "2025-01-23T11:00:00.000Z",
  "pass_threshold": 70
}
```

**Error Response (400):**
```json
{
  "error": "Assessment already completed"
}
```

### Get Assessment Results (Admin)

#### `GET /api/assessments/:id`

Get detailed assessment results including all answers.

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "id": "uuid",
  "candidate_name": "John Doe",
  "test": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "slug": "javascript-fundamentals"
  },
  "status": "COMPLETED",
  "score_percentage": 85.5,
  "started_at": "2025-01-23T10:30:00.000Z",
  "completed_at": "2025-01-23T11:00:00.000Z",
  "answers": [
    {
      "question_id": "uuid",
      "question_text": "What is a closure?",
      "selected_options": ["A function that returns another function"],
      "correct_answers": ["A function that returns another function"],
      "is_correct": true,
      "weight": 1
    }
  ]
}
```

### Get All Assessments for Test (Admin)

#### `GET /api/tests/:testId/assessments`

Get all assessments for a specific test.

**Authentication:** Required (Admin)

**Query Parameters:**
- `status`: Filter by status (STARTED or COMPLETED)
- `limit`: Number of results (default: 100, max: 500)
- `offset`: Pagination offset (default: 0)

**Success Response (200):**
```json
{
  "assessments": [
    {
      "id": "uuid",
      "candidate_name": "John Doe",
      "status": "COMPLETED",
      "score_percentage": 85.5,
      "started_at": "2025-01-23T10:30:00.000Z",
      "completed_at": "2025-01-23T11:00:00.000Z"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

---

## Analytics Endpoints

### Get Question Statistics for Test

#### `GET /api/tests/:testId/analytics/questions`

Get success rate statistics for each question in a test.

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "test_id": "uuid",
  "test_title": "JavaScript Fundamentals",
  "total_assessments": 100,
  "question_stats": [
    {
      "question_id": "uuid",
      "question_text": "What is a closure?",
      "total_attempts": 100,
      "correct_attempts": 65,
      "success_rate": 65.0,
      "weight": 1
    }
  ]
}
```

---

## Visibility System

Clever Badge implements a two-level visibility system for questions and tests to control access.

### Visibility Types

- **PUBLIC**: Accessible to all users
- **PRIVATE**: Requires additional access credentials

### Question Visibility

| Visibility | Admin Access | Test Assignment | Candidate View |
|------------|--------------|-----------------|----------------|
| PUBLIC     | Yes (read/write) | Can be added to any test | Visible if in test |
| PRIVATE    | Yes (read/write) | Can be added to tests by author only | Visible if in test |

**Rules:**
- PUBLIC questions: Can be added to any test by any admin
- PRIVATE questions: Can only be added to tests by the question author
- Question visibility does NOT affect candidate access (test visibility controls that)
- Admins can filter questions by visibility and author in the UI

### Test Visibility

| Visibility | Access Requirements | Link Format | Use Case |
|------------|-------------------|-------------|----------|
| PUBLIC     | Just the slug | `/t/{slug}` | Public assessments, certifications |
| PRIVATE    | Slug + access_slug | `/t/{slug}?access={access_slug}` | Private evaluations, controlled access |

**Rules:**
- PUBLIC tests: Anyone with the link can take the test
- PRIVATE tests: Requires both slug and access_slug to access
- access_slug is a 12-character token auto-generated for PRIVATE tests
- Changing test from PUBLIC to PRIVATE auto-generates access_slug
- Changing test from PRIVATE to PUBLIC removes access requirement (access_slug persists but is ignored)

### Access Slug Management

**Generation:**
- Auto-generated when creating a PRIVATE test
- Auto-generated when changing test from PUBLIC to PRIVATE
- Can be manually regenerated via `POST /api/tests/:id/regenerate-slug`

**Format:**
- 12 alphanumeric characters (lowercase)
- Example: `abc123def456`

**Usage:**
- Required as query parameter: `?access_slug=abc123def456`
- Validated on test access and assessment start
- Stored with assessment for continued access during test-taking

**Security Notes:**
- access_slug provides security through obscurity
- Regenerating slug invalidates all previous links
- Use PRIVATE visibility for sensitive assessments

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Authenticated but not authorized |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error - Server error |

---

## Rate Limiting

Currently not implemented in MVP. May be added in future versions.

## CORS

CORS is enabled for the frontend domain configured in environment variables.

Production: `https://cleverbadge.com`
Development: `http://localhost:5173`

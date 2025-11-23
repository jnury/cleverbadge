# Development Phases - MVP Roadmap

Incremental development plan for Clever Badge MVP. Each phase is deployable to Render and includes testable features.

## Strategy

- **5 phases total** - each builds on the previous
- **Deploy after each phase** - test locally first, then deploy to Render
- **Each phase is functional** - can test complete workflows at each stage
- **Progressive enhancement** - start simple, add complexity gradually

---

## Phase 1: Core Candidate Flow (No Auth)

**Goal:** Candidate can take a test end-to-end

**Duration Estimate:** 3-5 days

### Backend Tasks

- [ ] Express server setup with health endpoint
- [ ] Database connection with Drizzle (schema-aware via NODE_ENV)
- [ ] Environment banner and version in health endpoint
- [ ] Questions CRUD API (GET, POST, PUT, DELETE) - **no auth**
- [ ] Tests CRUD API (GET by ID, GET by slug, POST, PUT, DELETE) - **no auth**
- [ ] Test questions API (add questions to test with weights)
- [ ] Assessments API:
  - [ ] POST `/api/assessments/start` - create assessment, return questions (without correct_answers)
  - [ ] POST `/api/assessments/:id/answer` - submit answer for a question
  - [ ] POST `/api/assessments/:id/submit` - finalize and score assessment
- [ ] Scoring logic (SINGLE and MULTIPLE choice, weighted)

### Frontend Tasks

- [ ] Vite + React + Tailwind setup
- [ ] Environment banner component (shows "DEVELOPMENT")
- [ ] Footer component (fetches backend version from /health)
- [ ] Test landing page (`/t/:slug`):
  - [ ] Fetch test by slug
  - [ ] Show test title and description
  - [ ] Candidate name input form
  - [ ] Start button
- [ ] Question runner page (`/t/:slug/run`):
  - [ ] Display one question at a time
  - [ ] Radio buttons for SINGLE, checkboxes for MULTIPLE
  - [ ] Previous/Next navigation
  - [ ] Progress indicator ("Question 3 of 10")
  - [ ] Submit test button on last question
- [ ] Results page (`/t/:slug/result`):
  - [ ] Display final score percentage
  - [ ] Simple success message

### Deployment

- [ ] Update backend package.json version to 0.1.0
- [ ] Update frontend package.json version to 0.1.0
- [ ] Test locally (see testing section below)
- [ ] Deploy backend to Render (testing environment)
- [ ] Deploy frontend to Render (testing environment)
- [ ] Run migrations on Render with admin user
- [ ] Test on Render testing environment

### Testing Phase 1

**Setup test data via API (using Bruno - see bruno-collections/):**

```bash
# 1. Create questions
POST http://localhost:3000/api/questions
Body:
{
  "text": "What is 2+2?",
  "type": "SINGLE",
  "options": ["3", "4", "5", "6"],
  "correct_answers": ["4"],
  "tags": ["math", "easy"]
}

# 2. Create more questions (repeat 5-10 times)

# 3. Create test
POST http://localhost:3000/api/tests
Body:
{
  "title": "Sample Math Test",
  "description": "Test your math skills",
  "slug": "sample-math-test"
}

# 4. Add questions to test (use test_id from step 3, question_ids from step 1-2)
POST http://localhost:3000/api/tests/{test_id}/questions
Body:
{
  "questions": [
    { "question_id": "uuid-1", "weight": 1 },
    { "question_id": "uuid-2", "weight": 1 },
    { "question_id": "uuid-3", "weight": 2 }
  ]
}
```

**Test candidate flow:**
1. Visit `http://localhost:5173/t/sample-math-test`
2. Enter candidate name "Test User"
3. Click "Start Test"
4. Answer questions using prev/next navigation
5. Verify progress indicator updates
6. Submit test
7. Verify final score displays correctly

**Success Criteria:**
- ✅ Candidate can complete full test flow
- ✅ Scoring works correctly (weighted)
- ✅ SINGLE and MULTIPLE choice both work
- ✅ Environment banner shows "DEVELOPMENT"
- ✅ Footer shows both frontend and backend versions
- ✅ Navigation between questions works
- ✅ Progress indicator accurate

---

## Phase 2: Admin Authentication & Dashboard Shell

**Goal:** Secure admin area with login

**Duration Estimate:** 2-3 days

### Backend Tasks

- [ ] Install argon2 and jsonwebtoken
- [ ] Password hashing utility (`utils/password.js`)
- [ ] JWT utility (`utils/jwt.js`)
- [ ] Auth middleware (`middleware/auth.js`)
- [ ] POST `/api/auth/login` endpoint
- [ ] Create admin user script (`npm run create-admin`)
- [ ] Protect all admin endpoints with auth middleware:
  - [ ] Questions CRUD (except GET by ID for assessments)
  - [ ] Tests CRUD (except GET by slug)
  - [ ] Future admin-only endpoints
- [ ] Add `is_enabled` functionality to tests:
  - [ ] GET `/api/tests/slug/:slug` returns 404 if disabled
  - [ ] Assessments cannot be started for disabled tests

### Frontend Tasks

- [ ] Admin login page (`/admin/login`):
  - [ ] Username and password form
  - [ ] Submit and store JWT in localStorage
  - [ ] Redirect to dashboard on success
  - [ ] Show error message on failure
- [ ] Admin dashboard shell (`/admin`):
  - [ ] Protected route (redirect to login if no JWT)
  - [ ] Navigation tabs: Tests, Questions, Assessments, Analytics (placeholders)
  - [ ] Logout button
  - [ ] Welcome message with username
- [ ] API helper to include JWT in requests

### Deployment

- [ ] Update backend package.json version to 0.2.0
- [ ] Update frontend package.json version to 0.2.0
- [ ] Test locally
- [ ] Deploy to Render testing environment
- [ ] Create admin user on Render via shell: `npm run create-admin`
- [ ] Test on Render

### Testing Phase 2

**Test authentication:**
1. Try to access admin endpoints without JWT → Should fail with 401
2. Login with wrong credentials → Should fail with 401
3. Login with correct credentials → Should receive JWT
4. Access admin endpoints with JWT → Should succeed
5. Logout → Should clear JWT

**Test admin dashboard:**
1. Visit `/admin` without login → Should redirect to `/admin/login`
2. Login successfully → Should redirect to `/admin`
3. See navigation tabs (even if content is placeholder)
4. Logout → Should redirect to login

**Test test enable/disable:**
1. Create test via API (with JWT)
2. Set `is_enabled: false`
3. Try to access as candidate → Should get 404
4. Set `is_enabled: true`
5. Access as candidate → Should work

**Success Criteria:**
- ✅ Admin login works
- ✅ JWT stored and included in requests
- ✅ Protected routes redirect to login
- ✅ Admin dashboard accessible after login
- ✅ Disabled tests not accessible to candidates
- ✅ All Phase 1 features still work

---

## Phase 3: Admin Test & Question Management

**Goal:** Admins can fully manage tests and questions via UI

**Duration Estimate:** 4-6 days

### Backend Tasks

- [ ] Ensure all CRUD endpoints properly secured
- [ ] Add validation to all endpoints (express-validator)
- [ ] GET `/api/tests/:testId/questions` - get questions for a test
- [ ] DELETE `/api/tests/:testId/questions/:questionId` - remove question from test
- [ ] Better error messages and validation

### Frontend Tasks

- [ ] **Questions Management Tab:**
  - [ ] List all questions (with pagination/filtering)
  - [ ] Create question form (text, type, options, correct answers, tags)
  - [ ] Edit question form
  - [ ] Delete question (with confirmation)
  - [ ] Filter by type or tags
  - [ ] Display question type and tags clearly

- [ ] **Tests Management Tab:**
  - [ ] List all tests (show title, slug, enabled status, question count)
  - [ ] Create test form (title, description, slug)
  - [ ] Edit test form
  - [ ] Delete test (with confirmation)
  - [ ] Enable/disable toggle
  - [ ] View questions in test (with weights)
  - [ ] Add questions to test:
    - [ ] Select from existing questions
    - [ ] Set weight for each
    - [ ] Multi-select or one-at-a-time
  - [ ] Remove questions from test
  - [ ] Copy test slug for sharing

- [ ] **Assessments Tab (List Only):**
  - [ ] List all assessments for selected test
  - [ ] Show: candidate name, score, status, date
  - [ ] Filter by test
  - [ ] Filter by status (STARTED/COMPLETED)
  - [ ] Basic sorting (by date, by score)
  - [ ] No detail view yet (Phase 4)

- [ ] **UI Components:**
  - [ ] Reusable button component
  - [ ] Reusable input/textarea components
  - [ ] Reusable card component
  - [ ] Modal for confirmations
  - [ ] Loading spinner
  - [ ] Toast notifications for success/errors

### Deployment

- [ ] Update backend package.json version to 0.3.0
- [ ] Update frontend package.json version to 0.3.0
- [ ] Test locally (no more curl needed!)
- [ ] Deploy to Render testing environment
- [ ] Test on Render

### Testing Phase 3

**Test question management:**
1. Create 5 questions via UI
2. Edit a question
3. Delete a question
4. Filter questions by type
5. Verify all CRUD operations work

**Test test management:**
1. Create new test via UI
2. Add 3 questions with different weights
3. Enable the test
4. Copy slug and test as candidate
5. Disable the test
6. Verify candidate can't access
7. Edit test details
8. Remove a question from test
9. Delete test

**Test assessments list:**
1. Have several candidates take tests
2. View assessments list
3. Filter by test
4. Filter by status
5. Sort by date and score

**Success Criteria:**
- ✅ No more curl needed - all admin tasks via UI
- ✅ Questions fully manageable in UI
- ✅ Tests fully manageable in UI
- ✅ Can add/remove questions to/from tests
- ✅ Can see list of assessments
- ✅ All Phase 1 & 2 features still work

---

## Phase 4: YAML Import & Assessment Details

**Goal:** Bulk question import + detailed results viewing

**Duration Estimate:** 2-3 days

### Backend Tasks

- [ ] Install js-yaml and multer
- [ ] POST `/api/questions/import` endpoint:
  - [ ] Accept YAML file upload
  - [ ] Parse and validate YAML
  - [ ] Bulk insert questions (transactional)
  - [ ] Return count of imported questions
  - [ ] Return error details if validation fails
- [ ] GET `/api/assessments/:id` endpoint:
  - [ ] Return full assessment with all answers
  - [ ] Include correct/incorrect flags per question
  - [ ] Include question text and weights

### Frontend Tasks

- [ ] **Questions Tab Enhancement:**
  - [ ] YAML upload form
  - [ ] File input with .yaml/.yml validation
  - [ ] Upload button
  - [ ] Show import results (count, errors)
  - [ ] Link to example YAML file

- [ ] **Assessment Detail View:**
  - [ ] Click on assessment from list
  - [ ] Show candidate name, test title, final score
  - [ ] Show all questions with:
    - [ ] Question text
    - [ ] Candidate's answer (selected options)
    - [ ] Correct answer
    - [ ] Correct/incorrect indicator (✓ or ✗)
    - [ ] Question weight
  - [ ] Back button to list

- [ ] **Error Handling:**
  - [ ] Better error messages throughout
  - [ ] Loading states for all async operations
  - [ ] Confirmation dialogs for destructive actions
  - [ ] Toast notifications for success/error

### Deployment

- [ ] Create `examples/questions.yaml` with 20+ sample questions
- [ ] Update backend package.json version to 0.4.0
- [ ] Update frontend package.json version to 0.4.0
- [ ] Test locally
- [ ] Deploy to Render testing environment
- [ ] Upload sample questions via YAML
- [ ] Test on Render

### Testing Phase 4

**Test YAML import:**
1. Create YAML file with 10 valid questions
2. Upload via UI
3. Verify all 10 questions appear in questions list
4. Create YAML with invalid question (missing field)
5. Upload and verify error message shows which question failed
6. Upload `examples/questions.yaml`
7. Verify large batch import works

**Test assessment details:**
1. Have candidate take test
2. View assessments list
3. Click on assessment
4. Verify all questions shown
5. Verify correct/incorrect indicators accurate
6. Verify candidate's answers displayed
7. Verify correct answers shown
8. Test with both SINGLE and MULTIPLE choice questions

**Success Criteria:**
- ✅ Can import 50+ questions from YAML
- ✅ Import validation catches errors
- ✅ Assessment details show all answers
- ✅ Correct/incorrect clearly indicated
- ✅ Error handling throughout app
- ✅ All previous features still work

---

## Phase 5: Analytics & Final Polish

**Goal:** Question statistics + complete MVP

**Duration Estimate:** 2-3 days

### Backend Tasks

- [ ] GET `/api/tests/:testId/analytics/questions` endpoint:
  - [ ] Calculate per-question success rate
  - [ ] Return: question text, attempts, correct count, success rate %
  - [ ] Only count COMPLETED assessments
  - [ ] Order by success rate (ascending - hardest first)

### Frontend Tasks

- [ ] **Analytics Tab:**
  - [ ] Select test from dropdown
  - [ ] Display table of question statistics:
    - [ ] Question text (truncated)
    - [ ] Total attempts
    - [ ] Correct attempts
    - [ ] Success rate percentage
    - [ ] Visual indicator (color-coded: red < 50%, yellow 50-75%, green > 75%)
  - [ ] Sort by success rate
  - [ ] Identify "too hard" questions (< 30% success)
  - [ ] Identify "too easy" questions (> 90% success)

- [ ] **UI Polish:**
  - [ ] Consistent spacing and layout
  - [ ] Smooth transitions
  - [ ] Loading skeletons
  - [ ] Empty states with helpful messages
  - [ ] Better mobile responsiveness
  - [ ] Accessibility improvements (aria labels)
  - [ ] Keyboard navigation

- [ ] **Final Testing:**
  - [ ] Cross-browser testing (Chrome, Firefox, Safari)
  - [ ] Mobile testing (iOS, Android)
  - [ ] Full end-to-end test of all flows
  - [ ] Performance check (page load times)

### Deployment

- [ ] Update backend package.json version to 1.0.0 (MVP complete!)
- [ ] Update frontend package.json version to 1.0.0
- [ ] Full local testing
- [ ] Deploy to Render STAGING environment (if available)
- [ ] Full testing on staging
- [ ] Deploy to Render PRODUCTION
- [ ] Create first real admin user
- [ ] Import real question bank
- [ ] Create first real tests

### Testing Phase 5

**Test analytics:**
1. Have 10+ candidates take same test
2. View analytics for that test
3. Verify success rates calculated correctly
4. Verify questions sorted by difficulty
5. Verify color coding works
6. Test with multiple tests
7. Identify actually difficult questions

**Final validation:**
1. Complete candidate flow (fresh browser, no dev tools)
2. Complete admin flow (create test from scratch)
3. Import questions via YAML
4. Have friend take test
5. View their results in detail
6. Check analytics
7. Verify all features work on production

**Success Criteria:**
- ✅ Analytics show question difficulty
- ✅ Can identify problem questions
- ✅ UI feels polished and professional
- ✅ Mobile experience good
- ✅ No major bugs
- ✅ All MVP features complete
- ✅ Ready for real users!

---

## Version Numbering

- Phase 1: 0.1.0 (Core candidate flow)
- Phase 2: 0.2.0 (Authentication)
- Phase 3: 0.3.0 (Admin management)
- Phase 4: 0.4.0 (YAML + details)
- Phase 5: 1.0.0 (MVP complete)

Increment patch version (0.1.1, 0.2.1, etc.) for bug fixes within phases.

---

## Bruno API Collection

Create `bruno-collections/clever-badge/` with requests for Phase 1 testing:

**Structure:**
```
bruno-collections/
└── clever-badge/
    ├── health.bru                  # GET /health
    ├── questions/
    │   ├── create-question.bru     # POST /api/questions
    │   ├── list-questions.bru      # GET /api/questions
    │   ├── get-question.bru        # GET /api/questions/:id
    │   ├── update-question.bru     # PUT /api/questions/:id
    │   └── delete-question.bru     # DELETE /api/questions/:id
    ├── tests/
    │   ├── create-test.bru         # POST /api/tests
    │   ├── list-tests.bru          # GET /api/tests
    │   ├── get-test-by-slug.bru    # GET /api/tests/slug/:slug
    │   ├── add-questions.bru       # POST /api/tests/:id/questions
    │   └── update-test.bru         # PUT /api/tests/:id
    └── assessments/
        ├── start-assessment.bru    # POST /api/assessments/start
        ├── submit-answer.bru       # POST /api/assessments/:id/answer
        └── submit-assessment.bru   # POST /api/assessments/:id/submit
```

Example `create-question.bru`:
```
meta {
  name: Create Question
  type: http
  seq: 1
}

post {
  url: {{base_url}}/api/questions
  body: json
  auth: none
}

body:json {
  {
    "text": "What is the capital of France?",
    "type": "SINGLE",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correct_answers": ["Paris"],
    "tags": ["geography", "europe", "easy"]
  }
}
```

Environment variables in Bruno:
```
base_url=http://localhost:3000
```

---

## Deployment Checklist (Each Phase)

### Local Testing
- [ ] All new features work locally
- [ ] All previous features still work
- [ ] No console errors
- [ ] Database migrations successful
- [ ] Version numbers updated in package.json

### Pre-Deployment
- [ ] Commit all changes
- [ ] Update CLAUDE.md if needed
- [ ] Tag release: `git tag v0.X.0`
- [ ] Push: `git push && git push --tags`

### Render Deployment
- [ ] Backend deploys successfully
- [ ] Frontend deploys successfully
- [ ] Check Render logs for errors
- [ ] Run migrations if schema changed:
  ```bash
  # In Render shell
  export DATABASE_ADMIN_URL="postgresql://cleverbadge_admin:PASSWORD@host:5432/db"
  export NODE_ENV="testing"
  npm run db:push
  ```

### Post-Deployment Testing
- [ ] Health endpoint returns correct version
- [ ] Environment banner shows correct environment
- [ ] Footer shows correct versions
- [ ] Test new features on Render
- [ ] Test existing features still work
- [ ] Check for any errors in Render logs

---

## Notes

- **No rollback between phases** - each phase builds on previous
- **Testing environment** on Render uses `testing` schema
- **Keep phases small** - if a phase feels too big, split it
- **Version control** - commit after each completed feature
- **Documentation** - update docs as features are completed
- **Ask for help** - if stuck on a feature, ask before proceeding

---

## Post-MVP (v2.0+)

Not included in these 5 phases, but future enhancements:
- Web UI for question editing (replace YAML)
- Test categories and tags for organization
- Rich analytics dashboard with charts
- CSV export
- Time limits per test/question
- Candidate answer review before submit
- Email notifications
- Bulk operations
- Question versioning
- Test templates

---

## Success Metrics

After Phase 5, you should be able to:
- ✅ Create questions (UI or YAML)
- ✅ Create tests with weighted questions
- ✅ Share test link with candidates
- ✅ Candidates take tests (one question at a time)
- ✅ View detailed results per candidate
- ✅ See which questions are too hard/easy
- ✅ Manage everything via admin UI
- ✅ Deploy to production on Render
- ✅ Have real users take real tests

**You'll have a complete, working MVP!**

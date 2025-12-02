# Question Randomization - Design

> **Status:** Draft
> **Created:** 2025-01-29
> **Author:** Claude + Human collaboration

## Overview

Add randomization to tests for anti-cheating, replayability, and dynamic assessments. Authors can randomize question order, draw from tagged pools, and randomize answer options.

### Key Decisions

- **Question pools:** Draw N questions by tag, rules processed in order, no overlap
- **Validation:** Test fails to start if insufficient questions for any rule
- **Order randomization:** Author toggle (yes/no)
- **Option randomization:** Author toggle + per-question "never randomize" override

---

## Data Model

### New Table: `test_pool_rules`

```sql
test_pool_rules
├── id              UUID PRIMARY KEY
├── test_id         UUID REFERENCES tests(id) ON DELETE CASCADE
├── rule_order      INTEGER NOT NULL  -- processing order (1, 2, 3...)
├── tag_filter      VARCHAR(255) NOT NULL  -- tag to match (e.g., 'javascript')
├── question_count  INTEGER NOT NULL  -- how many to draw
├── created_at      TIMESTAMP DEFAULT NOW()

UNIQUE(test_id, rule_order)
```

### Extended `tests` Table

```sql
-- Add to existing tests table
use_question_pools      BOOLEAN DEFAULT FALSE  -- true = use pool rules, false = use test_questions
randomize_question_order BOOLEAN DEFAULT FALSE
randomize_options       BOOLEAN DEFAULT FALSE
```

### Extended `questions` Table

```sql
-- Add to existing questions table
allow_option_randomization BOOLEAN DEFAULT TRUE  -- false = never randomize this question's options
```

### Extended `assessments` Table

```sql
-- Add to existing assessments table
question_sequence  JSON  -- array of question IDs in the order presented to this candidate
```

---

## Question Selection Modes

### Mode 1: Fixed Questions (current behavior)

- Test uses `test_questions` junction table
- All candidates see same questions in same order (unless randomize_question_order = true)
- `use_question_pools = false`

### Mode 2: Tagged Pools

- Test uses `test_pool_rules` to draw questions dynamically
- Each candidate may get different questions
- `use_question_pools = true`

**Pool Rule Processing:**

```
Rule 1: Draw 5 questions tagged "javascript"
Rule 2: Draw 3 questions tagged "security"
Rule 3: Draw 2 questions tagged "basics"
```

1. Process rules in order (by `rule_order`)
2. For each rule, find questions matching the tag
3. Exclude questions already drawn by previous rules (no overlap)
4. Randomly select `question_count` questions
5. If not enough questions available, **fail** (test cannot start)

---

## Randomization Options

### Question Order Randomization

When `randomize_question_order = true`:
- After selecting questions (fixed or pooled), shuffle the final list
- Each candidate sees questions in different order
- Stored in `assessments.question_sequence` for reference

### Option Randomization

When `randomize_options = true` on test:
- Shuffle answer options for each question
- **Exception:** Questions with `allow_option_randomization = false` keep original order
- Use case: "None of the above" must stay last

**Option order tracking:**
- Store original option indices in answer record
- Display shuffled, but grade against original correct answers

---

## API Changes

### Test CRUD

```javascript
// POST/PUT /api/tests
{
  "title": "JavaScript Assessment",
  "use_question_pools": true,
  "randomize_question_order": true,
  "randomize_options": true,
  "pool_rules": [
    { "rule_order": 1, "tag_filter": "javascript", "question_count": 5 },
    { "rule_order": 2, "tag_filter": "security", "question_count": 3 },
    { "rule_order": 3, "tag_filter": "basics", "question_count": 2 }
  ]
  // ... other fields
}
```

### Validate Pool Rules

```javascript
// POST /api/tests/:id/validate-pools
// Response:
{
  "valid": true,
  "rules": [
    { "rule_order": 1, "tag": "javascript", "required": 5, "available": 12, "status": "ok" },
    { "rule_order": 2, "tag": "security", "required": 3, "available": 8, "status": "ok" },
    { "rule_order": 3, "tag": "basics", "required": 2, "available": 2, "status": "warning" }
  ],
  "total_questions": 10,
  "warnings": ["Rule 3: exactly 2 questions available, no buffer for variety"]
}

// Or if invalid:
{
  "valid": false,
  "rules": [
    { "rule_order": 1, "tag": "kubernetes", "required": 5, "available": 2, "status": "error" }
  ],
  "errors": ["Rule 1: only 2 questions tagged 'kubernetes', need 5"]
}
```

### Start Assessment (with randomization)

```javascript
// POST /api/assessments/start
// Server-side:
// 1. If use_question_pools: execute pool rules, draw questions
// 2. If randomize_question_order: shuffle question list
// 3. If randomize_options: shuffle options (respecting allow_option_randomization)
// 4. Store question_sequence in assessment
// 5. Return questions in randomized order with randomized options

// Response includes:
{
  "assessment_id": "uuid",
  "questions": [
    {
      "id": "uuid",
      "text": "What is closure?",
      "options": [
        { "index": 2, "text": "Option C (was originally 3rd)" },
        { "index": 0, "text": "Option A (was originally 1st)" },
        { "index": 1, "text": "Option B (was originally 2nd)" }
      ]
    }
  ]
}
```

### Question CRUD (option randomization flag)

```javascript
// POST/PUT /api/questions
{
  "text": "Which of the following is correct?",
  "options": {...},
  "allow_option_randomization": false,  // keep "None of the above" last
  // ... other fields
}
```

---

## Frontend Implementation

### Test Configuration UI

In test edit modal, new "Randomization" section in Settings tab:

```
Question Selection
─────────────────────────────────
○ Fixed questions (select specific questions)
● Question pools (draw randomly by tags)

[If pools selected:]
Pool Rules:
┌─────┬──────────────┬───────┬──────────┐
│  #  │ Tag          │ Count │ Status   │
├─────┼──────────────┼───────┼──────────┤
│  1  │ javascript   │   5   │ ✓ 12 avail│
│  2  │ security     │   3   │ ✓ 8 avail │
│  3  │ basics       │   2   │ ⚠ 2 avail │
└─────┴──────────────┴───────┴──────────┘
[+ Add Rule]

Total questions: 10

Randomization
─────────────────────────────────
☑ Randomize question order
☑ Randomize answer options

⚠️ Questions marked "fixed option order" will not be shuffled.
```

### Question Edit UI

In question form, add checkbox:

```
Answer Options
─────────────────────────────────
Option 1: [Paris        ] ○ Correct
Option 2: [London       ] ○ Correct
Option 3: [Berlin       ] ○ Correct
Option 4: [None of above] ● Correct

☐ Lock option order (prevent randomization)
  Use for questions with "None of the above" or ordered options
```

### Pool Rule Editor

- Autocomplete tag input (suggest existing tags)
- Real-time validation (show available count)
- Drag to reorder rules
- Warning/error icons with tooltips

---

## Validation Rules

### On Test Save (with pools)

1. Each rule must have tag and count > 0
2. Show warnings for low availability (available == required)
3. Show errors if available < required
4. Cannot enable test if any rule has errors

### On Test Enable

1. Re-validate all pool rules
2. Block enable if insufficient questions
3. Show clear error message

### On Assessment Start

1. Re-check question availability (questions may have been deleted)
2. If any rule fails, return error: "Test configuration error. Please contact administrator."

---

## Edge Cases

### Question Deleted After Test Created

- Pool validation runs at test enable and assessment start
- If question deleted, available count decreases
- May cause previously valid test to become invalid
- Admin notified if enabled test becomes invalid

### Tag Renamed/Deleted

- Questions keep their tags (array field)
- If tag deleted from all questions, pool rule returns 0 available
- Test validation fails

### Overlapping Tags

Example: Question tagged both "javascript" and "security"
- Rule 1 draws for "javascript", this question selected
- Rule 2 draws for "security", this question excluded (already used)
- No overlap ensures predictable distribution

---

## Implementation Phases

### Phase 1 - Question Order Randomization
- [ ] Add randomize_question_order to tests table
- [ ] Shuffle questions on assessment start
- [ ] Store question_sequence in assessments
- [ ] UI toggle in test settings

### Phase 2 - Option Randomization
- [ ] Add randomize_options to tests table
- [ ] Add allow_option_randomization to questions table
- [ ] Shuffle options on assessment start (respecting flag)
- [ ] Track original indices for grading
- [ ] UI: test toggle + question checkbox

### Phase 3 - Question Pools
- [ ] Create test_pool_rules table
- [ ] Add use_question_pools to tests table
- [ ] Pool rule CRUD endpoints
- [ ] Pool validation endpoint
- [ ] Draw questions on assessment start
- [ ] UI: pool rule editor

### Phase 4 - Validation & Safety
- [ ] Real-time validation in UI
- [ ] Block test enable if invalid
- [ ] Re-validate on assessment start
- [ ] Admin notifications for invalid tests

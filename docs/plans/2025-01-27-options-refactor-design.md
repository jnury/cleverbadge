# Options Refactor & Test Preview Design

**Date:** 2025-01-27
**Status:** Approved

## Overview

Refactor question options to support answer randomization, embedded correctness with explanations, and configurable feedback visibility. Add test preview feature for admins and LocalStorage persistence for candidates.

## Goals

1. Store correct answers as `is_correct` boolean per option (remove `correct_answers` array)
2. Enable answer randomization at render time via stable option IDs
3. Add optional explanations per option
4. Configure when/what feedback candidates see per test
5. Persist assessment progress in LocalStorage
6. Admin test preview with answer visibility toggle

---

## Data Model Changes

### Questions Table - `options` Column

**Current format:**
```json
{
  "options": ["London", "Paris", "Berlin"],
  "correct_answers": ["Paris"]
}
```

**New format:**
```json
{
  "options": {
    "0": {"text": "London", "is_correct": false, "explanation": "Capital of UK"},
    "1": {"text": "Paris", "is_correct": true, "explanation": "Correct!"},
    "2": {"text": "Berlin", "is_correct": false}
  }
}
```

- `correct_answers` column **removed** from questions table
- Each option keyed by integer string (`"0"`, `"1"`, `"2"`)
- `explanation` is optional
- Enables answer randomization by shuffling keys at render time

### Tests Table - New Columns

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `show_explanations` | ENUM | `'never'` | `never`, `after_each_question`, `after_submit` |
| `explanation_scope` | ENUM | `'selected_only'` | `selected_only`, `all_answers` |

### Validation Rules

| Question Type | Rule |
|---------------|------|
| SINGLE | Exactly 1 option with `is_correct: true` |
| MULTIPLE | At least 1 option with `is_correct: true` |

---

## YAML Import Format

### New Format

```yaml
# Root-level array of questions
- title: "Capital of France"
  text: "What is the capital of France?"
  type: "SINGLE"
  visibility: "public"
  options:
    - text: "London"
      is_correct: false
      explanation: "London is the capital of the United Kingdom."
    - text: "Paris"
      is_correct: true
      explanation: "Paris has been France's capital since the 10th century."
    - text: "Berlin"
      is_correct: false
  tags: ["geography"]

- title: "Prime Numbers"
  text: "Select all prime numbers"
  type: "MULTIPLE"
  options:
    - text: "2"
      is_correct: true
    - text: "3"
      is_correct: true
    - text: "4"
      is_correct: false
      explanation: "4 = 2 x 2, so it's not prime."
    - text: "5"
      is_correct: true
  tags: ["math"]
```

### Key Points

- `options` is an array (not dict) in YAML for readability
- Backend converts to dict on import: array index becomes key (`"0"`, `"1"`, `"2"`)
- `explanation` is optional per option
- `correct_answers` field no longer exists

### Documentation Update

The YAML Format Reference tab must clearly state:
> **Important:** Option indices are 0-based. The first option is index 0, the second is index 1, etc.

---

## API Responses & Security

### What Gets Sent to Candidates

**During test (`POST /assessments/start`):**
```json
{
  "questions": [
    {
      "id": "uuid",
      "title": "Capital of France",
      "text": "What is the capital of France?",
      "type": "SINGLE",
      "options": [
        {"id": "2", "text": "Berlin"},
        {"id": "0", "text": "London"},
        {"id": "1", "text": "Paris"}
      ]
    }
  ]
}
```
- Options shuffled (randomized order)
- No `is_correct`, no `explanation`
- Candidate selects by `id` (e.g., `"1"` for Paris)

**After each question (`POST /assessments/:id/answer`):**

If test has `show_explanations: "after_each_question"`:
```json
{
  "message": "Answer recorded",
  "feedback": {
    "selected": [
      {"id": "1", "is_correct": true, "explanation": "Correct!"}
    ],
    "all": null
  }
}
```
- `feedback.all` populated only if `explanation_scope: "all_answers"`
- `feedback` is `null` if `show_explanations: "never"`

**After submit (`POST /assessments/:id/submit`):**

Same logic - include feedback based on test settings.

### Admin Endpoints

Admin routes (`GET /api/questions/:id`, `GET /api/tests/:id/questions`) continue to return full data including `is_correct` and `explanation`.

---

## Assessment Persistence (LocalStorage)

### Storage Key

```
cleverbadge_assessment_{test_slug}
```

Using test slug ensures one in-progress assessment per test.

### Stored Data

```json
{
  "assessmentId": "uuid",
  "candidateName": "John Doe",
  "currentQuestionIndex": 2,
  "answers": {
    "question-uuid-1": ["1"],
    "question-uuid-2": ["0", "2"]
  },
  "startedAt": "2025-01-15T10:30:00Z"
}
```

### Lifecycle

| Event | Action |
|-------|--------|
| Assessment started | Save to LocalStorage |
| Answer submitted | Update `answers` and `currentQuestionIndex` |
| Page refresh | Check LocalStorage, restore if exists, resume at `currentQuestionIndex` |
| Assessment submitted | Clear LocalStorage |
| Assessment expired (optional) | Clear if `startedAt` > 24h ago |

### Resume Flow

On `TestLanding` page load:
1. Check LocalStorage for existing assessment
2. If found and not expired:
   - Show "Resume assessment?" prompt with candidate name
   - Option to resume or start fresh
3. If starting fresh, clear old data

---

## Test Preview Feature

### Route

```
/admin/tests/:testId/preview
```

Accessible from Tests management page via "Preview" button on each test row.

### UI Behavior

- Renders the same `QuestionRunner` component candidates see
- One question at a time, same navigation
- No assessment record created (pure frontend preview)

### Admin Toolbar

Floating toolbar at top of preview page:

```
+----------------------------------------------------------+
|  Preview Mode    [Show Answers: OFF/ON]    [Exit]        |
+----------------------------------------------------------+
```

| Toggle State | Behavior |
|--------------|----------|
| Show Answers: OFF | Options displayed normally, no hints |
| Show Answers: ON | Correct options highlighted with green border, explanations shown below each option |

### Implementation Notes

- Preview fetches questions via existing admin endpoint (includes `is_correct` and `explanation`)
- Toggle controls whether to display correctness indicators
- No backend changes needed for preview itself
- Questions displayed in shuffled order (same as candidate would see)

### Exit Behavior

"Exit" button returns to `/admin` tests tab.

---

## Files to Change

### Backend

| File | Changes |
|------|---------|
| `db/migrations/` | New migration: drop `correct_answers` column, add test settings columns |
| `routes/questions.js` | Update validation for new options format, remove `correct_answers` handling |
| `routes/import.js` | Parse new YAML format, convert array to dict, validate correct answer counts |
| `routes/assessments.js` | Shuffle options on `/start`, include feedback based on test settings |
| `routes/tests.js` | Handle new `show_explanations` and `explanation_scope` fields |

### Frontend

| File | Changes |
|------|---------|
| `pages/TestLanding.jsx` | Check LocalStorage for resume, show resume prompt |
| `pages/QuestionRunner.jsx` | Use `option.id` for selection, save to LocalStorage, display feedback if provided |
| `pages/TestResults.jsx` | Display explanations based on what backend returns |
| `pages/admin/TestsTab.jsx` | Add Preview button, add test settings fields to form |
| `pages/admin/TestPreview.jsx` | New component for preview mode with answer toggle |
| `components/YamlUpload.jsx` | Update format reference documentation |
| `public/questions-example.yaml` | Update to new format |

### Database

- Drop `questions.correct_answers` column
- Add `tests.show_explanations` ENUM column (default: `'never'`)
- Add `tests.explanation_scope` ENUM column (default: `'selected_only'`)

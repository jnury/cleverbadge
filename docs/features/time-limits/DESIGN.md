# Time Limits - Design

> **Status:** Draft
> **Created:** 2025-01-29
> **Author:** Claude + Human collaboration

## Overview

Add time constraints to tests for urgency, fairness, and realistic assessment conditions. Authors can choose no limit, a test-level timer, or per-question timers.

### Key Decisions

- **Three modes:** None / Test-level / Question-level (author chooses per test)
- **Test-level:** Total time for entire test, auto-submit when expired
- **Question-level:** Uniform time per question, auto-advance, no going back
- **Timer display:** Always visible with warning colors when time is low

---

## Data Model

### Extended `tests` Table

```sql
-- Add to existing tests table
timer_mode          ENUM('none', 'test_level', 'question_level') DEFAULT 'none'
test_duration_minutes    INTEGER  -- for test_level mode (e.g., 30, 60, 90)
question_duration_seconds INTEGER  -- for question_level mode (e.g., 30, 60, 90, 120)
```

### Extended `assessments` Table

```sql
-- Add to existing assessments table
time_started_at     TIMESTAMP  -- when candidate started (for timing)
time_expired        BOOLEAN DEFAULT FALSE  -- true if auto-submitted due to timeout
```

### Extended `assessment_answers` Table

```sql
-- Add to existing assessment_answers table
time_spent_seconds  INTEGER  -- how long candidate spent on this question
```

---

## Timer Modes

### Mode 1: No Timer (`none`)

Current behavior. No time constraints.

### Mode 2: Test-Level Timer (`test_level`)

- Author sets total duration in minutes
- Countdown starts when candidate begins test
- Timer visible in header throughout test
- Candidate can navigate freely between questions
- When time expires: **auto-submit immediately**
- Unanswered questions count as wrong

**Flow:**
```
Start test → Timer begins → Answer questions (any order) → Time expires → Auto-submit → Results
```

### Mode 3: Question-Level Timer (`question_level`)

- Author sets uniform duration in seconds (same for all questions)
- Each question has its own countdown
- When question time expires: **auto-advance to next question**
- Cannot go back to previous questions
- Unanswered/skipped questions count as wrong

**Flow:**
```
Start test → Q1 timer starts → Answer or timeout → Auto-advance → Q2 timer starts → ... → Last question → Submit → Results
```

---

## API Changes

### Test CRUD

```javascript
// POST/PUT /api/tests
{
  "title": "JavaScript Assessment",
  "timer_mode": "test_level",        // 'none' | 'test_level' | 'question_level'
  "test_duration_minutes": 60,       // required if timer_mode = 'test_level'
  "question_duration_seconds": 90,   // required if timer_mode = 'question_level'
  // ... other fields
}
```

### Start Assessment Response

```javascript
// POST /api/assessments/start response
{
  "assessment_id": "uuid",
  "questions": [...],
  "timer_mode": "test_level",
  "test_duration_minutes": 60,
  "question_duration_seconds": null,
  "server_time": "2025-01-29T10:00:00Z"  // for sync
}
```

### Submit Answer (track time spent)

```javascript
// POST /api/assessments/:id/answer
{
  "question_id": "uuid",
  "selected_options": [0, 2],
  "time_spent_seconds": 45  // tracked by frontend
}
```

### Auto-Submit Endpoint

```javascript
// POST /api/assessments/:id/timeout
// Called by frontend when test time expires
// Marks assessment as time_expired = true, calculates score
```

---

## Frontend Implementation

### Timer Component

```jsx
<Timer
  mode="test_level"
  totalSeconds={3600}
  onExpire={handleAutoSubmit}
  warningThreshold={0.2}  // turn red at 20% remaining
/>
```

**Display states:**
- **Normal:** White/neutral background, countdown visible
- **Warning:** Yellow background, starts at 20% time remaining
- **Critical:** Red background, pulsing, last 10% of time
- **Expired:** Flash "Time's Up!", trigger auto-submit

### Test-Level Timer Behavior

- Timer in sticky header, always visible
- Shows: "Time remaining: 45:23"
- Navigation between questions allowed
- On expire: modal "Time's up! Submitting your test...", then auto-submit

### Question-Level Timer Behavior

- Timer below question number: "Time for this question: 0:45"
- Progress bar shrinking
- Previous/Next buttons hidden (linear flow only)
- On expire: brief flash "Moving to next question...", auto-advance
- Cannot return to previous questions

### Candidate Warning

Before starting a timed test, show warning:

```
⏱️ This test has a time limit

You have 60 minutes to complete 30 questions.
Once you start, the timer cannot be paused.

[Start Test]
```

For question-level:

```
⏱️ This test has timed questions

Each question has a 90-second time limit.
Questions will auto-advance when time runs out.
You cannot go back to previous questions.

[Start Test]
```

---

## Edge Cases

### Browser Refresh / Tab Close

- **Test-level:** Time continues server-side. On resume, show remaining time based on `time_started_at`.
- **Question-level:** Current question time lost. Resume at next question or same question with fresh timer (author choice - default: same question, fresh timer).

### Network Issues

- Frontend continues countdown locally
- If submit fails due to network, retry with exponential backoff
- Store answers in localStorage as backup
- Show "Reconnecting..." indicator

### Clock Manipulation

- Server validates timing on submit
- `time_started_at` is server timestamp
- If submission time < start time + duration, accept
- If submission time > start time + duration + grace period (30s), mark as `time_expired`

---

## Admin Analytics

Track timing data for insights:

- Average time per question
- Questions where most time is spent
- Completion rate vs timeout rate
- Time distribution histogram

---

## Implementation Phases

### Phase 1 - Test-Level Timer
- [ ] Add timer fields to tests table
- [ ] Update test CRUD endpoints
- [ ] Timer component (display only)
- [ ] Auto-submit on timeout
- [ ] Warning modal before starting

### Phase 2 - Question-Level Timer
- [ ] Question timer logic
- [ ] Auto-advance behavior
- [ ] Disable navigation in question-level mode
- [ ] Track time_spent_seconds per answer

### Phase 3 - Resilience
- [ ] Handle browser refresh (resume with correct time)
- [ ] LocalStorage backup for answers
- [ ] Server-side time validation
- [ ] Network error handling

### Phase 4 - Analytics
- [ ] Time spent tracking in database
- [ ] Analytics dashboard: timing insights
- [ ] Export timing data

---

## Test Configuration UI

In test edit modal, Settings tab:

```
Timer Settings
─────────────────────────────────
Timer Mode: [None ▼]
            - None
            - Test-level (total time)
            - Question-level (per question)

[If test-level selected:]
Total Duration: [60] minutes

[If question-level selected:]
Time per Question: [90] seconds

⚠️ Question-level mode disables navigation.
   Candidates cannot go back to previous questions.
```

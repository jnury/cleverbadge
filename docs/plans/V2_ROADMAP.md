# CleverBadge V2 Roadmap

> **Status:** Active
> **Created:** 2025-12-03
> **Purpose:** High-level implementation plan for V2 features

---

## Overview

V2 transforms CleverBadge from a single-admin MVP into a multi-user platform with enhanced features for test management, analytics, and GDPR compliance.

**Current state:** v2.0.0 - Dashboard refactoring complete (admin → dashboard routes, login modal)

---

## Phases

### Phase 1: User Management Foundation
**Priority:** Critical - Foundation for all other features
**Dependencies:** None

Transform the single-admin system into a multi-user platform with roles.

**Features:**
- User registration with email/password
- Email verification flow
- Password reset mechanism
- User profiles (display name, bio)
- Three roles: USER → AUTHOR → ADMIN
- Author request/approval workflow
- Admin user management panel

**New tables:** `users` (extended), `author_requests`, `email_tokens`, `user_consents`

**Design document:** `docs/plans/user-management/DESIGN.md`

---

### Phase 2: GDPR Compliance
**Priority:** Critical - Legal requirement for EU users
**Dependencies:** Phase 1 (User Management)

Implement GDPR requirements for data protection.

**Features:**
- Consent collection at registration and assessment start
- Data export (Right of Access / Portability)
- Account deletion with grace period (Right to Erasure)
- Profile editing (Right to Rectification)
- Audit logging for data access
- Data retention policies with automatic cleanup
- Privacy policy page
- Cookie/localStorage consent banner
- Rate limiting on auth endpoints

**New tables:** `user_consents`, `audit_logs`, `gdpr_requests`

**Design documents:**
- `docs/plans/gdpr/TECHNICAL_GUIDELINES_GDPR_V2.md`
- `docs/plans/gdpr/GDPR_FACTSHEET.md`

---

### Phase 3: Analytics Enhancement
**Priority:** High - Improves user value
**Dependencies:** None (can run in parallel with Phase 2)

Add visual analytics to help admins understand test performance.

**Features:**
- Score distribution histogram with smart buckets
- Time range filtering (7d/30d/90d/all/custom)
- Summary statistics (avg, median, std dev)
- Empty states and loading skeletons
- Chart library integration (Recharts)

**New endpoints:** `GET /api/tests/:testId/analytics/score-distribution`

**Design document:** `docs/plans/analytics-charts/DESIGN.md`

---

### Phase 4: Time Limits
**Priority:** Medium - Requested feature
**Dependencies:** None (can run in parallel)

Add time constraints to tests for urgency and fairness.

**Features:**
- Three modes: None / Test-level / Question-level
- Test-level: total time for entire test, auto-submit on expiry
- Question-level: per-question timer, auto-advance, no going back
- Timer UI with warning colors (yellow at 20%, red at 10%)
- Server-side time validation
- Resume handling for browser refresh
- Time spent tracking per question

**Schema changes:** `tests` (timer_mode, test_duration_minutes, question_duration_seconds), `assessments` (time_started_at, time_expired), `assessment_answers` (time_spent_seconds)

**Design document:** `docs/plans/time-limits/DESIGN.md`

---

### Phase 5: Question Randomization
**Priority:** Medium - Anti-cheating feature
**Dependencies:** None (can run in parallel)

Add randomization for anti-cheating and replayability.

**Features:**
- Question order randomization (toggle per test)
- Option order randomization (toggle per test, override per question)
- Tagged question pools (draw N questions from tag)
- Pool rule validation (availability checks)
- Question sequence audit trail

**New tables:** `test_pool_rules`

**Schema changes:** `tests` (use_question_pools, randomize_question_order, randomize_options), `questions` (allow_option_randomization), `assessments` (question_sequence)

**Design document:** `docs/plans/question-randomization/DESIGN.md`

---

### Phase 6: Export Results
**Priority:** Medium - Admin productivity
**Dependencies:** Phase 3 (Analytics) for PDF charts

Enable admins to export assessment data in multiple formats.

**Features:**
- CSV export (assessment list, detailed results)
- XLSX export (multi-sheet, formatted)
- PDF reports (individual candidate, test summary)
- Bulk export (ZIP with multiple PDFs)
- Export modal with scope/format selection
- Date range filtering
- Anonymization option

**New endpoints:**
- `GET /api/tests/:testId/export/assessments`
- `GET /api/tests/:testId/export/stats`
- `GET /api/assessments/:assessmentId/report/pdf`
- `GET /api/tests/:testId/report/pdf`
- `POST /api/tests/:testId/export/bulk-candidates`

**Libraries:** csv-stringify, exceljs, pdfkit

**Design document:** `docs/plans/export-results/DESIGN.md`

---

## Phase Dependencies Graph

```
Phase 1 (User Management)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 2 (GDPR)     Phase 3 (Analytics)
                       │
                       ▼
                   Phase 6 (Export)

Phase 4 (Time Limits)     ← Independent
Phase 5 (Randomization)   ← Independent
```

---

## Implementation Order Recommendation

**Sequential (must be in order):**
1. **Phase 1: User Management** - Foundation for everything
2. **Phase 2: GDPR** - Legal requirement, depends on user system

**Parallel track A (after Phase 1):**
3. **Phase 3: Analytics**
4. **Phase 6: Export** (after Analytics for PDF charts)

**Parallel track B (any time):**
5. **Phase 4: Time Limits**
6. **Phase 5: Question Randomization**

---

## Effort Estimates (Relative)

| Phase | Complexity | New Tables | New Endpoints | Frontend Pages |
|-------|------------|------------|---------------|----------------|
| 1. User Management | High | 3 | 15+ | 5 |
| 2. GDPR Compliance | High | 3 | 10+ | 3 |
| 3. Analytics Charts | Medium | 0 | 1 | 0 (tab enhancement) |
| 4. Time Limits | Medium | 0 | 2 | 0 (component enhancements) |
| 5. Randomization | Medium | 1 | 2 | 0 (settings enhancements) |
| 6. Export Results | Medium-High | 0 | 5 | 1 (modal) |

---

## Risk Considerations

### Phase 1 (User Management)
- Email service selection/integration
- Migration strategy for existing admin users
- Session management complexity

### Phase 2 (GDPR)
- Legal review of implementation
- Data retention policy decisions
- Audit logging performance impact

### Phase 3 (Analytics)
- Chart library bundle size
- Performance with large datasets

### Phase 4 (Time Limits)
- Clock manipulation prevention
- Network resilience during timed tests
- Edge cases for browser refresh

### Phase 5 (Randomization)
- Pool rule validation edge cases
- Question availability changes after test creation

### Phase 6 (Export)
- Large export file handling
- PDF generation library selection
- Memory usage for bulk exports

---

## Getting Started

For each phase, there is a detailed design document in `docs/plans/{feature}/DESIGN.md`. When ready to implement a phase:

1. Review the DESIGN.md for that feature
2. Create a detailed implementation plan (like dashboard-implementation.md)
3. Use subagent-driven development to implement each task
4. Run code review after each task
5. Run full test suite before merging

---

## Version Milestones

| Version | Features |
|---------|----------|
| v2.0.0 | Dashboard refactoring (complete) |
| v2.1.0 | User Management (Phase 1) |
| v2.2.0 | GDPR Compliance (Phase 2) |
| v2.3.0 | Analytics Charts (Phase 3) |
| v2.4.0 | Time Limits (Phase 4) |
| v2.5.0 | Question Randomization (Phase 5) |
| v2.6.0 | Export Results (Phase 6) |

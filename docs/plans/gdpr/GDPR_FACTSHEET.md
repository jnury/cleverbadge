# GDPR Compliance Factsheet - CleverBadge

**Document Version:** 1.0
**Date:** December 2025
**Purpose:** Technical factsheet for legal review of GDPR compliance

---

## 1. Application Overview

**CleverBadge** is an online skills assessment platform where:
- **Administrators** create multiple-choice question tests
- **Candidates** (anonymous users) take tests via shareable links
- **Results** are stored and viewable by administrators

### Technical Stack
| Component | Technology | Hosting |
|-----------|------------|---------|
| Backend | Node.js / Express | Render.com (Oregon, USA) |
| Frontend | React / Vite | Render.com (Oregon, USA) |
| Database | PostgreSQL 14 | Render.com (Oregon, USA) |

---

## 2. Personal Data Inventory

### 2.1 Data Collected from Administrators

| Field | Type | Purpose | Retention |
|-------|------|---------|-----------|
| Username | String (2-50 chars) | Authentication | Indefinite |
| Password | Argon2id hash | Authentication | Indefinite |
| User ID | UUID | Internal reference | Indefinite |
| Created/Updated timestamps | DateTime | Audit | Indefinite |

**Note:** No email addresses collected. Password recovery not implemented.

### 2.2 Data Collected from Candidates (Test Takers)

| Field | Type | Purpose | Retention |
|-------|------|---------|-----------|
| Candidate Name | String (2-100 chars) | Identification on results | Indefinite |
| Assessment ID | UUID | Link answers to assessment | Indefinite |
| Selected Answers | JSON array | Scoring | Indefinite |
| Score Percentage | Decimal | Result display | Indefinite |
| Started/Completed timestamps | DateTime | Audit | Indefinite |
| Assessment Status | Enum | Workflow tracking | Indefinite |

### 2.3 Data NOT Collected

- IP addresses
- Email addresses (candidates)
- Browser/device fingerprints
- Geolocation
- Cookies
- User agent strings
- Referrer data
- Third-party tracking data

---

## 3. Data Processing Activities

### 3.1 Assessment Workflow

```
1. Candidate enters name → Stored in database
2. Candidate answers questions → Each answer stored with timestamp
3. Candidate submits test → Score calculated and stored
4. Admin views results → Full assessment data accessible
```

### 3.2 Lawful Basis for Processing

| Activity | Suggested Lawful Basis | Notes |
|----------|------------------------|-------|
| Storing candidate name | Legitimate interest / Consent | Name required to identify results |
| Storing answers | Contract performance | Essential for test functionality |
| Calculating scores | Contract performance | Essential for test functionality |
| Admin access to results | Legitimate interest | Business purpose of the platform |

### 3.3 Automated Decision-Making

- **Scoring is automated** but fully transparent
- Formula: `(earned_points / max_points) × 100`
- Pass/fail threshold configurable per test
- **No profiling** - scores not used for further automated decisions

---

## 4. Data Storage & Security

### 4.1 Database Schema (PII-containing tables)

**`users` table** (Administrators only)
```sql
id              UUID PRIMARY KEY
username        VARCHAR UNIQUE NOT NULL
password_hash   VARCHAR NOT NULL  -- Argon2id hashed
role            VARCHAR DEFAULT 'ADMIN'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**`assessments` table** (Candidates)
```sql
id                UUID PRIMARY KEY
test_id           UUID REFERENCES tests
candidate_name    VARCHAR(100) NOT NULL  -- PII
status            ENUM (STARTED, COMPLETED, ABANDONED)
score_percentage  DECIMAL
started_at        TIMESTAMP
completed_at      TIMESTAMP
```

**`assessment_answers` table**
```sql
id                UUID PRIMARY KEY
assessment_id     UUID REFERENCES assessments ON DELETE CASCADE
question_id       UUID REFERENCES questions
selected_options  JSONB  -- Array of selected option IDs
is_correct        BOOLEAN
answered_at       TIMESTAMP
```

### 4.2 Security Measures

| Measure | Status | Details |
|---------|--------|---------|
| Password hashing | ✅ Implemented | Argon2id (memory: 64MB, iterations: 3) |
| HTTPS | ✅ Enforced | Via Render.com in production |
| JWT authentication | ✅ Implemented | 7-day expiration, admin-only |
| Input validation | ✅ Implemented | express-validator library |
| SQL injection protection | ✅ Implemented | Parameterized queries (postgres.js) |
| XSS protection | ✅ Implemented | React escaping + security headers |
| CORS | ✅ Configured | Restricted to allowed origins |
| Database isolation | ✅ Implemented | Separate schemas per environment |

### 4.3 Security Headers (Production)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### 4.4 Security Gaps

| Gap | Risk Level | Notes |
|-----|------------|-------|
| No encryption at rest | Medium | Database not encrypted |
| No rate limiting | Medium | Brute force possible on login |
| No audit logging | Medium | Cannot track admin data access |
| JWT in localStorage | Low | XSS could expose token |

---

## 5. Data Retention & Deletion

### 5.1 Current Retention Policy

| Data Type | Retention | Deletion Method |
|-----------|-----------|-----------------|
| Admin accounts | Indefinite | Manual by DB admin |
| Completed assessments | Indefinite | Admin bulk-delete |
| Abandoned assessments | Indefinite | Admin bulk-delete |
| Assessment answers | Indefinite | Cascade on assessment delete |

### 5.2 Automatic Processes

- **Assessment timeout:** Tests auto-marked as ABANDONED after 2 hours of inactivity
- **Cleanup job:** Runs every 5 minutes to check for timeouts
- **No automatic deletion:** Abandoned assessments remain in database

### 5.3 Manual Deletion Capabilities

| Action | Available | Who Can Perform |
|--------|-----------|-----------------|
| Delete single assessment | ✅ Yes | Admin via UI |
| Bulk delete assessments | ✅ Yes | Admin via UI |
| Delete admin user | ❌ No | Database admin only |
| Candidate self-deletion | ❌ No | Not implemented |

---

## 6. Third-Party Services

### 6.1 Sub-Processors

| Service | Purpose | Data Shared | Location |
|---------|---------|-------------|----------|
| Render.com | Hosting (compute, database) | All application data | Oregon, USA |
| GitHub | Source code repository | Code only, no user data | USA |

### 6.2 External APIs Called

**None.** All processing is performed locally:
- No analytics services (Google Analytics, etc.)
- No email services
- No CDNs for user data
- No error tracking services (Sentry, etc.)

### 6.3 Client-Side Dependencies

All JavaScript libraries are bundled and served from own domain:
- React, React Router (UI framework)
- react-markdown (local markdown rendering)
- No external scripts loaded at runtime

---

## 7. Browser Storage

### 7.1 Cookies

**Not used.** The application does not set any cookies.

### 7.2 Local Storage

| Key | Purpose | Contents | Cleared |
|-----|---------|----------|---------|
| `auth_token` | Admin authentication | JWT token | On logout / 7-day expiry |
| `auth_user` | Admin session info | `{id, username, role}` | On logout |
| `cleverbadge_assessment_{slug}` | Test progress | Candidate name, answers, question data | On submit / 2-hour expiry |

---

## 8. Data Subject Rights - Current Status

| Right | GDPR Article | Status | Implementation |
|-------|--------------|--------|----------------|
| Right of Access | Art. 15 | ⚠️ Partial | Admin can view; no self-service |
| Right to Rectification | Art. 16 | ❌ Missing | Cannot edit candidate name post-submission |
| Right to Erasure | Art. 17 | ⚠️ Partial | Admin can delete; no self-service |
| Right to Restrict Processing | Art. 18 | ❌ Missing | No mechanism exists |
| Right to Data Portability | Art. 20 | ❌ Missing | No export functionality |
| Right to Object | Art. 21 | ❌ Missing | No objection mechanism |
| Automated Decision Rights | Art. 22 | ✅ N/A | Scoring is transparent |

---

## 9. Current Privacy Features

### 9.1 Implemented

- Minimal data collection (name only for candidates)
- No tracking or profiling
- Strong password security
- Secure session management
- Test visibility controls (public/private/protected)

### 9.2 Not Implemented

- Privacy policy page
- Cookie/consent banner
- Data export for candidates
- Self-service data deletion
- Data processing agreement with Render.com
- Audit logging of admin actions
- Data breach notification procedures

---

## 10. V1 vs V2 Features

### V1 Features (Current - MVP)

- Admin authentication (username/password)
- Question management (SINGLE/MULTIPLE choice, markdown support)
- Test creation with pass threshold
- Candidate test-taking via shareable links
- Automatic scoring with weighted questions
- Assessment results viewing
- Basic analytics (per-question success rates)
- Question/test visibility controls
- YAML question import
- Assessment timeout (2 hours)

### V2 Features (Planned) - GDPR Impact Analysis

Based on design documents in `/docs/features/`:

#### 1. User Management System (`user-management/`)

**NEW DATA COLLECTED:**

| Field | Type | Purpose | GDPR Notes |
|-------|------|---------|------------|
| Email | String | Account, notifications | PII - consent required |
| Display Name | String (unique) | Public identification | PII - visible to others |
| Bio | Text | Profile description | Optional PII |
| Role | Enum | Access control | USER/AUTHOR/ADMIN |
| Last Login | Timestamp | Security audit | Tracking data |
| Email Verified | Boolean | Account activation | Processing flag |
| Is Disabled | Boolean | Account suspension | Admin action |

**NEW TABLES:**

- `author_requests` - Stores author promotion requests with:
  - Knowledge domain (area of expertise)
  - Authoring intent (personal/professional/education/other)
  - Organization name
  - Description text
  - Admin review notes

- `email_tokens` - Stores verification/password reset tokens with expiry

**GDPR IMPLICATIONS:**
- Email addresses = directly identifiable PII
- Requires explicit consent at registration
- Must implement email verification flow
- Password reset mechanism needed
- Account deletion must cascade to all related data
- Right to data portability applies to user profiles
- Three roles: USER (default) → AUTHOR (by request) → ADMIN

#### 2. Time Limits (`time-limits/`)

**NEW DATA COLLECTED:**

| Field | Table | Purpose |
|-------|-------|---------|
| time_started_at | assessments | Timing calculation |
| time_expired | assessments | Auto-submit flag |
| time_spent_seconds | assessment_answers | Per-question timing |

**Three modes:** No timer / Test-level (total time) / Question-level (per question)

**GDPR IMPLICATIONS:**
- Behavioral data (time patterns) could reveal working style
- Include in data export for transparency
- No direct PII impact

#### 3. Question Randomization (`question-randomization/`)

**NEW DATA COLLECTED:**

| Field | Table | Purpose |
|-------|-------|---------|
| question_sequence | assessments | Audit trail of questions shown |
| use_question_pools | tests | Pool-based selection flag |
| randomize_options | tests | Option shuffling flag |

**Features:** Question order randomization, tagged question pools, option shuffling

**GDPR IMPLICATIONS:**
- Minimal impact - just question ordering
- Include in data export for audit completeness

#### 4. Export Results (`export-results/`)

**DATA EXPORTS ENABLED:**

- **CSV/XLSX:** Assessment lists, detailed per-question results, aggregated stats
- **PDF:** Individual candidate reports, test summary reports
- **Bulk:** ZIP files containing multiple candidate PDFs

**GDPR IMPLICATIONS:**
- **Positive:** Helps fulfill Right to Data Portability (Art. 20)
- **Risk:** Exported files contain PII (candidate names, scores, answers)
- **Need:** Audit log of who exported what data and when
- **Need:** Option to anonymize exports (exclude names)
- **Need:** Access controls on export functionality

#### 5. Analytics Charts (`analytics-charts/`)

**NEW DATA DISPLAYED:**

- Score distribution histograms
- Pass rates over time
- Top performers lists (with names)
- Question difficulty analysis
- Completion rate trends

**GDPR IMPLICATIONS:**
- Aggregated data is generally GDPR-compliant
- "Top performers" list displays candidate names - requires consideration
- Time-based charts could reveal patterns about individuals
- Consider anonymization option for analytics views

---

### V2 Database Schema Changes

**Users table (V2 - extended):**
```sql
id              UUID PRIMARY KEY
email           VARCHAR(255) UNIQUE NOT NULL    -- NEW: PII
display_name    VARCHAR(100) UNIQUE NOT NULL    -- NEW: PII
password_hash   VARCHAR(255) NOT NULL
bio             TEXT                             -- NEW: optional PII
role            ENUM('USER', 'AUTHOR', 'ADMIN')  -- NEW: access control
is_active       BOOLEAN DEFAULT FALSE            -- NEW: activation status
is_disabled     BOOLEAN DEFAULT FALSE            -- NEW: suspension flag
email_verified  BOOLEAN DEFAULT FALSE            -- NEW: verification status
last_login_at   TIMESTAMP                        -- NEW: tracking
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**Assessments table (V2 - additions):**
```sql
time_started_at     TIMESTAMP       -- NEW: timing
time_expired        BOOLEAN         -- NEW: timeout flag
question_sequence   JSON            -- NEW: randomization audit trail
```

**Assessment answers (V2 - additions):**
```sql
time_spent_seconds  INTEGER         -- NEW: per-question timing
```

---

### V2 GDPR Compliance Requirements Summary

| Requirement | V1 Status | V2 Required |
|-------------|-----------|-------------|
| Consent at registration | N/A (no registration) | ✅ Required |
| Email verification | N/A | ✅ Required |
| Password reset | N/A | ✅ Required |
| Account deletion | Partial (admin only) | ✅ Full self-service with cascade |
| Data export | ❌ Missing | ✅ Built-in with export feature |
| Profile editing | N/A | ✅ Required |
| Audit logging | ❌ Missing | ✅ Required (exports, admin actions) |
| Cookie consent | ❌ Missing | ✅ Required if using cookies |
| Privacy policy | ❌ Missing | ✅ Required |
| Data retention policy | ❌ Missing | ✅ Required |
| Third-party email service | N/A | ⚠️ Will need DPA |

---

## 11. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLEVERBADGE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌───────────────────┐   │
│  │ CANDIDATE│────▶│ FRONTEND     │────▶│ BACKEND (API)     │   │
│  │          │     │ (React)      │     │ (Node.js/Express) │   │
│  │ • Name   │     │              │     │                   │   │
│  │ • Answers│     │ localStorage:│     │ • Validates input │   │
│  └──────────┘     │ - progress   │     │ • Calculates score│   │
│                   │ - answers    │     │ • Returns results │   │
│                   └──────────────┘     └─────────┬─────────┘   │
│                                                   │              │
│  ┌──────────┐     ┌──────────────┐               │              │
│  │ ADMIN    │────▶│ FRONTEND     │               │              │
│  │          │     │ (React)      │               ▼              │
│  │ • Username│    │              │     ┌───────────────────┐   │
│  │ • Password│    │ localStorage:│     │ POSTGRESQL        │   │
│  └──────────┘     │ - JWT token  │     │ (Render.com)      │   │
│                   │ - user info  │     │                   │   │
│                   └──────────────┘     │ • users           │   │
│                                        │ • assessments     │   │
│                                        │ • assessment_     │   │
│                                        │   answers         │   │
│                                        │ • questions       │   │
│                                        │ • tests           │   │
│                                        └───────────────────┘   │
│                                                                  │
│  HOSTING: Render.com (Oregon, USA)                              │
│  NO EXTERNAL APIs OR TRACKING                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Recommended Compliance Actions

### Priority 1 - Critical

1. **Create Privacy Policy page** - Disclose data collection and processing
2. **Add consent mechanism** - Checkbox before test start
3. **Create Data Processing Agreement** with Render.com
4. **Implement data export** - Allow candidates to download their data
5. **Implement self-service deletion** - Allow candidates to request deletion

### Priority 2 - Important

6. **Add audit logging** - Track admin access to assessment data
7. **Implement rate limiting** - Protect login endpoint
8. **Define retention policy** - Auto-delete assessments after X months
9. **Add breach notification procedure** - Document incident response

### Priority 3 - Recommended

10. **Encrypt database at rest** - Enable encryption on Render PostgreSQL
11. **Add data minimization** - Option to anonymize old assessments
12. **Cookie consent banner** - Even if no cookies, for localStorage disclosure

---

## 13. Technical Contact

For technical questions about this document or the implementation:

**Repository:** CleverBadge
**Stack:** Node.js, React, PostgreSQL
**Documentation:** `/docs/` folder contains API, database, and implementation details

---

*This document was generated for legal review purposes. It reflects the current state of the application as of December 2025.*

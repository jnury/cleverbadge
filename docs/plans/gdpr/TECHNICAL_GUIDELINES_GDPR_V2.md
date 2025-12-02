# Technical Guidelines for GDPR Compliance
## CleverBadge V2

**Document Version:** 1.0  
**Classification:** Internal – Development Team  
**Date:** December 2025  
**Prepared by:** Legal Counsel (GDPR Specialist)

---

## Table of Contents

1. [Introduction and Legal Framework](#1-introduction-and-legal-framework)
2. [GDPR Principles for Developers](#2-gdpr-principles-for-developers)
3. [Consent Implementation](#3-consent-implementation)
4. [Data Subject Rights – Technical Requirements](#4-data-subject-rights--technical-requirements)
5. [Data Minimization and Purpose Limitation](#5-data-minimization-and-purpose-limitation)
6. [Data Retention and Automatic Deletion](#6-data-retention-and-automatic-deletion)
7. [Security Requirements](#7-security-requirements)
8. [Audit Logging](#8-audit-logging)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Privacy by Design Checklist](#10-privacy-by-design-checklist)
11. [API Specifications for GDPR Features](#11-api-specifications-for-gdpr-features)
12. [Database Schema Requirements](#12-database-schema-requirements)
13. [Frontend Requirements](#13-frontend-requirements)
14. [Testing and Validation](#14-testing-and-validation)
15. [International Data Transfers](#15-international-data-transfers)

---

## 1. Introduction and Legal Framework

### 1.1 Purpose of This Document

This document provides **mandatory technical requirements** for implementing GDPR compliance in CleverBadge V2. All features described herein must be implemented before production deployment when the platform serves EU residents.

### 1.2 Applicable Regulations

| Regulation | Relevance |
|------------|-----------|
| GDPR (EU 2016/679) | Primary regulation – applies when processing data of EU residents |
| ePrivacy Directive | Applies to localStorage usage and any future cookie implementation |
| Swiss nDSG (if applicable) | Similar requirements to GDPR for Swiss users |

### 1.3 Key Definitions for Developers

| Term | Meaning in CleverBadge Context |
|------|--------------------------------|
| **Data Subject** | Any candidate taking a test OR any registered user (USER/AUTHOR/ADMIN) |
| **Personal Data** | Candidate name, email, display name, bio, IP address (if logged), assessment answers tied to a name |
| **Processing** | Any operation on personal data: collection, storage, retrieval, deletion, export |
| **Controller** | The organization operating CleverBadge (your client) |
| **Processor** | Render.com (hosting), future email service provider |

### 1.4 Lawful Bases Used in CleverBadge

| Processing Activity | Lawful Basis | GDPR Article |
|---------------------|--------------|--------------|
| User registration (email, display name) | Consent | Art. 6(1)(a) |
| Assessment data (candidate name, answers) | Consent | Art. 6(1)(a) |
| Score calculation | Contract performance | Art. 6(1)(b) |
| Account security (password hash, last login) | Legitimate interest | Art. 6(1)(f) |
| Audit logs | Legal obligation / Legitimate interest | Art. 6(1)(c)/(f) |

---

## 2. GDPR Principles for Developers

Every feature you build must respect these seven principles. When in doubt, refer back to this section.

### 2.1 Lawfulness, Fairness, and Transparency

**Implementation requirement:** Never collect data without informing the user. Every data collection point must have a visible explanation of what is collected and why.

### 2.2 Purpose Limitation

**Implementation requirement:** Data collected for one purpose cannot be repurposed without new consent. The `candidate_name` collected for "identifying results" cannot later be used for marketing.

### 2.3 Data Minimization

**Implementation requirement:** Only collect what is strictly necessary. If a field is "nice to have" but not essential, make it optional or don't collect it.

### 2.4 Accuracy

**Implementation requirement:** Provide users with the ability to correct their data. Profile editing must be available for all editable fields.

### 2.5 Storage Limitation

**Implementation requirement:** Define retention periods for all data categories. Implement automatic deletion when retention periods expire.

### 2.6 Integrity and Confidentiality

**Implementation requirement:** Implement security measures appropriate to the risk. See Section 7 for specific requirements.

### 2.7 Accountability

**Implementation requirement:** Maintain records of processing activities. Implement audit logging. Document all GDPR-related decisions.

---

## 3. Consent Implementation

### 3.1 Consent Requirements (GDPR Article 7)

Valid consent must be:

| Requirement | Implementation |
|-------------|----------------|
| **Freely given** | No pre-ticked boxes. User must take affirmative action. |
| **Specific** | Separate consent for each distinct purpose |
| **Informed** | Clear explanation of what data is collected and why |
| **Unambiguous** | Clear affirmative action (checkbox click, button press) |
| **Withdrawable** | User must be able to withdraw consent at any time |

### 3.2 Registration Consent (New Users)

#### Required UI Elements

```
┌─────────────────────────────────────────────────────────────────┐
│                      CREATE ACCOUNT                              │
├─────────────────────────────────────────────────────────────────┤
│  Email: [_________________________________]                      │
│  Display Name: [____________________________]                    │
│  Password: [________________________________]                    │
│                                                                  │
│  ☐ I agree to the Terms of Service and Privacy Policy*          │
│    [View Terms] [View Privacy Policy]                            │
│                                                                  │
│  ☐ I consent to receiving service-related emails                 │
│    (account verification, password reset, security alerts)       │
│                                                                  │
│  ☐ I consent to receiving optional notifications                 │
│    (new features, tips) - Optional                               │
│                                                                  │
│  [CREATE ACCOUNT]                                                │
│                                                                  │
│  * Required field                                                │
└─────────────────────────────────────────────────────────────────┘
```

#### Backend Requirements

```javascript
// POST /api/auth/register
// Required fields in request body:
{
  "email": "string",
  "display_name": "string", 
  "password": "string",
  "consent_terms": true,           // REQUIRED - must be true
  "consent_service_emails": true,  // REQUIRED - must be true for account to function
  "consent_marketing_emails": false // OPTIONAL - default false
}

// Response must confirm consent was recorded
{
  "user_id": "uuid",
  "consents_recorded": {
    "terms": "2025-12-02T10:30:00Z",
    "service_emails": "2025-12-02T10:30:00Z",
    "marketing_emails": null
  }
}
```

#### Database Schema for Consent Records

```sql
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,  -- 'terms', 'service_emails', 'marketing_emails'
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,  -- Optional: for consent proof
    user_agent TEXT,  -- Optional: for consent proof
    consent_version VARCHAR(20),  -- e.g., 'privacy_policy_v1.2'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_consent UNIQUE (user_id, consent_type)
);

-- Index for quick lookups
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
```

### 3.3 Candidate Consent (Test Takers)

Before starting any assessment, candidates must consent to data processing.

#### Required UI Elements

```
┌─────────────────────────────────────────────────────────────────┐
│                    BEFORE YOU BEGIN                              │
├─────────────────────────────────────────────────────────────────┤
│  You are about to take: [Test Name]                              │
│                                                                  │
│  Please enter your name: [_______________________]               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ DATA PROCESSING NOTICE                                       ││
│  │                                                              ││
│  │ By starting this assessment, you agree that:                 ││
│  │ • Your name and answers will be stored                       ││
│  │ • Your score will be calculated and stored                   ││
│  │ • The test administrator will have access to your results    ││
│  │ • Your data will be stored on servers in the USA             ││
│  │                                                              ││
│  │ You can request deletion of your data at any time.           ││
│  │ See our Privacy Policy for details.                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ☐ I understand and agree to the processing of my data          │
│    as described above*                                           │
│                                                                  │
│  [START ASSESSMENT]                                              │
│                                                                  │
│  [View Privacy Policy]                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Backend Requirements

```javascript
// POST /api/assessments/start
{
  "test_slug": "string",
  "candidate_name": "string",
  "consent_data_processing": true,  // REQUIRED
  "consent_timestamp": "ISO8601"    // Client timestamp
}
```

#### Database Schema Addition

```sql
ALTER TABLE assessments ADD COLUMN consent_granted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE assessments ADD COLUMN consent_version VARCHAR(20);
```

### 3.4 Consent Withdrawal Mechanism

Users must be able to withdraw consent at any time. Withdrawal should be as easy as giving consent.

#### API Endpoint

```
DELETE /api/users/me/consents/{consent_type}
```

#### Implementation Notes

- Withdrawing `service_emails` consent should trigger an account functionality warning
- Withdrawing `terms` consent should initiate account deletion flow
- Withdrawal must be recorded with timestamp
- Previously collected data remains lawful but no new processing should occur

---

## 4. Data Subject Rights – Technical Requirements

### 4.1 Overview of Rights

| Right | GDPR Article | Implementation Priority |
|-------|--------------|------------------------|
| Right of Access | Art. 15 | **CRITICAL** |
| Right to Rectification | Art. 16 | **CRITICAL** |
| Right to Erasure | Art. 17 | **CRITICAL** |
| Right to Data Portability | Art. 20 | **HIGH** |
| Right to Object | Art. 21 | MEDIUM |
| Right to Restriction | Art. 18 | MEDIUM |

### 4.2 Right of Access (Art. 15)

Data subjects can request all data held about them. Response required within **30 days**.

#### API Endpoint

```
GET /api/users/me/data-export
Authorization: Bearer {jwt_token}
```

#### Response Format

```json
{
  "export_generated_at": "2025-12-02T10:30:00Z",
  "data_controller": "CleverBadge",
  "data_subject": {
    "user_id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "bio": "Software developer",
    "role": "AUTHOR",
    "created_at": "2025-01-15T09:00:00Z",
    "last_login_at": "2025-12-01T14:22:00Z"
  },
  "consents": [
    {
      "type": "terms",
      "granted": true,
      "granted_at": "2025-01-15T09:00:00Z",
      "version": "v1.0"
    }
  ],
  "assessments_taken": [
    {
      "test_name": "JavaScript Basics",
      "candidate_name": "John Doe",
      "started_at": "2025-06-10T10:00:00Z",
      "completed_at": "2025-06-10T10:45:00Z",
      "score_percentage": 85.5,
      "answers": [
        {
          "question_text": "What is a closure?",
          "selected_options": ["A function with access to outer scope"],
          "is_correct": true,
          "answered_at": "2025-06-10T10:05:00Z"
        }
      ]
    }
  ],
  "tests_created": [
    {
      "test_id": "uuid",
      "title": "React Fundamentals",
      "created_at": "2025-03-20T11:00:00Z",
      "question_count": 25
    }
  ],
  "author_requests": [
    {
      "submitted_at": "2025-02-01T09:00:00Z",
      "status": "APPROVED",
      "knowledge_domain": "Web Development"
    }
  ],
  "export_logs": [
    {
      "exported_at": "2025-11-15T08:00:00Z",
      "export_type": "CSV",
      "data_scope": "own_test_results"
    }
  ]
}
```

#### Implementation Requirements

1. Export must include ALL data categories listed in Section 2 of the factsheet
2. Export must be in machine-readable format (JSON primary, offer CSV/PDF options)
3. Export must be downloadable as a single file
4. Include metadata about the export itself
5. Log the export request in audit logs

#### For Candidates (Non-Registered Users)

Candidates without accounts need an alternative access mechanism.

```
GET /api/assessments/{assessment_id}/data-export?token={access_token}
```

The `access_token` should be:
- Provided to the candidate at test completion
- Sent via a "Save my results" flow if email is optionally collected
- Valid for 90 days

### 4.3 Right to Rectification (Art. 16)

Users must be able to correct inaccurate personal data.

#### Editable Fields

| User Type | Editable Fields | API Endpoint |
|-----------|-----------------|--------------|
| Registered User | email, display_name, bio, password | `PATCH /api/users/me` |
| Candidate | candidate_name (before submission only) | `PATCH /api/assessments/{id}` |

#### Implementation Requirements

```javascript
// PATCH /api/users/me
{
  "display_name": "New Name",  // Optional
  "bio": "Updated bio",        // Optional
  "email": "new@email.com"     // Triggers re-verification
}

// Response
{
  "updated_fields": ["display_name", "bio"],
  "email_verification_required": false,
  "updated_at": "2025-12-02T10:30:00Z"
}
```

- Email changes must trigger new verification email
- Old email should receive notification of change attempt
- Display name changes should be rate-limited (max 3/month)
- Maintain history of changes in audit log

### 4.4 Right to Erasure (Art. 17) – "Right to be Forgotten"

This is the most complex right to implement. Users can request complete deletion of their data.

#### Deletion Scope by User Type

**Registered Users (USER/AUTHOR/ADMIN):**

```sql
-- Cascade deletion order (handle foreign keys)
1. DELETE FROM audit_logs WHERE user_id = ?         -- Keep anonymized version
2. DELETE FROM user_consents WHERE user_id = ?
3. DELETE FROM email_tokens WHERE user_id = ?
4. DELETE FROM author_requests WHERE user_id = ?
5. DELETE FROM assessment_answers WHERE assessment_id IN 
   (SELECT id FROM assessments WHERE created_by_user_id = ?)
6. DELETE FROM assessments WHERE created_by_user_id = ?
7. DELETE FROM questions WHERE test_id IN (SELECT id FROM tests WHERE author_id = ?)
8. DELETE FROM tests WHERE author_id = ?
9. DELETE FROM users WHERE id = ?
```

**Candidates (Assessment Takers):**

```sql
1. DELETE FROM assessment_answers WHERE assessment_id = ?
2. DELETE FROM assessments WHERE id = ?
```

#### API Endpoints

```
# Registered user self-deletion
DELETE /api/users/me
Authorization: Bearer {jwt_token}
X-Confirm-Deletion: "DELETE MY ACCOUNT"  -- Require explicit confirmation

# Candidate deletion request
POST /api/deletion-requests
{
  "assessment_id": "uuid",
  "verification_token": "string",  -- Token provided at test completion
  "candidate_email": "optional"    -- For confirmation
}
```

#### Implementation Requirements

1. **Confirmation step:** Require password re-entry or confirmation phrase
2. **Grace period:** Implement 14-day soft-delete before permanent deletion
3. **Notification:** Email confirmation of deletion request and completion
4. **Backup consideration:** Document that backups may retain data for up to 30 days
5. **Audit trail:** Keep anonymized record that deletion occurred (without PII)

#### Soft Delete Implementation

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN deletion_scheduled_for TIMESTAMP WITH TIME ZONE;

-- Soft delete: set deletion_scheduled_for to NOW() + 14 days
-- Cron job runs daily to permanently delete records where deletion_scheduled_for < NOW()
```

#### Exceptions to Deletion

Document these scenarios where deletion may be refused or delayed:

- Legal hold or ongoing dispute
- Required for compliance with legal obligations
- Necessary for establishment, exercise, or defense of legal claims

### 4.5 Right to Data Portability (Art. 20)

Users can request their data in a portable format to transfer to another service.

#### Export Formats

```
GET /api/users/me/data-export?format={json|csv|xml}
```

| Format | Use Case | Implementation |
|--------|----------|----------------|
| JSON | Machine-readable, complete data | Primary format |
| CSV | Spreadsheet import | Assessment results only |
| XML | Legacy system compatibility | Optional |

#### Implementation Requirements

1. Use standard, open formats
2. Include schema documentation with export
3. Ensure data is directly usable without proprietary tools
4. Complete export within 30 days (aim for immediate)

### 4.6 Candidate Self-Service Deletion Flow

For candidates who don't have accounts, implement this flow:

```
┌─────────────────────────────────────────────────────────────────┐
│              ASSESSMENT COMPLETED - THANK YOU!                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Your score: 85%                                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ YOUR DATA RIGHTS                                             ││
│  │                                                              ││
│  │ Your assessment data is stored by the test administrator.    ││
│  │ You have the right to:                                       ││
│  │                                                              ││
│  │ [📥 Download My Data]  [🗑️ Request Deletion]                 ││
│  │                                                              ││
│  │ Save this link to access your data later:                    ││
│  │ https://app.cleverbadge.com/my-data/{unique_token}           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Minimization and Purpose Limitation

### 5.1 Required vs. Optional Fields

Review all data collection and classify appropriately:

| Field | Required/Optional | Justification |
|-------|-------------------|---------------|
| Email | Required | Essential for account recovery and verification |
| Display Name | Required | Needed for attribution of authored content |
| Bio | **Optional** | Nice-to-have profile enhancement |
| Candidate Name | Required | Needed to identify results for administrator |
| Time per question | **Optional** | Analytics feature, not core functionality |

### 5.2 Implementation Guidelines

```javascript
// Schema validation example
const userRegistrationSchema = {
  email: { type: 'string', required: true, format: 'email' },
  display_name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
  password: { type: 'string', required: true, minLength: 12 },
  bio: { type: 'string', required: false, maxLength: 500, default: null }
};

// Never require optional fields
// Never collect "just in case" data
```

### 5.3 Purpose Limitation Controls

Implement technical controls to prevent purpose creep:

```javascript
// Example: Candidate names should ONLY be used for result identification
// They should NOT appear in:
// - Marketing emails
// - Analytics (unless anonymized)
// - Cross-test comparisons by name

// Add purpose tracking to data access
function getAssessmentData(assessmentId, purpose) {
  const allowedPurposes = ['result_display', 'admin_review', 'data_export'];
  if (!allowedPurposes.includes(purpose)) {
    throw new Error(`Access denied: purpose '${purpose}' not permitted`);
  }
  // Log the access with purpose
  auditLog.record({
    action: 'ACCESS_ASSESSMENT',
    assessment_id: assessmentId,
    purpose: purpose,
    timestamp: new Date()
  });
  return database.getAssessment(assessmentId);
}
```

---

## 6. Data Retention and Automatic Deletion

### 6.1 Retention Policy

| Data Category | Retention Period | Justification | Auto-Delete |
|---------------|------------------|---------------|-------------|
| Active user accounts | Until deletion requested | Service provision | No |
| Inactive user accounts | 24 months after last login | Storage limitation | Yes |
| Completed assessments | 12 months | Business records | Configurable |
| Abandoned assessments | 7 days | No longer needed | Yes |
| Email verification tokens | 48 hours | Security | Yes |
| Password reset tokens | 1 hour | Security | Yes |
| Audit logs | 36 months | Legal/security | Yes |
| Deleted account records | 30 days (soft delete) | Undo capability | Yes |
| Backups | 30 days | Disaster recovery | Yes |

### 6.2 Implementation: Scheduled Cleanup Jobs

```javascript
// /jobs/data-retention-cleanup.js

const retentionPolicies = {
  'assessments.abandoned': { days: 7, condition: "status = 'ABANDONED'" },
  'assessments.completed': { months: 12, condition: "status = 'COMPLETED'" },
  'email_tokens': { hours: 48 },
  'password_reset_tokens': { hours: 1 },
  'users.inactive': { months: 24, condition: "last_login_at < NOW() - INTERVAL '24 months'" },
  'audit_logs': { months: 36 }
};

async function runRetentionCleanup() {
  for (const [table, policy] of Object.entries(retentionPolicies)) {
    const deletedCount = await deleteExpiredRecords(table, policy);
    await auditLog.record({
      action: 'RETENTION_CLEANUP',
      table: table,
      records_deleted: deletedCount,
      policy_applied: policy
    });
  }
}

// Schedule: Run daily at 02:00 UTC
cron.schedule('0 2 * * *', runRetentionCleanup);
```

### 6.3 Database Implementation

```sql
-- Add retention tracking columns
ALTER TABLE assessments ADD COLUMN retention_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;

-- Create retention cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_assessments()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM assessments
    WHERE retention_expires_at < NOW()
    AND retention_expires_at IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set retention date on completion
CREATE OR REPLACE FUNCTION set_assessment_retention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    NEW.retention_expires_at = NOW() + INTERVAL '12 months';
  ELSIF NEW.status = 'ABANDONED' THEN
    NEW.retention_expires_at = NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessment_retention_trigger
BEFORE UPDATE ON assessments
FOR EACH ROW
EXECUTE FUNCTION set_assessment_retention();
```

### 6.4 Admin-Configurable Retention

Allow administrators to adjust retention periods within legal bounds:

```javascript
// Settings API
PATCH /api/admin/settings/retention
{
  "completed_assessments_days": 365,  // Min: 30, Max: 730
  "abandoned_assessments_days": 7,    // Min: 1, Max: 30
  "notify_before_deletion_days": 7    // Days before deletion to notify
}
```

---

## 7. Security Requirements

### 7.1 Current Security Gaps (from Factsheet) – Remediation Required

| Gap | Risk | Remediation | Priority |
|-----|------|-------------|----------|
| No encryption at rest | Medium | Enable PostgreSQL encryption | HIGH |
| No rate limiting | Medium | Implement rate limiting | **CRITICAL** |
| No audit logging | Medium | Implement comprehensive logging | **CRITICAL** |
| JWT in localStorage | Low | Consider httpOnly cookies | MEDIUM |

### 7.2 Rate Limiting Implementation

```javascript
// /middleware/rate-limiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Login endpoint: strict limits
const loginLimiter = rateLimit({
  store: new RedisStore({ /* redis config */ }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
    retry_after: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email || req.ip, // Rate limit by email
  handler: (req, res, next, options) => {
    // Log failed attempt for security monitoring
    auditLog.record({
      action: 'RATE_LIMIT_EXCEEDED',
      endpoint: '/api/auth/login',
      identifier: req.body.email || req.ip,
      timestamp: new Date()
    });
    res.status(429).json(options.message);
  }
});

// Password reset: prevent enumeration attacks
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  keyGenerator: (req) => req.body.email || req.ip
});

// Data export: prevent abuse
const exportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5 // 5 exports per day
});

// Apply to routes
app.post('/api/auth/login', loginLimiter, authController.login);
app.post('/api/auth/password-reset', passwordResetLimiter, authController.resetPassword);
app.get('/api/users/me/data-export', exportLimiter, userController.exportData);
```

### 7.3 Encryption at Rest

Enable encryption on the PostgreSQL database:

```bash
# Render.com PostgreSQL
# Enable encryption via Render dashboard:
# Database → Settings → Enable Encryption at Rest

# Verify encryption is enabled
SELECT current_setting('data_encryption');
```

For sensitive fields that require application-level encryption:

```javascript
// /utils/encryption.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Use for highly sensitive fields like bio if it contains sensitive info
```

### 7.4 JWT Security Improvements

```javascript
// Option 1: Move to httpOnly cookies (recommended for web)
res.cookie('auth_token', token, {
  httpOnly: true,        // Not accessible via JavaScript
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Option 2: If localStorage must be used, implement token rotation
const tokenConfig = {
  accessTokenExpiry: '15m',   // Short-lived access token
  refreshTokenExpiry: '7d',   // Longer-lived refresh token
  rotateRefreshToken: true    // Issue new refresh token on use
};
```

### 7.5 Security Headers (Enhanced)

```javascript
// /middleware/security-headers.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Review if inline styles can be removed
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
}));

// Additional custom headers
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});
```

### 7.6 Input Validation (Enhanced)

```javascript
// /validators/user.validator.js
const { body, validationResult } = require('express-validator');

const registrationValidation = [
  body('email')
    .isEmail().withMessage('Valid email required')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),
  
  body('display_name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Display name must be 2-100 characters')
    .matches(/^[a-zA-Z0-9_\- ]+$/).withMessage('Display name contains invalid characters')
    .escape(), // XSS protection
  
  body('password')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain number'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio must be under 500 characters')
    .escape()
];

// Validate and sanitize all inputs before processing
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.param, message: e.msg }))
    });
  }
  next();
};
```

---

## 8. Audit Logging

### 8.1 Events to Log

| Event Category | Events | Data to Capture |
|----------------|--------|-----------------|
| **Authentication** | Login success/failure, logout, password change, password reset | User ID, IP, timestamp, result |
| **Data Access** | View assessment results, export data, view user profiles | User ID, resource accessed, purpose |
| **Data Modification** | Create/update/delete users, assessments, tests | User ID, resource, before/after values |
| **Admin Actions** | Role changes, account suspension, bulk operations | Admin ID, target user, action |
| **GDPR Actions** | Data export requests, deletion requests, consent changes | User ID, action type, timestamp |
| **Security** | Rate limit exceeded, suspicious activity, failed auth | IP, user ID (if known), details |

### 8.2 Audit Log Schema

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Actor information
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) NOT NULL,  -- 'user', 'admin', 'system', 'candidate'
    actor_ip INET,
    actor_user_agent TEXT,
    
    -- Action information
    action_category VARCHAR(50) NOT NULL,  -- 'auth', 'data_access', 'modification', etc.
    action_type VARCHAR(100) NOT NULL,     -- 'LOGIN_SUCCESS', 'DATA_EXPORT', etc.
    
    -- Resource information
    resource_type VARCHAR(50),  -- 'user', 'assessment', 'test', etc.
    resource_id UUID,
    
    -- Details
    details JSONB,  -- Flexible storage for action-specific data
    
    -- Metadata
    request_id UUID,  -- Correlation ID for request tracing
    session_id UUID,
    
    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type, timestamp DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Partitioning for performance (optional but recommended)
-- Partition by month for easier archival
```

### 8.3 Audit Logging Service

```javascript
// /services/audit-log.service.js

class AuditLogService {
  async log({
    actorId,
    actorType,
    actionCategory,
    actionType,
    resourceType = null,
    resourceId = null,
    details = {},
    req = null
  }) {
    const logEntry = {
      actor_id: actorId,
      actor_type: actorType,
      actor_ip: req ? this.getClientIp(req) : null,
      actor_user_agent: req ? req.get('User-Agent') : null,
      action_category: actionCategory,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      details: this.sanitizeDetails(details),
      request_id: req ? req.id : null,
      session_id: req ? req.session?.id : null
    };

    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_type, actor_ip, actor_user_agent, 
        action_category, action_type, resource_type, resource_id, details, 
        request_id, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      Object.values(logEntry)
    );
  }

  // Remove sensitive data from details
  sanitizeDetails(details) {
    const sanitized = { ...details };
    const sensitiveFields = ['password', 'password_hash', 'token', 'secret'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  }
}

module.exports = new AuditLogService();
```

### 8.4 Integration Examples

```javascript
// Login controller
async function login(req, res) {
  const { email, password } = req.body;
  const user = await userService.findByEmail(email);
  
  if (!user || !await verifyPassword(password, user.password_hash)) {
    await auditLog.log({
      actorType: 'anonymous',
      actionCategory: 'auth',
      actionType: 'LOGIN_FAILURE',
      details: { email: email, reason: 'Invalid credentials' },
      req
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  await auditLog.log({
    actorId: user.id,
    actorType: 'user',
    actionCategory: 'auth',
    actionType: 'LOGIN_SUCCESS',
    req
  });
  
  // ... generate token and respond
}

// Data export controller
async function exportUserData(req, res) {
  await auditLog.log({
    actorId: req.user.id,
    actorType: 'user',
    actionCategory: 'gdpr',
    actionType: 'DATA_EXPORT_REQUEST',
    resourceType: 'user',
    resourceId: req.user.id,
    details: { format: req.query.format || 'json' },
    req
  });
  
  // ... generate and return export
}

// Admin viewing assessment
async function getAssessmentResults(req, res) {
  const assessment = await assessmentService.findById(req.params.id);
  
  await auditLog.log({
    actorId: req.user.id,
    actorType: 'admin',
    actionCategory: 'data_access',
    actionType: 'VIEW_ASSESSMENT_RESULTS',
    resourceType: 'assessment',
    resourceId: assessment.id,
    details: { candidate_name: assessment.candidate_name },
    req
  });
  
  // ... return assessment data
}
```

---

## 9. Third-Party Integrations

### 9.1 Data Processing Agreement (DPA) Requirements

Before integrating any third-party service that processes personal data, ensure:

| Requirement | Action |
|-------------|--------|
| DPA signed | Obtain signed DPA from provider |
| EU Standard Contractual Clauses | Required for US-based processors |
| Subprocessor list | Review and approve subprocessors |
| Security measures | Verify adequate security controls |
| Data location | Document where data is processed |

### 9.2 Render.com (Current Hosting Provider)

**Status:** DPA required

| Item | Details |
|------|---------|
| Data location | Oregon, USA |
| DPA available | Yes, via Render dashboard |
| SCCs included | Yes |
| Action required | Sign DPA via Render.com account settings |

### 9.3 Email Service Provider (V2 Requirement)

For email verification and password reset, you will need an email service. Recommended options:

| Provider | GDPR Status | DPA | EU Data Center | Notes |
|----------|-------------|-----|----------------|-------|
| Resend | Compliant | Yes | No (US) | SCCs available |
| Postmark | Compliant | Yes | EU available | Good deliverability |
| Amazon SES | Compliant | Yes | EU-WEST-1 | Cost-effective |
| Mailgun | Compliant | Yes | EU available | Good API |

**Implementation requirements:**

```javascript
// Email service should ONLY be used for:
const ALLOWED_EMAIL_PURPOSES = [
  'email_verification',
  'password_reset',
  'security_alert',
  'deletion_confirmation',
  'data_export_ready'
];

// Never use for marketing without explicit consent
async function sendEmail(to, purpose, templateData) {
  if (!ALLOWED_EMAIL_PURPOSES.includes(purpose)) {
    throw new Error(`Email purpose '${purpose}' not permitted`);
  }
  
  // Log email sending for audit
  await auditLog.log({
    actorType: 'system',
    actionCategory: 'communication',
    actionType: 'EMAIL_SENT',
    details: { recipient_email: to, purpose, template: templateData.template }
  });
  
  return emailProvider.send(to, templateData);
}
```

### 9.4 Third-Party Service Inventory

Maintain a living document of all third-party services:

```javascript
// /config/third-party-inventory.js
module.exports = {
  services: [
    {
      name: 'Render.com',
      purpose: 'Application and database hosting',
      dataProcessed: ['All application data'],
      location: 'USA (Oregon)',
      dpaStatus: 'Required - Action: Sign via dashboard',
      lastReviewed: '2025-12-01'
    },
    {
      name: 'Email Provider (TBD)',
      purpose: 'Transactional emails',
      dataProcessed: ['Email addresses', 'User names'],
      location: 'TBD',
      dpaStatus: 'Required before integration',
      lastReviewed: null
    }
  ]
};
```

---

## 10. Privacy by Design Checklist

Use this checklist for every new feature before development:

### 10.1 Pre-Development Checklist

```
□ What personal data does this feature collect?
□ Is each piece of data strictly necessary? (Data minimization)
□ What is the lawful basis for processing?
□ How long will the data be retained?
□ Who will have access to this data?
□ How will the data be secured?
□ Does this feature require consent?
□ How can users access/delete this data?
□ Are there any third-party services involved?
□ Has the privacy policy been updated?
```

### 10.2 Code Review Checklist

```
□ No personal data logged to console/files (except audit logs)
□ All inputs validated and sanitized
□ SQL queries use parameterization
□ Sensitive data encrypted where required
□ Access controls properly implemented
□ Audit logging in place for data access
□ Data retention policies enforced
□ Export functionality includes new data
□ Deletion functionality cascades properly
```

### 10.3 Deployment Checklist

```
□ Environment variables secured
□ HTTPS enforced
□ Security headers configured
□ Rate limiting active
□ Audit logging functional
□ Backup encryption enabled
□ DPAs current with all processors
□ Privacy policy updated and published
```

---

## 11. API Specifications for GDPR Features

### 11.1 Consent Management API

```yaml
# OpenAPI 3.0 specification excerpt

/api/users/me/consents:
  get:
    summary: Get user's consent status
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                consents:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                        enum: [terms, service_emails, marketing_emails]
                      granted:
                        type: boolean
                      granted_at:
                        type: string
                        format: date-time
                      version:
                        type: string

  patch:
    summary: Update consent preferences
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              marketing_emails:
                type: boolean
    responses:
      200:
        description: Consent updated

/api/users/me/consents/{type}:
  delete:
    summary: Withdraw consent
    parameters:
      - name: type
        in: path
        schema:
          type: string
          enum: [marketing_emails, terms]
    responses:
      200:
        description: Consent withdrawn
      400:
        description: Cannot withdraw this consent type
```

### 11.2 Data Rights API

```yaml
/api/users/me/data-export:
  get:
    summary: Export user data (Right of Access / Portability)
    parameters:
      - name: format
        in: query
        schema:
          type: string
          enum: [json, csv]
          default: json
    responses:
      200:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DataExport'

/api/users/me:
  patch:
    summary: Update user profile (Right to Rectification)
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              display_name:
                type: string
              bio:
                type: string
              email:
                type: string
                format: email
    responses:
      200:
        description: Profile updated

  delete:
    summary: Delete user account (Right to Erasure)
    headers:
      X-Confirm-Deletion:
        schema:
          type: string
          enum: ["DELETE MY ACCOUNT"]
        required: true
    responses:
      202:
        description: Deletion scheduled
        content:
          application/json:
            schema:
              type: object
              properties:
                deletion_scheduled_for:
                  type: string
                  format: date-time
                cancellation_deadline:
                  type: string
                  format: date-time

/api/users/me/deletion:
  delete:
    summary: Cancel pending deletion
    responses:
      200:
        description: Deletion cancelled

/api/deletion-requests:
  post:
    summary: Request deletion (for candidates without accounts)
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required:
              - assessment_id
              - verification_token
            properties:
              assessment_id:
                type: string
                format: uuid
              verification_token:
                type: string
    responses:
      202:
        description: Deletion request received
```

### 11.3 Admin GDPR API

```yaml
/api/admin/data-requests:
  get:
    summary: List pending GDPR requests
    parameters:
      - name: type
        in: query
        schema:
          type: string
          enum: [access, deletion, rectification]
      - name: status
        in: query
        schema:
          type: string
          enum: [pending, completed, rejected]
    responses:
      200:
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/DataRequest'

  /{requestId}:
    patch:
      summary: Process GDPR request
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: [completed, rejected]
                notes:
                  type: string
      responses:
        200:
          description: Request processed

/api/admin/audit-logs:
  get:
    summary: Query audit logs
    parameters:
      - name: actor_id
        in: query
        schema:
          type: string
          format: uuid
      - name: action_type
        in: query
        schema:
          type: string
      - name: from
        in: query
        schema:
          type: string
          format: date-time
      - name: to
        in: query
        schema:
          type: string
          format: date-time
    responses:
      200:
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/AuditLog'
```

---

## 12. Database Schema Requirements

### 12.1 Complete V2 Schema with GDPR Fields

```sql
-- Users table with GDPR requirements
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'AUTHOR', 'ADMIN')),
    
    -- Account status
    is_active BOOLEAN DEFAULT FALSE,
    is_disabled BOOLEAN DEFAULT FALSE,
    
    -- GDPR: Retention & Deletion
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete
    deletion_scheduled_for TIMESTAMP WITH TIME ZONE,  -- Grace period
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consent records
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    consent_version VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, consent_type)
);

-- Assessments with consent tracking
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES tests(id),
    
    -- Candidate info
    candidate_name VARCHAR(100) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'STARTED' 
        CHECK (status IN ('STARTED', 'COMPLETED', 'ABANDONED')),
    score_percentage DECIMAL(5,2),
    
    -- Timing (V2)
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_started_at TIMESTAMP WITH TIME ZONE,
    time_expired BOOLEAN DEFAULT FALSE,
    
    -- Randomization audit (V2)
    question_sequence JSONB,
    
    -- GDPR: Consent
    consent_granted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consent_version VARCHAR(20),
    
    -- GDPR: Retention
    retention_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- GDPR: Deletion access token (for candidates)
    data_access_token VARCHAR(64) UNIQUE,
    data_access_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs (immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    actor_id UUID,  -- No FK to allow for deleted users
    actor_type VARCHAR(20) NOT NULL,
    actor_ip INET,
    actor_user_agent TEXT,
    action_category VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    request_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GDPR request tracking
CREATE TABLE gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    candidate_assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    request_type VARCHAR(20) NOT NULL 
        CHECK (request_type IN ('ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY')),
    status VARCHAR(20) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    notes TEXT,
    response_data JSONB  -- For access requests, summary of data provided
);
```

### 12.2 Required Indexes

```sql
-- Performance indexes for GDPR operations
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_users_deletion_scheduled ON users(deletion_scheduled_for) 
    WHERE deletion_scheduled_for IS NOT NULL;
CREATE INDEX idx_users_last_login ON users(last_login_at);

CREATE INDEX idx_assessments_retention ON assessments(retention_expires_at)
    WHERE retention_expires_at IS NOT NULL;
CREATE INDEX idx_assessments_data_token ON assessments(data_access_token)
    WHERE data_access_token IS NOT NULL;

CREATE INDEX idx_consents_user ON user_consents(user_id);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action_type, timestamp DESC);

CREATE INDEX idx_gdpr_requests_status ON gdpr_requests(status, requested_at);
```

---

## 13. Frontend Requirements

### 13.1 Privacy Policy Page

**Route:** `/privacy`

**Required Sections:**

1. Data Controller information
2. What data is collected
3. Why data is collected (purposes)
4. Legal basis for processing
5. Data retention periods
6. Third-party processors
7. International transfers
8. User rights and how to exercise them
9. Cookie/storage information
10. Contact information
11. Last updated date

### 13.2 Cookie/Storage Consent Banner

Even though CleverBadge doesn't use cookies, localStorage requires disclosure:

```jsx
// components/StorageConsent.jsx
function StorageConsent() {
  const [consent, setConsent] = useState(localStorage.getItem('storage_consent'));
  
  if (consent === 'accepted') return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 p-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <p className="font-medium">We use browser storage</p>
          <p className="text-sm text-gray-600">
            This site uses local storage to save your progress and keep you logged in.
            No tracking cookies are used. 
            <a href="/privacy" className="underline">Learn more</a>
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              localStorage.setItem('storage_consent', 'accepted');
              setConsent('accepted');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Accept
          </button>
          <button 
            onClick={() => {
              // Clear all localStorage and redirect to info page
              localStorage.clear();
              window.location.href = '/storage-info';
            }}
            className="border border-gray-300 px-4 py-2 rounded"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 13.3 User Data Rights UI

**Route:** `/settings/privacy`

```jsx
// pages/settings/Privacy.jsx
function PrivacySettings() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Privacy Settings</h1>
      
      {/* Consent Management */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Communication Preferences</h2>
        <div className="space-y-4">
          <ConsentToggle 
            type="marketing_emails"
            label="Receive product updates and tips"
            description="We'll occasionally send you news about new features"
          />
        </div>
      </section>
      
      {/* Data Export */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Your Data</h2>
        <p className="text-gray-600 mb-4">
          You have the right to access all data we hold about you.
        </p>
        <button 
          onClick={handleExportData}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Download My Data
        </button>
      </section>
      
      {/* Account Deletion */}
      <section className="border-t pt-8">
        <h2 className="text-lg font-semibold mb-4 text-red-600">Delete Account</h2>
        <p className="text-gray-600 mb-4">
          Permanently delete your account and all associated data. This action 
          cannot be undone after the 14-day grace period.
        </p>
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="border border-red-600 text-red-600 px-4 py-2 rounded"
        >
          Delete My Account
        </button>
      </section>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}
```

### 13.4 Candidate Data Rights Flow

At assessment completion, show data rights options:

```jsx
// components/AssessmentComplete.jsx
function AssessmentComplete({ assessment }) {
  const [dataAccessLink] = useState(
    `${window.location.origin}/my-data/${assessment.data_access_token}`
  );
  
  return (
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold mb-4">Assessment Complete!</h1>
      <p className="text-xl mb-8">Your score: {assessment.score_percentage}%</p>
      
      <div className="bg-gray-50 p-6 rounded-lg max-w-md mx-auto">
        <h2 className="font-semibold mb-4">Your Data Rights</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your assessment data is stored by the test administrator. 
          You have the right to access, download, or request deletion of your data.
        </p>
        
        <div className="space-y-2">
          <button 
            onClick={handleDownloadData}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Download My Data
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full border border-gray-300 py-2 rounded"
          >
            Request Deletion
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
          <p className="font-medium">Save this link to access your data later:</p>
          <input 
            type="text" 
            value={dataAccessLink} 
            readOnly 
            className="w-full mt-2 p-2 border rounded text-xs"
            onClick={(e) => e.target.select()}
          />
          <p className="text-xs text-gray-500 mt-1">Valid for 90 days</p>
        </div>
      </div>
    </div>
  );
}
```

### 13.5 Admin Data Access Notifications

When admins access candidate data, ensure visibility:

```jsx
// components/admin/AssessmentViewer.jsx
function AssessmentViewer({ assessmentId }) {
  useEffect(() => {
    // This access will be logged server-side
    fetchAssessment(assessmentId);
  }, [assessmentId]);
  
  return (
    <div>
      <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
        <span className="font-medium">Privacy Notice:</span> Your access to this 
        candidate's data is logged for compliance purposes.
      </div>
      {/* Assessment details */}
    </div>
  );
}
```

---

## 14. Testing and Validation

### 14.1 GDPR Compliance Test Cases

```javascript
// tests/gdpr/consent.test.js

describe('GDPR Consent', () => {
  test('Registration requires terms consent', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        display_name: 'Test User',
        password: 'SecurePassword123!',
        consent_terms: false  // Not consented
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('consent');
  });
  
  test('Consent is recorded with timestamp', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        display_name: 'Test User',
        password: 'SecurePassword123!',
        consent_terms: true,
        consent_service_emails: true
      });
    
    expect(response.status).toBe(201);
    expect(response.body.consents_recorded.terms).toBeDefined();
    
    // Verify in database
    const consent = await db.query(
      'SELECT * FROM user_consents WHERE user_id = $1',
      [response.body.user_id]
    );
    expect(consent.rows.length).toBe(2);
  });
  
  test('Consent can be withdrawn', async () => {
    // Create user with marketing consent
    const user = await createTestUser({ consent_marketing_emails: true });
    
    // Withdraw consent
    const response = await request(app)
      .delete('/api/users/me/consents/marketing_emails')
      .set('Authorization', `Bearer ${user.token}`);
    
    expect(response.status).toBe(200);
    
    // Verify withdrawal recorded
    const consent = await db.query(
      `SELECT * FROM user_consents 
       WHERE user_id = $1 AND consent_type = 'marketing_emails'`,
      [user.id]
    );
    expect(consent.rows[0].granted).toBe(false);
    expect(consent.rows[0].withdrawn_at).toBeDefined();
  });
});

// tests/gdpr/data-access.test.js

describe('GDPR Right of Access', () => {
  test('User can export all their data', async () => {
    const user = await createTestUserWithData();
    
    const response = await request(app)
      .get('/api/users/me/data-export')
      .set('Authorization', `Bearer ${user.token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data_subject.email).toBe(user.email);
    expect(response.body.consents).toBeDefined();
    expect(response.body.assessments_taken).toBeDefined();
    expect(response.body.tests_created).toBeDefined();
  });
  
  test('Export is logged in audit trail', async () => {
    const user = await createTestUser();
    
    await request(app)
      .get('/api/users/me/data-export')
      .set('Authorization', `Bearer ${user.token}`);
    
    const auditLog = await db.query(
      `SELECT * FROM audit_logs 
       WHERE actor_id = $1 AND action_type = 'DATA_EXPORT_REQUEST'`,
      [user.id]
    );
    expect(auditLog.rows.length).toBe(1);
  });
  
  test('Candidate can access data with token', async () => {
    const assessment = await createTestAssessment();
    
    const response = await request(app)
      .get(`/api/assessments/${assessment.id}/data-export`)
      .query({ token: assessment.data_access_token });
    
    expect(response.status).toBe(200);
    expect(response.body.candidate_name).toBe(assessment.candidate_name);
  });
});

// tests/gdpr/deletion.test.js

describe('GDPR Right to Erasure', () => {
  test('User can request account deletion', async () => {
    const user = await createTestUser();
    
    const response = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .set('X-Confirm-Deletion', 'DELETE MY ACCOUNT');
    
    expect(response.status).toBe(202);
    expect(response.body.deletion_scheduled_for).toBeDefined();
    
    // Verify soft delete
    const dbUser = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
    expect(dbUser.rows[0].deletion_scheduled_for).toBeDefined();
  });
  
  test('User can cancel pending deletion', async () => {
    const user = await createTestUserWithPendingDeletion();
    
    const response = await request(app)
      .delete('/api/users/me/deletion')
      .set('Authorization', `Bearer ${user.token}`);
    
    expect(response.status).toBe(200);
    
    // Verify cancellation
    const dbUser = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
    expect(dbUser.rows[0].deletion_scheduled_for).toBeNull();
  });
  
  test('Deletion cascades to all related data', async () => {
    const user = await createTestUserWithFullData();
    
    // Trigger immediate deletion for testing
    await performImmediateDeletion(user.id);
    
    // Verify all related data deleted
    const userData = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
    const consents = await db.query('SELECT * FROM user_consents WHERE user_id = $1', [user.id]);
    const tests = await db.query('SELECT * FROM tests WHERE author_id = $1', [user.id]);
    
    expect(userData.rows.length).toBe(0);
    expect(consents.rows.length).toBe(0);
    expect(tests.rows.length).toBe(0);
  });
});

// tests/gdpr/retention.test.js

describe('GDPR Data Retention', () => {
  test('Abandoned assessments auto-deleted after 7 days', async () => {
    // Create abandoned assessment from 8 days ago
    const assessment = await createTestAssessment({
      status: 'ABANDONED',
      retention_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    });
    
    // Run cleanup
    await runRetentionCleanup();
    
    // Verify deleted
    const result = await db.query('SELECT * FROM assessments WHERE id = $1', [assessment.id]);
    expect(result.rows.length).toBe(0);
  });
  
  test('Completed assessments retained for configured period', async () => {
    const assessment = await createTestAssessment({
      status: 'COMPLETED',
      retention_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });
    
    // Run cleanup
    await runRetentionCleanup();
    
    // Verify NOT deleted
    const result = await db.query('SELECT * FROM assessments WHERE id = $1', [assessment.id]);
    expect(result.rows.length).toBe(1);
  });
});
```

### 14.2 Security Test Cases

```javascript
// tests/security/rate-limiting.test.js

describe('Rate Limiting', () => {
  test('Login limited to 5 attempts per 15 minutes', async () => {
    const email = 'test@example.com';
    
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrong' });
    }
    
    // 6th attempt should be blocked
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong' });
    
    expect(response.status).toBe(429);
    expect(response.body.retry_after).toBeDefined();
  });
});

// tests/security/audit-logging.test.js

describe('Audit Logging', () => {
  test('Admin access to assessment data is logged', async () => {
    const admin = await createTestAdmin();
    const assessment = await createTestAssessment();
    
    await request(app)
      .get(`/api/admin/assessments/${assessment.id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    
    const log = await db.query(
      `SELECT * FROM audit_logs 
       WHERE actor_id = $1 
       AND action_type = 'VIEW_ASSESSMENT_RESULTS'
       AND resource_id = $2`,
      [admin.id, assessment.id]
    );
    
    expect(log.rows.length).toBe(1);
    expect(log.rows[0].details.candidate_name).toBeDefined();
  });
});
```

### 14.3 Compliance Verification Checklist

Before deployment, verify:

```
CONSENT
□ Registration consent UI implemented and tested
□ Candidate consent UI implemented and tested
□ Consent records stored with timestamps
□ Consent withdrawal functional
□ Consent version tracking implemented

DATA ACCESS
□ Data export endpoint functional
□ Export includes all user data categories
□ Export format is machine-readable (JSON)
□ Candidate data access token system works
□ Export logged in audit trail

RECTIFICATION
□ Profile editing functional
□ Email change triggers re-verification
□ Changes logged in audit trail

DELETION
□ Self-service deletion implemented
□ 14-day grace period functional
□ Deletion cascade tested
□ Candidate deletion request functional
□ Anonymized audit record retained

RETENTION
□ Retention periods configured
□ Automatic cleanup jobs scheduled
□ Abandoned assessment cleanup tested
□ Inactive user cleanup tested

SECURITY
□ Rate limiting functional on login
□ Rate limiting functional on password reset
□ Audit logging comprehensive
□ Encryption at rest enabled
□ Security headers verified

TRANSPARENCY
□ Privacy policy published
□ Storage consent banner implemented
□ Data rights UI accessible
□ Admin data access notifications shown
```

---

## 15. International Data Transfers

### 15.1 Current Transfer Mechanism

CleverBadge uses Render.com hosting in Oregon, USA. For EU users, this constitutes an international data transfer requiring legal safeguards.

| Transfer | Safeguard | Status |
|----------|-----------|--------|
| User data → Render.com (USA) | EU Standard Contractual Clauses | Required in DPA |
| User data → Email provider (TBD) | Depends on provider | TBD |

### 15.2 Implementation Requirements

**Privacy Policy Disclosure:**

```
International Data Transfers

Your personal data is processed on servers located in the United States. 
We ensure adequate protection through:
- EU Standard Contractual Clauses with our hosting provider
- Technical security measures (encryption, access controls)

You can request a copy of the safeguards by contacting [email].
```

**Consent Form Addition:**

```
☐ I understand my data will be stored on servers in the USA and 
   is protected by EU Standard Contractual Clauses
```

### 15.3 Alternative: EU Hosting

If EU data residency is preferred, consider migrating to:

| Provider | EU Region | Notes |
|----------|-----------|-------|
| Render.com | Frankfurt (EU) | Available on Team/Organization plans |
| Railway | EU available | Alternative PaaS |
| Fly.io | Amsterdam | Edge deployment |
| Scaleway | Paris | French cloud provider |

Migration would eliminate the need for transfer safeguards for EU users.

---

## Appendix A: Quick Reference Card

Print and post near development workstations:

```
╔═══════════════════════════════════════════════════════════════════╗
║                    GDPR QUICK REFERENCE                            ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  BEFORE COLLECTING DATA                                            ║
║  □ Is this data strictly necessary?                                ║
║  □ Do we have consent or another lawful basis?                     ║
║  □ Have we told the user why we're collecting it?                  ║
║                                                                    ║
║  WHEN STORING DATA                                                 ║
║  □ Is it encrypted? (at rest and in transit)                       ║
║  □ Who has access? (minimum necessary)                             ║
║  □ When will it be deleted? (retention period)                     ║
║                                                                    ║
║  WHEN ACCESSING DATA                                               ║
║  □ Is this access logged?                                          ║
║  □ Do I have a legitimate purpose?                                 ║
║                                                                    ║
║  USER RIGHTS (respond within 30 days)                              ║
║  • Access: Show them all their data                                ║
║  • Rectify: Let them correct errors                                ║
║  • Delete: Remove all their data                                   ║
║  • Port: Export in machine-readable format                         ║
║                                                                    ║
║  WHEN IN DOUBT                                                     ║
║  → Collect less data                                               ║
║  → Log more access                                                 ║
║  → Ask the legal team                                              ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Appendix B: Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2025 | Legal Counsel | Initial release for V2 development |

---

*This document constitutes legal guidance for technical implementation. For questions regarding legal interpretation, consult with qualified legal counsel.*

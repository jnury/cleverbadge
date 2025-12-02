# User Management System - Design

> **Status:** Draft
> **Created:** 2025-01-29
> **Author:** Claude + Human collaboration

## Overview

Transform CleverBadge from a single-admin tool into a multi-user platform where anyone can register, take assessments, and request author privileges to create content.

### Key Decisions

- **Three roles:** USER (default) → AUTHOR (by request) → ADMIN
- **Open registration:** Anyone can register, starts as USER
- **Author promotion:** Via request form + admin approval
- **Anonymous tests:** Still supported, with warning about unsaved results
- **Email integration:** TBD (abstracted for future implementation)

---

## Data Model

### Extended `users` Table

```sql
users
├── id              UUID PRIMARY KEY
├── email           VARCHAR(255) UNIQUE NOT NULL
├── display_name    VARCHAR(100) UNIQUE NOT NULL
├── password_hash   VARCHAR(255) NOT NULL
├── bio             TEXT
├── role            ENUM('USER', 'AUTHOR', 'ADMIN') DEFAULT 'USER'
├── is_active       BOOLEAN DEFAULT FALSE  -- activated after email verification
├── is_disabled     BOOLEAN DEFAULT FALSE  -- admin can disable
├── email_verified  BOOLEAN DEFAULT FALSE
├── last_login_at   TIMESTAMP
├── created_at      TIMESTAMP DEFAULT NOW()
├── updated_at      TIMESTAMP DEFAULT NOW()
```

### New Table: `author_requests`

```sql
author_requests
├── id                  UUID PRIMARY KEY
├── user_id             UUID REFERENCES users(id)
├── knowledge_domain    VARCHAR(255) NOT NULL
├── authoring_intent    ENUM('personal', 'professional', 'education', 'other')
├── organization        VARCHAR(255)
├── description         TEXT NOT NULL
├── status              ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
├── admin_message       TEXT  -- feedback on approval/rejection
├── reviewed_by         UUID REFERENCES users(id)
├── reviewed_at         TIMESTAMP
├── created_at          TIMESTAMP DEFAULT NOW()
```

### New Table: `email_tokens`

```sql
email_tokens
├── id          UUID PRIMARY KEY
├── user_id     UUID REFERENCES users(id)
├── token       VARCHAR(255) UNIQUE NOT NULL
├── type        ENUM('verification', 'password_reset')
├── expires_at  TIMESTAMP NOT NULL
├── used_at     TIMESTAMP
├── created_at  TIMESTAMP DEFAULT NOW()
```

---

## API Endpoints

### Public Endpoints (no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account (email, display_name, password) |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Set new password with token |
| POST | `/api/auth/resend-verification` | Resend verification email |

### Authenticated Endpoints (any logged-in user)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update own profile (display_name, bio) |
| PUT | `/api/users/me/password` | Change own password |
| GET | `/api/users/me/assessments` | List own assessment history |
| POST | `/api/author-requests` | Submit author request (USER only) |
| GET | `/api/author-requests/me` | Get own request status |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users (search, filter, paginate) |
| GET | `/api/admin/users/:id` | Get user details + activity |
| PUT | `/api/admin/users/:id` | Edit user profile |
| PUT | `/api/admin/users/:id/role` | Change user role |
| PUT | `/api/admin/users/:id/disable` | Disable/enable account |
| DELETE | `/api/admin/users/:id` | Delete user (reassign content) |
| GET | `/api/admin/author-requests` | List pending requests |
| PUT | `/api/admin/author-requests/:id` | Approve/reject with message |

---

## Frontend Pages & Components

### New Public Pages

| Page | Route | Description |
|------|-------|-------------|
| Register | `/register` | Email, display name, password, confirm password |
| Login | `/login` | Email, password, "Forgot password?" link |
| Verify Email | `/verify-email/:token` | Auto-verify on load, show success/error |
| Forgot Password | `/forgot-password` | Enter email to receive reset link |
| Reset Password | `/reset-password/:token` | New password + confirm |

### New Authenticated Pages

| Page | Route | Description |
|------|-------|-------------|
| My Profile | `/profile` | View/edit display name, bio, change password |
| My Assessments | `/my-assessments` | List of taken tests with scores, dates |
| Request Author | `/request-author` | Form to request AUTHOR role (USER only) |
| Request Status | `/request-status` | Show pending/approved/rejected status |

### Admin Dashboard - New Tabs

| Tab | Content |
|-----|---------|
| Users | List users, search, filter by role/status, actions (edit, disable, delete) |
| Author Requests | List pending requests, review modal (approve/reject + message) |

### Navigation Changes

- **Logged out:** Login / Register buttons
- **Logged in (USER):** My Profile, My Assessments, "Become an Author" CTA
- **Logged in (AUTHOR):** My Profile, My Assessments, Admin Dashboard (limited)
- **Logged in (ADMIN):** Full Admin Dashboard with Users tab

---

## User Profile

| Field | Required | Notes |
|-------|----------|-------|
| Email | Yes | Login + password reset, unique |
| Display name | Yes | Shown publicly, unique |
| Password | Yes | Hashed with argon2 |
| Bio | No | Short description |
| Role | Yes | USER / AUTHOR / ADMIN |
| Avatar | Auto | Generated from initials |
| Created at | Auto | Registration timestamp |
| Last login | Auto | Updated on each login |

---

## Authentication Flows

### Registration Flow

```
Register → Account created (inactive) → Email sent → Click link (24h) → Account active → Can log in
```

### Password Reset Flow

```
"Forgot password" → Enter email → Reset link sent → Click link (1h) → Set new password → Logged in
```

### Author Request Flow

```
USER submits form → Status: pending → Admin reviews → Approve/Reject with message → USER notified
```

**Author Request Form Fields:**

| Field | Type | Required |
|-------|------|----------|
| Knowledge domain | Dropdown/tags | Yes |
| Authoring intent | Radio (personal/professional/education/other) | Yes |
| Organization | Text | No |
| Brief description | Textarea | Yes |

---

## Email System (TBD)

Email integration is not yet determined. The system should be abstracted to support:

- **Development:** Log emails to console
- **Production:** SMTP or transactional service (Resend, SendGrid, Mailgun, etc.)

**Required Email Templates:**

| Template | Trigger | Expiry |
|----------|---------|--------|
| Verification | Registration | 24 hours |
| Password Reset | Forgot password | 1 hour |
| Author Approved | Admin approves | N/A |
| Author Rejected | Admin rejects | N/A |

**Rate Limiting (abuse prevention):**

| Action | Limit |
|--------|-------|
| Registration | 5 per IP per hour |
| Password reset request | 3 per email per hour |
| Resend verification | 3 per email per hour |

---

## Migration Strategy

### Database Migration Steps

1. Add new columns to existing `users` table
2. Set existing admins: `role = 'ADMIN'`, `is_active = true`, `email_verified = true`
3. Add `email` column (initially copy from username or require admins to set)
4. Create new tables: `author_requests`, `email_tokens`

### Backward Compatibility

| Feature | Current Behavior | New Behavior |
|---------|------------------|--------------|
| Anonymous tests | Works | Still works, with warning about unsaved results |
| Admin login | `/admin/login` | Redirect to `/login`, then to dashboard if ADMIN/AUTHOR |
| Existing admin users | Work as before | Automatically become ADMIN role |
| Question/test ownership | `author_id` exists | No change, already tracks ownership |

### Content Ownership on User Deletion

1. Find all questions/tests where `author_id = deleted_user_id`
2. Reassign to the admin performing the deletion
3. Log the reassignment for audit trail
4. Delete the user

---

## Implementation Phases

### Phase 1 - Core Auth (foundation)
- [ ] Extend users table with new fields
- [ ] Registration + login endpoints
- [ ] Login/register pages
- [ ] JWT includes role, update auth middleware

### Phase 2 - Email Verification & Password Reset
- [ ] Email tokens table
- [ ] Verification/reset endpoints
- [ ] Email service abstraction (TBD implementation)
- [ ] Frontend pages for verify/reset flows

### Phase 3 - User Profiles
- [ ] Profile endpoints (view/edit)
- [ ] My Profile page
- [ ] My Assessments page (link assessments to user)
- [ ] Avatar generation from initials

### Phase 4 - Author Requests
- [ ] Author requests table
- [ ] Request submission endpoint + page
- [ ] Admin review endpoints
- [ ] Admin dashboard: Author Requests tab

### Phase 5 - Admin User Management
- [ ] Admin user CRUD endpoints
- [ ] Admin dashboard: Users tab
- [ ] Role management, disable/enable, delete with reassign

---

## Role Permissions Matrix

| Capability | ADMIN | AUTHOR | USER |
|------------|:-----:|:------:|:----:|
| Take tests | Yes | Yes | Yes |
| View own assessment history | Yes | Yes | Yes |
| Create/edit own questions | Yes | Yes | No |
| Create/edit own tests | Yes | Yes | No |
| View analytics for own tests | Yes | Yes | No |
| Manage all questions/tests | Yes | No | No |
| Manage users & promote roles | Yes | No | No |
| Access admin dashboard | Yes | Yes | No |

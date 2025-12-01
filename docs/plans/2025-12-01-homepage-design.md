# Homepage Design

## Overview

A minimalist, single-page scrolling homepage for CleverBadge that showcases the platform's features and allows visitors to try a sample test or log in via modal.

**Target audience:** General mix - recruiters/HR teams, educators, and tech teams.

**Tone:** Friendly and approachable - simple, direct messaging.

## Page Structure

```
┌─────────────────────────────────────────┐
│  Navigation (sticky)                    │
├─────────────────────────────────────────┤
│                                         │
│              Hero Section               │
│            (full viewport)              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│           Features Grid                 │
│           (2x2 screenshots)             │
│                                         │
├─────────────────────────────────────────┤
│           CTA Section                   │
├─────────────────────────────────────────┤
│              Footer                     │
└─────────────────────────────────────────┘
```

## Navigation Header

**Behavior:** Fixed/sticky at top on scroll with subtle shadow.

**Layout:**
- Left: Logo (`media/logo.png`) + "Clever Badge" text
- Right (not logged in): "Features" (anchor) | "Try Demo" (button) | "Login" (button)
- Right (logged in with dashboard access): "Features" (anchor) | "Try Demo" (button) | "Dashboard" (link to `/dashboard`)

**Mobile:** Hamburger menu containing same items.

**Login button:** Opens login modal (not a separate page).
**Dashboard link:** Direct link to `/dashboard` (only shown when authenticated with appropriate role).

## Hero Section

**Layout:** Full viewport height (100vh), centered content, gradient background (white to `gray-50`).

**Content (top to bottom):**
1. Logo - Fox shield, ~120-150px
2. Headline - "Create tests. Share links. Get results."
3. Subheadline - "A simple platform to assess skills with multiple-choice questions. Perfect for recruiters, educators, and tech teams."
4. Primary CTA - "Try a Sample Test" button (teal/primary, large)
5. Secondary link - "or learn more about features" (scrolls to features section)
6. Illustration (optional, see Assets section)
7. Scroll indicator - Animated chevron at bottom

## Features Grid

**Layout:** Section with white background, centered title, 2x2 grid (stacks on mobile).

**Section title:** "Everything you need to assess skills"

**Cards:**

| Position | Screenshot | Title | Description |
|----------|------------|-------|-------------|
| Top-left | `App_ScreenShot_06.png` | Rich Question Types | Support for code snippets, markdown, and multiple choice formats. |
| Top-right | `App_ScreenShot_03.png` | Easy Test Management | Create tests, set pass thresholds, and share with a simple link. |
| Bottom-left | `App_ScreenShot_04.png` | Track Candidates | Monitor progress and review detailed results in real-time. |
| Bottom-right | `App_ScreenShot_05.png` | Built-in Analytics | See success rates and difficulty insights for every question. |

**Card styling:**
- Rounded corners (`rounded-lg`)
- Subtle shadow (`shadow-md`)
- Screenshot with slight border/frame effect
- Hover: subtle lift animation (`hover:-translate-y-1`)

## CTA Section

**Layout:** Light teal/primary background, centered content.

**Content:**
- Headline: "Ready to get started?"
- Subtext: "Try a sample test to see how it works, or log in to create your own."
- Two buttons (not logged in):
  - "Try Sample Test" (white with teal text)
  - "Login" (outlined white, opens modal)
- Two buttons (logged in with dashboard access):
  - "Try Sample Test" (white with teal text)
  - "Go to Dashboard" (outlined white, links to `/dashboard`)

## Login Modal

**Behavior:**
- Replaces `/admin/login` page entirely
- Triggered by any "Login" button
- Reuses existing login form logic from `AdminLogin.jsx`
- Successful login redirects to `/dashboard`
- Direct visits to `/dashboard` when unauthenticated redirect to homepage with modal auto-opened

**Future-proofing:** Structure allows adding "Register" tab when user registration is implemented.

## Footer

Keep existing `Footer.jsx` component unchanged (version info, copyright, dark gray background).

## Mobile Responsiveness

- Navigation: Collapses to hamburger menu
- Hero: Stays centered, smaller text sizes
- Features: Single column (stacked cards)
- CTA: Buttons stack vertically

## Animations

- Fade-in on scroll for feature cards
- Smooth scroll for anchor navigation
- Modal fade/slide for login
- Scroll indicator pulse animation

## Assets

### Existing Assets (in `media/`)
- `logo.png` - Fox shield logo
- `App_ScreenShot_03.png` - Test management
- `App_ScreenShot_04.png` - Candidate results
- `App_ScreenShot_05.png` - Analytics
- `App_ScreenShot_06.png` - Code question

### Assets to Generate

**Hero illustration:**
"A clean, minimal line-art illustration showing a clipboard with checkmarks, connected by dotted lines to three simple user avatars, representing the flow from test creation to candidate completion. Teal and gray color palette, flat/modern style, transparent background."

## Routes Changes

| Route | Before | After |
|-------|--------|-------|
| `/` | Simple centered text + login link | New homepage |
| `/admin/login` | Login page | Remove entirely |
| `/admin` | Admin dashboard | Rename to `/dashboard` |
| `/admin/assessment/:id` | Assessment detail | Rename to `/dashboard/assessment/:id` |
| `/dashboard` (unauthenticated) | N/A | Redirect to `/` with modal auto-open |
| `/dashboard` (authenticated) | N/A | Dashboard (formerly admin) |

## Files to Modify

- `frontend/src/pages/Home.jsx` - Complete rewrite with new homepage
- `frontend/src/App.jsx` - Update routes (remove `/admin/*`, add `/dashboard/*`)
- `frontend/src/components/LoginModal.jsx` - New component (extract logic from AdminLogin)
- `frontend/src/components/Navigation.jsx` - New component for sticky header
- `frontend/src/components/ProtectedRoute.jsx` - Update redirect to `/` with modal trigger
- `frontend/src/pages/admin/` - Rename directory to `frontend/src/pages/dashboard/`
- `frontend/src/pages/admin/AdminLogin.jsx` - Remove file
- `frontend/src/pages/admin/AdminDashboard.jsx` - Rename to `dashboard/Dashboard.jsx`
- `frontend/src/pages/admin/AssessmentDetail.jsx` - Move to `dashboard/AssessmentDetail.jsx`

## Demo Test Requirement

A sample/demo test must be available for the "Try Demo" CTA. Options:
1. Create a seeded public demo test with slug like `/t/demo`
2. Use an existing public test
3. Create a dedicated demo that resets periodically

Recommendation: Create a seeded demo test with slug `demo` that is always available.

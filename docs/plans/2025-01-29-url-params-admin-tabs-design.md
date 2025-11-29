# URL Parameters for Admin Dashboard Tabs

## Overview

Sync admin dashboard tab state and filters with URL query parameters so that:
- Refreshing the page preserves the current tab and filters
- URLs are shareable/bookmarkable
- Browser back/forward navigation works

## URL Structure

Format: `/admin/dashboard?tab=questions&type=SINGLE&visibility=public`

Parameters with default/null values are removed from URL to keep it clean.

## Parameter Mapping

### Tab Selection
| State | URL Param | Values |
|-------|-----------|--------|
| `activeTab` | `tab` | questions, tests, assessments, analytics |

### Questions Tab
| State | URL Param | Values |
|-------|-----------|--------|
| `filterType` | `type` | SINGLE, MULTIPLE |
| `filterVisibility` | `visibility` | public, private, protected |
| `filterAuthor` | `author` | (author UUID) |
| `searchTag` | `tag` | (text) |
| `sortOrder` | `sort` | asc, desc |

### Tests Tab
| State | URL Param | Values |
|-------|-----------|--------|
| `filterVisibility` | `visibility` | public, private, protected |
| `filterStatus` | `status` | enabled, disabled |
| `searchTitle` | `search` | (text) |

### Assessments Tab
| State | URL Param | Values |
|-------|-----------|--------|
| `filterTest` | `test` | (test UUID) |
| `filterStatus` | `status` | STARTED, COMPLETED |
| `sortBy` | `sort` | date-desc, date-asc, score-desc, score-asc, name-asc, name-desc |

### Analytics Tab
| State | URL Param | Values |
|-------|-----------|--------|
| `selectedTestId` | `test` | (test UUID) |

## Implementation

### New Hook: `useUrlParams`

Location: `frontend/src/hooks/useUrlParams.js`

Responsibilities:
- Read URL params on mount to set initial state
- Update URL when state changes
- React to browser back/forward navigation

API:
```javascript
const [params, setParam] = useUrlParams({
  tab: 'questions',  // default value
  type: null,        // null = not in URL
});

// Read: params.tab, params.type
// Write: setParam('type', 'SINGLE') or setParam('type', null) to clear
```

### Component Changes

**AdminDashboard.jsx:**
- Replace `useState('questions')` with URL-based tab
- Clear other tabs' params when switching tabs

**QuestionsTab.jsx, TestsTab.jsx, AssessmentsTab.jsx, AnalyticsTab.jsx:**
- Replace filter/sort `useState` calls with `useUrlParams`
- Update onChange handlers to use `setParam`

## Behavior

### Tab Switching
- Switching tabs clears other tabs' filter params from URL
- URL shows only current tab's state

### Invalid Parameters
- Unknown tab value → default to `questions`
- Invalid filter value → ignore, use default
- UUID that doesn't match records → empty results (existing behavior)

### Browser Navigation
- Back/Forward buttons update state from URL
- Refresh preserves tab + filters
- URLs are shareable between admins

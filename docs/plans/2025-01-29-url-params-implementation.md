# URL Parameters for Admin Dashboard - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sync admin dashboard tab and filter state with URL query parameters for persistence on refresh and shareable URLs.

**Architecture:** Create a `useUrlParams` hook using React Router's `useSearchParams`. Each tab component reads/writes its own params. AdminDashboard manages the `tab` param and clears other params on tab switch.

**Tech Stack:** React, react-router-dom (useSearchParams), Vitest for testing

---

## Task 1: Create useUrlParams Hook with Tests

**Files:**
- Create: `frontend/src/hooks/useUrlParams.js`
- Create: `frontend/tests/hooks/useUrlParams.test.jsx`

**Step 1: Create test file with initial tests**

Create `frontend/tests/hooks/useUrlParams.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useUrlParams } from '../../src/hooks/useUrlParams';

// Wrapper with router
const createWrapper = (initialEntries = ['/']) => {
  return ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
};

describe('useUrlParams Hook', () => {
  it('returns default values when URL has no params', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper() }
    );

    expect(result.current[0].tab).toBe('questions');
    expect(result.current[0].type).toBe(null);
  });

  it('reads initial values from URL', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper(['/?tab=tests&type=SINGLE']) }
    );

    expect(result.current[0].tab).toBe('tests');
    expect(result.current[0].type).toBe('SINGLE');
  });

  it('updates URL when setParam is called', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current[1]('type', 'MULTIPLE');
    });

    expect(result.current[0].type).toBe('MULTIPLE');
  });

  it('removes param from URL when set to null', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper(['/?type=SINGLE']) }
    );

    expect(result.current[0].type).toBe('SINGLE');

    act(() => {
      result.current[1]('type', null);
    });

    expect(result.current[0].type).toBe(null);
  });

  it('removes param when set to default value', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper(['/?tab=tests']) }
    );

    act(() => {
      result.current[1]('tab', 'questions');
    });

    // Should use default, not in URL
    expect(result.current[0].tab).toBe('questions');
  });

  it('clearParams removes specified params', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null, visibility: null }),
      { wrapper: createWrapper(['/?tab=tests&type=SINGLE&visibility=public']) }
    );

    act(() => {
      result.current[2](['type', 'visibility']);
    });

    expect(result.current[0].tab).toBe('tests');
    expect(result.current[0].type).toBe(null);
    expect(result.current[0].visibility).toBe(null);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- useUrlParams`

Expected: FAIL - module not found

**Step 3: Create the hook implementation**

Create `frontend/src/hooks/useUrlParams.js`:

```javascript
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Hook to sync state with URL query parameters.
 *
 * @param {Object} defaults - Object with param names as keys and default values.
 *                            Use null for params that should be removed when empty.
 * @returns {[Object, Function, Function]} - [params, setParam, clearParams]
 *
 * @example
 * const [params, setParam, clearParams] = useUrlParams({
 *   tab: 'questions',  // default value
 *   type: null,        // no default, removed when null
 * });
 *
 * // Read: params.tab, params.type
 * // Write: setParam('type', 'SINGLE')
 * // Clear: setParam('type', null) or clearParams(['type', 'visibility'])
 */
export const useUrlParams = (defaults) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Build current params object from URL + defaults
  const params = useMemo(() => {
    const result = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      const urlValue = searchParams.get(key);
      result[key] = urlValue !== null ? urlValue : defaultValue;
    }
    return result;
  }, [searchParams, defaults]);

  // Set a single param
  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      // Remove if null or matches default
      if (value === null || value === '' || value === defaults[key]) {
        next.delete(key);
      } else {
        next.set(key, value);
      }

      return next;
    }, { replace: true });
  }, [setSearchParams, defaults]);

  // Clear multiple params at once
  const clearParams = useCallback((keys) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of keys) {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return [params, setParam, clearParams];
};
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- useUrlParams`

Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add frontend/src/hooks/useUrlParams.js frontend/tests/hooks/useUrlParams.test.jsx
git commit -m "feat: add useUrlParams hook for URL-based state sync"
```

---

## Task 2: Update AdminDashboard to Use URL Params for Tab

**Files:**
- Modify: `frontend/src/pages/admin/AdminDashboard.jsx`

**Step 1: Update imports and replace useState with useUrlParams**

In `frontend/src/pages/admin/AdminDashboard.jsx`, make these changes:

Change line 1 from:
```javascript
import React, { useState, useRef, useEffect } from 'react';
```
To:
```javascript
import React, { useRef, useEffect } from 'react';
```

Add after line 2 (after `import { useNavigate } from 'react-router-dom';`):
```javascript
import { useUrlParams } from '../../hooks/useUrlParams';
```

**Step 2: Replace activeTab state with URL params**

Replace line 13:
```javascript
const [activeTab, setActiveTab] = useState('questions');
```
With:
```javascript
// All URL param keys for all tabs - used to clear on tab switch
const ALL_TAB_PARAMS = ['type', 'visibility', 'author', 'tag', 'sort', 'status', 'search', 'test'];
const VALID_TABS = ['questions', 'tests', 'assessments', 'analytics'];

const [urlParams, setParam, clearParams] = useUrlParams({ tab: 'questions' });

// Validate tab value
const activeTab = VALID_TABS.includes(urlParams.tab) ? urlParams.tab : 'questions';
```

**Step 3: Update setActiveTab calls to use setParam and clear other params**

Replace line 115 (in the tab button onClick):
```javascript
onClick={() => setActiveTab(tab.id)}
```
With:
```javascript
onClick={() => {
  clearParams(ALL_TAB_PARAMS);
  setParam('tab', tab.id);
}}
```

**Step 4: Run the app to verify tab switching works**

Run: `cd frontend && npm run dev`

Manual test:
1. Go to `/admin` (login if needed)
2. Click "Tests" tab - URL should show `?tab=tests`
3. Click "Questions" tab - URL should show no params (default)
4. Refresh page - should stay on current tab

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/AdminDashboard.jsx
git commit -m "feat: sync admin dashboard tab with URL params"
```

---

## Task 3: Update QuestionsTab to Use URL Params for Filters

**Files:**
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx`

**Step 1: Add import for useUrlParams**

Add after line 1 (after the React import):
```javascript
import { useUrlParams } from '../../hooks/useUrlParams';
```

**Step 2: Replace filter/sort useState with useUrlParams**

Replace lines 15-18:
```javascript
const [filterType, setFilterType] = useState('ALL');
const [filterVisibility, setFilterVisibility] = useState('ALL');
const [filterAuthor, setFilterAuthor] = useState('ALL');
const [searchTag, setSearchTag] = useState('');
```

And line 28:
```javascript
const [sortOrder, setSortOrder] = useState(null); // null | 'asc' | 'desc'
```

With this single block (place after line 14, the loading state):
```javascript
// URL-synced filters
const [urlParams, setParam] = useUrlParams({
  type: null,
  visibility: null,
  author: null,
  tag: null,
  sort: null
});

// Map URL params to filter values (null -> 'ALL' for dropdowns)
const filterType = urlParams.type || 'ALL';
const filterVisibility = urlParams.visibility || 'ALL';
const filterAuthor = urlParams.author || 'ALL';
const searchTag = urlParams.tag || '';
const sortOrder = urlParams.sort || null;
```

**Step 3: Update filter onChange handlers**

Replace the Type select onChange (around line 450):
```javascript
onChange={(e) => setFilterType(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('type', e.target.value === 'ALL' ? null : e.target.value)}
```

Replace the Visibility select onChange (around line 466):
```javascript
onChange={(e) => setFilterVisibility(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('visibility', e.target.value === 'ALL' ? null : e.target.value)}
```

Replace the Author select onChange (around line 480):
```javascript
onChange={(e) => setFilterAuthor(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('author', e.target.value === 'ALL' ? null : e.target.value)}
```

Replace the Search Tags input onChange (around line 494):
```javascript
onChange={(e) => setSearchTag(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('tag', e.target.value || null)}
```

**Step 4: Update sort toggle handler**

Replace the handleSortToggle function (around line 163-169):
```javascript
const handleSortToggle = () => {
  setSortOrder(current => {
    if (current === null) return 'asc';
    if (current === 'asc') return 'desc';
    return null;
  });
};
```
With:
```javascript
const handleSortToggle = () => {
  const next = sortOrder === null ? 'asc' : sortOrder === 'asc' ? 'desc' : null;
  setParam('sort', next);
};
```

**Step 5: Run the app to verify filters work with URL**

Run: `cd frontend && npm run dev`

Manual test:
1. Go to `/admin?tab=questions`
2. Select Type = "SINGLE" - URL should show `?tab=questions&type=SINGLE`
3. Select Visibility = "public" - URL should add `&visibility=public`
4. Refresh page - filters should persist
5. Clear a filter - param should be removed from URL

**Step 6: Commit**

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat: sync Questions tab filters with URL params"
```

---

## Task 4: Update TestsTab to Use URL Params for Filters

**Files:**
- Modify: `frontend/src/pages/admin/TestsTab.jsx`

**Step 1: Add import for useUrlParams**

Add after line 1:
```javascript
import { useUrlParams } from '../../hooks/useUrlParams';
```

**Step 2: Replace filter useState with useUrlParams**

Replace lines 22-24:
```javascript
const [filterVisibility, setFilterVisibility] = useState('ALL');
const [filterStatus, setFilterStatus] = useState('ALL');
const [searchTitle, setSearchTitle] = useState('');
```

With:
```javascript
// URL-synced filters
const [urlParams, setParam] = useUrlParams({
  visibility: null,
  status: null,
  search: null
});

const filterVisibility = urlParams.visibility || 'ALL';
const filterStatus = urlParams.status || 'ALL';
const searchTitle = urlParams.search || '';
```

**Step 3: Update filter onChange handlers**

Replace Visibility select onChange (around line 332):
```javascript
onChange={(e) => setFilterVisibility(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('visibility', e.target.value === 'ALL' ? null : e.target.value)}
```

Replace Status select onChange (around line 348):
```javascript
onChange={(e) => setFilterStatus(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('status', e.target.value === 'ALL' ? null : e.target.value)}
```

Replace Search Title input onChange (around line 360):
```javascript
onChange={(e) => setSearchTitle(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('search', e.target.value || null)}
```

**Step 4: Run the app to verify**

Run: `cd frontend && npm run dev`

Manual test:
1. Go to `/admin?tab=tests`
2. Apply filters - URL should update
3. Refresh - filters persist

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/TestsTab.jsx
git commit -m "feat: sync Tests tab filters with URL params"
```

---

## Task 5: Update AssessmentsTab to Use URL Params for Filters

**Files:**
- Modify: `frontend/src/pages/admin/AssessmentsTab.jsx`

**Step 1: Add import for useUrlParams**

Add after line 1:
```javascript
import { useUrlParams } from '../../hooks/useUrlParams';
```

**Step 2: Replace filter/sort useState with useUrlParams**

Replace lines 17-19:
```javascript
const [filterTest, setFilterTest] = useState('');
const [filterStatus, setFilterStatus] = useState('');
const [sortBy, setSortBy] = useState('date-desc');
```

With:
```javascript
// URL-synced filters
const [urlParams, setParam] = useUrlParams({
  test: null,
  status: null,
  sort: null
});

const filterTest = urlParams.test || '';
const filterStatus = urlParams.status || '';
const sortBy = urlParams.sort || 'date-desc';
```

**Step 3: Update filter onChange handlers**

Replace Test select onChange (around line 187):
```javascript
onChange={(e) => setFilterTest(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('test', e.target.value || null)}
```

Replace Status select onChange (around line 203):
```javascript
onChange={(e) => setFilterStatus(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('status', e.target.value || null)}
```

Replace Sort select onChange (around line 214):
```javascript
onChange={(e) => setSortBy(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('sort', e.target.value === 'date-desc' ? null : e.target.value)}
```

**Step 4: Run the app to verify**

Run: `cd frontend && npm run dev`

Manual test:
1. Go to `/admin?tab=assessments`
2. Apply filters and sort - URL should update
3. Refresh - filters persist

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/AssessmentsTab.jsx
git commit -m "feat: sync Assessments tab filters with URL params"
```

---

## Task 6: Update AnalyticsTab to Use URL Params

**Files:**
- Modify: `frontend/src/pages/admin/AnalyticsTab.jsx`

**Step 1: Add import for useUrlParams**

Add after line 1:
```javascript
import { useUrlParams } from '../../hooks/useUrlParams';
```

**Step 2: Replace selectedTestId useState with useUrlParams**

Replace line 6:
```javascript
const [selectedTestId, setSelectedTestId] = useState('');
```

With:
```javascript
// URL-synced test selection
const [urlParams, setParam] = useUrlParams({ test: null });
const selectedTestId = urlParams.test || '';
```

**Step 3: Update test select onChange**

Replace the test select onChange (around line 94):
```javascript
onChange={(e) => setSelectedTestId(e.target.value)}
```
With:
```javascript
onChange={(e) => setParam('test', e.target.value || null)}
```

**Step 4: Run the app to verify**

Run: `cd frontend && npm run dev`

Manual test:
1. Go to `/admin?tab=analytics`
2. Select a test - URL should show `?tab=analytics&test=<uuid>`
3. Refresh - same test should be selected

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/AnalyticsTab.jsx
git commit -m "feat: sync Analytics tab test selection with URL params"
```

---

## Task 7: Run Full Test Suite and Final Verification

**Step 1: Run all frontend tests**

Run: `cd frontend && npm test`

Expected: All tests pass

**Step 2: Run E2E tests**

Run: `./scripts/e2e-tests.sh`

Expected: All E2E tests pass (URL params shouldn't break existing flows)

**Step 3: Manual verification checklist**

Test each scenario:
- [ ] Questions tab: filters (type, visibility, author, tag), sort
- [ ] Tests tab: filters (visibility, status, search)
- [ ] Assessments tab: filters (test, status), sort
- [ ] Analytics tab: test selection
- [ ] Tab switching clears other tab's params
- [ ] Browser back/forward works
- [ ] Page refresh preserves state
- [ ] Invalid tab param defaults to questions
- [ ] Sharing URL with params works (open in incognito)

**Step 4: Bump version and final commit**

In `frontend/package.json`, update version from current to next minor:
```json
"version": "1.6.0"
```

```bash
git add frontend/package.json
git commit -m "chore: bump frontend version to 1.6.0"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create useUrlParams hook + tests | hooks/useUrlParams.js, tests/hooks/ |
| 2 | AdminDashboard tab param | AdminDashboard.jsx |
| 3 | QuestionsTab filters | QuestionsTab.jsx |
| 4 | TestsTab filters | TestsTab.jsx |
| 5 | AssessmentsTab filters | AssessmentsTab.jsx |
| 6 | AnalyticsTab test selection | AnalyticsTab.jsx |
| 7 | Full test suite + version bump | package.json |

# Questions Table with Bulk Operations - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace questions card list with a sortable table and add bulk operations (delete, change author, add to test).

**Architecture:** Frontend-first approach. Convert card list to table, add selection state, then implement bulk action modals. Backend adds three new bulk endpoints.

**Tech Stack:** React, Tailwind CSS, Express.js, postgres-js

---

## Task 1: Backend - Bulk Delete Endpoint

**Files:**
- Modify: `backend/routes/questions.js` (add after line 296, before `export default`)

**Step 1: Add the bulk delete endpoint**

Add this code before `export default router;`:

```javascript
// POST bulk delete questions
router.post('/bulk-delete',
  authenticateToken,
  body('question_ids').isArray({ min: 1 }).withMessage('question_ids must be a non-empty array'),
  body('question_ids.*').isUUID().withMessage('Each question_id must be a valid UUID'),
  body('force_remove_from_tests').optional().isBoolean().withMessage('force_remove_from_tests must be boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { question_ids, force_remove_from_tests = false } = req.body;

      let deleted = 0;
      let skipped = 0;
      const skipped_ids = [];

      for (const id of question_ids) {
        // Check if question is used in any tests
        const testsUsingQuestion = await sql`
          SELECT t.id, t.title
          FROM ${sql(dbSchema)}.test_questions tq
          INNER JOIN ${sql(dbSchema)}.tests t ON tq.test_id = t.id
          WHERE tq.question_id = ${id} AND t.is_archived = false
        `;

        if (testsUsingQuestion.length > 0) {
          if (force_remove_from_tests) {
            // Remove from all tests first
            await sql`
              DELETE FROM ${sql(dbSchema)}.test_questions
              WHERE question_id = ${id}
            `;
          } else {
            // Skip this question
            skipped++;
            skipped_ids.push(id);
            continue;
          }
        }

        // Soft delete
        const result = await sql`
          UPDATE ${sql(dbSchema)}.questions
          SET is_archived = true, updated_at = NOW()
          WHERE id = ${id} AND is_archived = false
          RETURNING id
        `;

        if (result.length > 0) {
          deleted++;
        }
      }

      res.json({ deleted, skipped, skipped_ids });
    } catch (error) {
      console.error('Error bulk deleting questions:', error);
      res.status(500).json({ error: 'Failed to bulk delete questions' });
    }
  }
);
```

**Step 2: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass (no new tests needed - this is an additive endpoint)

**Step 3: Commit**

```bash
git add backend/routes/questions.js
git commit -m "feat(api): add bulk delete endpoint for questions"
```

---

## Task 2: Backend - Bulk Change Author Endpoint

**Files:**
- Modify: `backend/routes/questions.js` (add after bulk-delete endpoint)

**Step 1: Add the bulk change author endpoint**

Add after the bulk-delete endpoint:

```javascript
// POST bulk change author
router.post('/bulk-change-author',
  authenticateToken,
  body('question_ids').isArray({ min: 1 }).withMessage('question_ids must be a non-empty array'),
  body('question_ids.*').isUUID().withMessage('Each question_id must be a valid UUID'),
  body('author_id').isUUID().withMessage('author_id must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { question_ids, author_id } = req.body;

      // Verify author exists
      const users = await sql`
        SELECT id FROM ${sql(dbSchema)}.users WHERE id = ${author_id}
      `;

      if (users.length === 0) {
        return res.status(404).json({ error: 'Author not found' });
      }

      // Update all questions
      const result = await sql`
        UPDATE ${sql(dbSchema)}.questions
        SET author_id = ${author_id}, updated_at = NOW()
        WHERE id = ANY(${question_ids}) AND is_archived = false
        RETURNING id
      `;

      res.json({ updated: result.length });
    } catch (error) {
      console.error('Error bulk changing author:', error);
      res.status(500).json({ error: 'Failed to bulk change author' });
    }
  }
);
```

**Step 2: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add backend/routes/questions.js
git commit -m "feat(api): add bulk change author endpoint for questions"
```

---

## Task 3: Backend - Bulk Add to Test Endpoint

**Files:**
- Modify: `backend/routes/tests.js` (add after existing POST /:id/questions endpoint, around line 410)

**Step 1: Add the bulk add to test endpoint**

Add after the existing `POST /:id/questions` endpoint:

```javascript
// POST bulk add questions to test (simplified - skips duplicates)
router.post('/:id/questions/bulk-add',
  authenticateToken,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  body('question_ids').isArray({ min: 1 }).withMessage('question_ids must be a non-empty array'),
  body('question_ids.*').isUUID().withMessage('Each question_id must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { question_ids } = req.body;
      const testId = req.params.id;

      // Get test with visibility
      const tests = await sql`
        SELECT * FROM ${sql(dbSchema)}.tests
        WHERE id = ${testId} AND is_archived = false
      `;

      if (tests.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const test = tests[0];

      // Get questions to check visibility
      const questionDetails = await sql`
        SELECT id, title, visibility
        FROM ${sql(dbSchema)}.questions
        WHERE id = ANY(${question_ids}) AND is_archived = false
      `;

      // Check visibility compatibility
      const incompatible = questionDetails.filter(q =>
        !canQuestionBeInTest(q.visibility, test.visibility)
      );

      if (incompatible.length > 0) {
        const questionTitles = incompatible.map(q => q.title).join(', ');
        return res.status(400).json({
          error: `Cannot add questions to ${test.visibility} test: incompatible visibility for: ${questionTitles}`,
          incompatible: incompatible.map(q => ({ id: q.id, title: q.title, visibility: q.visibility }))
        });
      }

      // Get existing questions in test
      const existing = await sql`
        SELECT question_id FROM ${sql(dbSchema)}.test_questions
        WHERE test_id = ${testId}
      `;
      const existingIds = new Set(existing.map(e => e.question_id));

      // Filter to only new questions
      const newQuestionIds = question_ids.filter(id => !existingIds.has(id));
      const skipped = question_ids.length - newQuestionIds.length;

      if (newQuestionIds.length > 0) {
        // Build values for insert
        const values = newQuestionIds.map(qid => ({
          test_id: testId,
          question_id: qid,
          weight: 1
        }));

        await sql`
          INSERT INTO ${sql(dbSchema)}.test_questions ${sql(values, 'test_id', 'question_id', 'weight')}
        `;
      }

      res.json({ added: newQuestionIds.length, skipped });
    } catch (error) {
      console.error('Error bulk adding questions to test:', error);
      res.status(500).json({ error: 'Failed to bulk add questions to test' });
    }
  }
);
```

**Step 2: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add backend/routes/tests.js
git commit -m "feat(api): add bulk add questions to test endpoint"
```

---

## Task 4: Backend - Get All Users Endpoint

**Files:**
- Modify: `backend/routes/questions.js` (add after `/authors` endpoint, around line 95)

**Step 1: Add endpoint to get all users (for change author dropdown)**

Add after the `/authors` endpoint:

```javascript
// GET all users (for change author dropdown)
router.get('/users',
  authenticateToken,
  async (req, res) => {
    try {
      const users = await sql`
        SELECT id, username
        FROM ${sql(dbSchema)}.users
        ORDER BY username
      `;
      res.json({ users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);
```

**Step 2: Run backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add backend/routes/questions.js
git commit -m "feat(api): add users endpoint for author selection"
```

---

## Task 5: Frontend - Convert to Table Layout

**Files:**
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx`

**Step 1: Add new state variables**

After line 27 (after `previewSelections` state), add:

```javascript
const [selectedIds, setSelectedIds] = useState(new Set());
const [sortOrder, setSortOrder] = useState(null); // null | 'asc' | 'desc'
```

**Step 2: Add sort function**

After the `filteredQuestions` filter (around line 125), add sorting:

```javascript
const sortedQuestions = [...filteredQuestions].sort((a, b) => {
  if (!sortOrder) return 0;
  const comparison = (a.title || '').localeCompare(b.title || '');
  return sortOrder === 'asc' ? comparison : -comparison;
});
```

**Step 3: Add selection handlers**

After `handleUploadSuccess` function (around line 103), add:

```javascript
const handleSelectAll = () => {
  if (selectedIds.size === sortedQuestions.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(sortedQuestions.map(q => q.id)));
  }
};

const handleSelectOne = (id) => {
  const newSelected = new Set(selectedIds);
  if (newSelected.has(id)) {
    newSelected.delete(id);
  } else {
    newSelected.add(id);
  }
  setSelectedIds(newSelected);
};

const handleSortToggle = () => {
  setSortOrder(current => {
    if (current === null) return 'asc';
    if (current === 'asc') return 'desc';
    return null;
  });
};
```

**Step 4: Replace the Questions List section (lines 212-281)**

Replace the entire `{/* Questions List */}` section with:

```jsx
{/* Questions Table */}
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  {sortedQuestions.length === 0 ? (
    <p className="text-center text-gray-500 py-8">
      No questions found. Create your first question to get started!
    </p>
  ) : (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="w-10 px-4 py-3">
            <input
              type="checkbox"
              checked={selectedIds.size === sortedQuestions.length && sortedQuestions.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
          </th>
          <th
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={handleSortToggle}
          >
            Title {sortOrder === 'asc' ? '▲' : sortOrder === 'desc' ? '▼' : ''}
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Type
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Visibility
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Author
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Tags
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {sortedQuestions.map(question => (
          <tr key={question.id} className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={selectedIds.has(question.id)}
                onChange={() => handleSelectOne(question.id)}
                className="rounded border-gray-300"
              />
            </td>
            <td className="px-4 py-3">
              <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={question.title}>
                {question.title}
              </div>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                question.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {question.type}
              </span>
            </td>
            <td className="px-4 py-3">
              {getVisibilityBadge(question.visibility)}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {question.author_username || '-'}
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-600 truncate max-w-[150px]" title={question.tags?.join(', ')}>
                {question.tags?.join(', ') || '-'}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingQuestion(question);
                    setPreviewData(question);
                    setPreviewSelections([]);
                    setActiveTab('edit');
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setDeleteConfirm(question)}
                >
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>
```

**Step 5: Update the filter bar count**

In the filter bar section (around line 207), update to show selected count:

```jsx
<div className="mt-2 text-sm text-gray-600">
  Showing {sortedQuestions.length} of {questions.length} questions
  {selectedIds.size > 0 && (
    <span className="ml-2 font-medium text-tech">
      ({selectedIds.size} selected)
    </span>
  )}
</div>
```

**Step 6: Test the table renders**

Run: `cd frontend && npm run dev`
Navigate to Admin > Questions tab
Expected: Questions display in table format with checkboxes and sortable title column

**Step 7: Commit**

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat(ui): convert questions list to sortable table with selection"
```

---

## Task 6: Frontend - Add Bulk Actions Dropdown

**Files:**
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx`

**Step 1: Add bulk action state**

After `sortOrder` state, add:

```javascript
const [bulkAction, setBulkAction] = useState(null); // null | 'delete' | 'changeAuthor' | 'addToTest'
const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
const [tests, setTests] = useState([]);
const [users, setUsers] = useState([]);
```

**Step 2: Add fetch functions for tests and users**

After `fetchAuthors` function, add:

```javascript
const fetchTests = async () => {
  try {
    const data = await apiRequest('/api/tests');
    setTests(data.tests || []);
  } catch (error) {
    console.error('Failed to load tests:', error);
  }
};

const fetchUsers = async () => {
  try {
    const data = await apiRequest('/api/questions/users');
    setUsers(data.users || []);
  } catch (error) {
    console.error('Failed to load users:', error);
  }
};
```

**Step 3: Add to useEffect**

Update the useEffect to also fetch tests and users:

```javascript
useEffect(() => {
  fetchQuestions();
  fetchAuthors();
  fetchTests();
  fetchUsers();
}, []);
```

**Step 4: Add Bulk Actions dropdown to header**

In the header section (around line 138), add the Bulk Actions dropdown before Import button:

```jsx
<div className="flex gap-3">
  {/* Bulk Actions Dropdown */}
  <div className="relative">
    <Button
      variant="secondary"
      disabled={selectedIds.size === 0}
      onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
    >
      Bulk Actions ▼
    </Button>
    {bulkDropdownOpen && selectedIds.size > 0 && (
      <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => { setBulkAction('delete'); setBulkDropdownOpen(false); }}
        >
          Delete selected
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => { setBulkAction('changeAuthor'); setBulkDropdownOpen(false); }}
        >
          Change author
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => { setBulkAction('addToTest'); setBulkDropdownOpen(false); }}
        >
          Add to test
        </button>
      </div>
    )}
  </div>
  <Button
    variant="secondary"
    onClick={() => setIsImportOpen(true)}
  >
    Import Questions
  </Button>
  <Button onClick={() => setIsFormOpen(true)}>
    Create Question
  </Button>
</div>
```

**Step 5: Test dropdown appears**

Run: `cd frontend && npm run dev`
Select some questions, click "Bulk Actions"
Expected: Dropdown shows three options

**Step 6: Commit**

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat(ui): add bulk actions dropdown to questions table"
```

---

## Task 7: Frontend - Bulk Delete Modal

**Files:**
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx`

**Step 1: Add state for force delete checkbox**

After `bulkDropdownOpen` state, add:

```javascript
const [forceRemoveFromTests, setForceRemoveFromTests] = useState(false);
```

**Step 2: Add bulk delete handler**

After `handleSelectOne` function, add:

```javascript
const handleBulkDelete = async () => {
  try {
    const data = await apiRequest('/api/questions/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({
        question_ids: Array.from(selectedIds),
        force_remove_from_tests: forceRemoveFromTests
      })
    });

    if (data.skipped > 0) {
      showSuccess(`Deleted ${data.deleted} questions, ${data.skipped} skipped (in tests)`);
    } else {
      showSuccess(`Deleted ${data.deleted} questions`);
    }

    setSelectedIds(new Set());
    setBulkAction(null);
    setForceRemoveFromTests(false);
    fetchQuestions();
  } catch (error) {
    showError(error.message || 'Failed to delete questions');
  }
};
```

**Step 3: Add Bulk Delete Modal**

After the Import Questions Modal (around line 493), add:

```jsx
{/* Bulk Delete Modal */}
{bulkAction === 'delete' && (
  <Modal
    isOpen={true}
    onClose={() => { setBulkAction(null); setForceRemoveFromTests(false); }}
    title={`Delete ${selectedIds.size} Questions`}
    size="sm"
  >
    <div className="space-y-4">
      <p className="text-gray-700">
        This will permanently delete {selectedIds.size} question{selectedIds.size > 1 ? 's' : ''}.
      </p>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="forceRemove"
          checked={forceRemoveFromTests}
          onChange={(e) => setForceRemoveFromTests(e.target.checked)}
          className="mt-1 rounded border-gray-300"
        />
        <label htmlFor="forceRemove" className="text-sm text-gray-600">
          Remove from tests first (questions in tests will be skipped otherwise)
        </label>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          variant="secondary"
          onClick={() => { setBulkAction(null); setForceRemoveFromTests(false); }}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleBulkDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  </Modal>
)}
```

**Step 4: Test bulk delete**

Run: `cd frontend && npm run dev`
Select questions, Bulk Actions > Delete selected
Expected: Modal appears, delete works

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat(ui): add bulk delete modal for questions"
```

---

## Task 8: Frontend - Change Author Modal

**Files:**
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx`

**Step 1: Add state for selected author**

After `forceRemoveFromTests` state, add:

```javascript
const [selectedAuthorId, setSelectedAuthorId] = useState('');
```

**Step 2: Add bulk change author handler**

After `handleBulkDelete` function, add:

```javascript
const handleBulkChangeAuthor = async () => {
  if (!selectedAuthorId) {
    showError('Please select an author');
    return;
  }

  try {
    const data = await apiRequest('/api/questions/bulk-change-author', {
      method: 'POST',
      body: JSON.stringify({
        question_ids: Array.from(selectedIds),
        author_id: selectedAuthorId
      })
    });

    showSuccess(`Updated author for ${data.updated} questions`);
    setSelectedIds(new Set());
    setBulkAction(null);
    setSelectedAuthorId('');
    fetchQuestions();
    fetchAuthors();
  } catch (error) {
    showError(error.message || 'Failed to change author');
  }
};
```

**Step 3: Add Change Author Modal**

After the Bulk Delete Modal, add:

```jsx
{/* Bulk Change Author Modal */}
{bulkAction === 'changeAuthor' && (
  <Modal
    isOpen={true}
    onClose={() => { setBulkAction(null); setSelectedAuthorId(''); }}
    title={`Change Author for ${selectedIds.size} Questions`}
    size="sm"
  >
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          New Author
        </label>
        <select
          value={selectedAuthorId}
          onChange={(e) => setSelectedAuthorId(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">Select author...</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.username}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          variant="secondary"
          onClick={() => { setBulkAction(null); setSelectedAuthorId(''); }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleBulkChangeAuthor}
          disabled={!selectedAuthorId}
        >
          Change Author
        </Button>
      </div>
    </div>
  </Modal>
)}
```

**Step 4: Test change author**

Run: `cd frontend && npm run dev`
Select questions, Bulk Actions > Change author
Expected: Modal with dropdown, changes author

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat(ui): add bulk change author modal for questions"
```

---

## Task 9: Frontend - Add to Test Modal

**Files:**
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx`

**Step 1: Add state for selected test**

After `selectedAuthorId` state, add:

```javascript
const [selectedTestId, setSelectedTestId] = useState('');
```

**Step 2: Add bulk add to test handler**

After `handleBulkChangeAuthor` function, add:

```javascript
const handleBulkAddToTest = async () => {
  if (!selectedTestId) {
    showError('Please select a test');
    return;
  }

  try {
    const data = await apiRequest(`/api/tests/${selectedTestId}/questions/bulk-add`, {
      method: 'POST',
      body: JSON.stringify({
        question_ids: Array.from(selectedIds)
      })
    });

    const testName = tests.find(t => t.id === selectedTestId)?.title || 'test';
    if (data.skipped > 0) {
      showSuccess(`Added ${data.added} questions to "${testName}", ${data.skipped} already in test`);
    } else {
      showSuccess(`Added ${data.added} questions to "${testName}"`);
    }

    setSelectedIds(new Set());
    setBulkAction(null);
    setSelectedTestId('');
  } catch (error) {
    showError(error.message || 'Failed to add questions to test');
  }
};
```

**Step 3: Add to Test Modal**

After the Change Author Modal, add:

```jsx
{/* Bulk Add to Test Modal */}
{bulkAction === 'addToTest' && (
  <Modal
    isOpen={true}
    onClose={() => { setBulkAction(null); setSelectedTestId(''); }}
    title={`Add ${selectedIds.size} Questions to Test`}
    size="sm"
  >
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Test
        </label>
        <select
          value={selectedTestId}
          onChange={(e) => setSelectedTestId(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">Select test...</option>
          {tests.map(test => (
            <option key={test.id} value={test.id}>{test.title}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500">
        Questions already in the test will be skipped.
      </p>

      <div className="flex gap-3 justify-end">
        <Button
          variant="secondary"
          onClick={() => { setBulkAction(null); setSelectedTestId(''); }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleBulkAddToTest}
          disabled={!selectedTestId}
        >
          Add to Test
        </Button>
      </div>
    </div>
  </Modal>
)}
```

**Step 4: Test add to test**

Run: `cd frontend && npm run dev`
Select questions, Bulk Actions > Add to test
Expected: Modal with dropdown, adds questions

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat(ui): add bulk add to test modal for questions"
```

---

## Task 10: Final Testing and Cleanup

**Step 1: Run all backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 2: Run all frontend tests**

Run: `cd frontend && npm test`
Expected: All tests pass

**Step 3: Manual testing checklist**

- [ ] Table displays with all columns
- [ ] Click Title header cycles sort (none → asc → desc → none)
- [ ] Individual checkbox selects/deselects row
- [ ] Header checkbox selects/deselects all visible
- [ ] Filter changes preserve selection
- [ ] "X selected" shows in filter bar
- [ ] Bulk Actions disabled when nothing selected
- [ ] Bulk Actions dropdown shows 3 options
- [ ] Bulk Delete modal works (with and without force checkbox)
- [ ] Bulk Change Author modal works
- [ ] Bulk Add to Test modal works
- [ ] Toasts show correct counts
- [ ] Selection clears after bulk operation

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: questions table with bulk operations - complete"
```

---

## Summary

This plan implements:
1. **Backend:** 3 new bulk endpoints + 1 users endpoint
2. **Frontend:** Table layout with selection, sorting, and 3 bulk action modals

Total commits: 10 incremental commits

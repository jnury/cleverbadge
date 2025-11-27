# Questions Table with Bulk Operations

## Overview

Replace the questions card list with a sortable table and add bulk operations for managing multiple questions at once.

## Table Layout

| Column | Width | Sortable | Content |
|--------|-------|----------|---------|
| Checkbox | 40px | No | Row selection checkbox |
| Title | flex | Yes | Question title, truncated with ellipsis |
| Type | 100px | No | Badge: "SINGLE" or "MULTIPLE" |
| Visibility | 100px | No | Badge: Public/Private/Protected |
| Author | 120px | No | Username text |
| Tags | 150px | No | Comma-separated tags, truncated |
| Actions | 100px | No | Edit / Delete buttons |

**Header row:**
- Checkbox for select all visible questions
- Title column clickable for sort (cycles: none → asc → desc → none)
- Shows "X selected" when questions are selected

## Bulk Actions UI

**Location:** "Bulk Actions" dropdown in header, next to Create/Import buttons.

**Behavior:**
- Disabled when no questions selected
- Dropdown options: Delete selected, Change author, Add to test
- Selection count shown in filter bar: "X selected"

## Bulk Operation Modals

### Delete Selected
- Title: "Delete X Questions"
- Warning about permanent deletion
- If questions in tests: checkbox "Remove from tests first" (unchecked by default)
- Without checkbox: skips questions in tests
- Toast: "Deleted X questions" or "Deleted X, Y skipped (in tests)"

### Change Author
- Title: "Change Author for X Questions"
- Dropdown to select new author (from existing users)
- Toast: "Updated author for X questions"

### Add to Test
- Title: "Add X Questions to Test"
- Dropdown to select test (non-archived tests)
- Info: "Questions already in test will be skipped"
- Toast: "Added X questions to [Test]" or "Added X, Y already in test"

## Backend API

```
POST /api/questions/bulk-delete
Body: { question_ids: string[], force_remove_from_tests: boolean }
Response: { deleted: number, skipped: number, skipped_ids: string[] }

POST /api/questions/bulk-change-author
Body: { question_ids: string[], author_id: string }
Response: { updated: number }

POST /api/tests/:testId/questions/bulk-add
Body: { question_ids: string[] }
Response: { added: number, skipped: number }
```

## Frontend State

```javascript
const [selectedIds, setSelectedIds] = useState(new Set());
const [sortOrder, setSortOrder] = useState(null); // null | 'asc' | 'desc'
const [bulkAction, setBulkAction] = useState(null); // null | 'delete' | 'changeAuthor' | 'addToTest'
const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
```

**Selection behavior:**
- Individual checkbox toggles ID in Set
- "Select All" adds all visible (filtered) question IDs
- Selection preserved when filters change
- Cleared after bulk operation completes

**Sort behavior:**
- Click Title header cycles: null → 'asc' → 'desc' → null
- Applied to filteredQuestions before rendering

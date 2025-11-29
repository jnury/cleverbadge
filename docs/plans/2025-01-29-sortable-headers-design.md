# Sortable Column Headers Design

## Overview
Standardize sorting UX across all admin tabs using clickable column headers instead of dropdown selectors.

## Interaction Pattern
- Click header → sort ascending (▲)
- Click again → sort descending (▼)
- Click again → clear sort (no indicator)
- URL param: `?sort=column-asc` or `?sort=column-desc`

## Sortable Columns Per Tab

| Tab | Sortable Columns |
|-----|------------------|
| Questions | Title, Author, Success Rate |
| Tests | Title, Questions count, Threshold |
| Assessments | Candidate, Score, Started, Duration |
| Analytics | Question, Success Rate, Attempts |

## Implementation

### SortableHeader Component
Reusable `<th>` component with:
- Click handler cycling through asc → desc → null
- Visual indicator (▲/▼)
- Cursor pointer + hover state

### Changes Per Tab
- **QuestionsTab**: Extend existing Title sort to Author, Success Rate
- **TestsTab**: Add sorting (currently has none)
- **AssessmentsTab**: Replace "Sort by" dropdown with column headers
- **AnalyticsTab**: Replace hardcoded difficulty sort with column headers

### Defaults
- Assessments: `started-desc` (newest first)
- Analytics: `success-asc` (hardest first)
- Others: no default sort

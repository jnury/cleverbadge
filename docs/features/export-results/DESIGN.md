# Export Results - Design

> **Status:** Draft
> **Created:** 2025-01-29
> **Author:** Claude + Human collaboration

## Overview

Enable admins and authors to export assessment data in multiple formats for reporting, analysis, and record-keeping.

### Key Decisions

- **Formats:** CSV, XLSX, PDF
- **Data scopes:** Assessment list, detailed results, aggregated stats
- **PDF reports:** Individual candidate report, test summary report
- **UI locations:** Contextual - Assessments tab, Analytics tab, Test modal
- **Filter handling:** Export modal with choice between current filter or all data

---

## Export Formats

### CSV Export

- Universal format, opens in any spreadsheet application
- UTF-8 encoding with BOM for Excel compatibility
- Comma-separated, quoted strings for fields containing commas

### XLSX Export

- Native Excel format
- Formatted headers (bold, colored)
- Auto-sized columns
- Multiple sheets for complex exports (e.g., summary + details)

### PDF Export

- Professional layout with branding
- Charts rendered as images
- Page numbers, headers, footers
- Print-optimized

---

## Data Scopes

### 1. Assessment List

Basic overview of all assessments.

**Fields:**
| Column | Description |
|--------|-------------|
| Candidate Name | Name entered by candidate |
| Email | If logged-in user |
| Test Title | Name of the test |
| Score | Percentage score |
| Status | Started / Completed |
| Started At | Timestamp |
| Completed At | Timestamp |
| Duration | Time taken (if timed) |

**Formats:** CSV, XLSX

### 2. Detailed Results

Per-question breakdown for deep analysis.

**Structure (XLSX with multiple sheets):**

Sheet 1 - Summary:
- Same as Assessment List

Sheet 2 - Question Details:
| Column | Description |
|--------|-------------|
| Candidate Name | Name |
| Question # | Order in test |
| Question Title | Question identifier |
| Question Text | Full question (truncated) |
| Answer Given | Selected option(s) |
| Correct Answer | Expected answer |
| Is Correct | Yes / No |
| Time Spent | Seconds (if tracked) |
| Weight | Question weight |

**Formats:** CSV (flattened), XLSX (multi-sheet)

### 3. Aggregated Stats

Summary statistics only.

**Fields:**
| Metric | Description |
|--------|-------------|
| Test Title | Name |
| Total Assessments | Count started |
| Completed | Count completed |
| Completion Rate | Percentage |
| Average Score | Mean score |
| Median Score | Median score |
| Highest Score | Maximum |
| Lowest Score | Minimum |
| Std Deviation | Score spread |
| Per-Question Success Rate | Table of question → success % |

**Formats:** CSV, XLSX, PDF (as test summary report)

---

## PDF Reports

### Individual Candidate Report

One PDF per candidate, suitable for sharing.

**Content:**
```
┌─────────────────────────────────────────┐
│  [Logo]  ASSESSMENT REPORT              │
├─────────────────────────────────────────┤
│  Candidate: John Doe                    │
│  Test: JavaScript Fundamentals          │
│  Date: January 29, 2025                 │
│  Score: 85%                             │
│  Status: PASSED                         │
├─────────────────────────────────────────┤
│  QUESTION BREAKDOWN                     │
│                                         │
│  Q1. What is a closure? ............. ✓ │
│  Q2. Explain hoisting ............... ✓ │
│  Q3. What is 'this'? ................ ✗ │
│  Q4. Array methods .................. ✓ │
│  ...                                    │
├─────────────────────────────────────────┤
│  Summary: 17/20 correct                 │
│  Time taken: 45 minutes                 │
└─────────────────────────────────────────┘
```

**Options:**
- Include/exclude correct answers (privacy setting)
- Include/exclude explanations
- Add custom message/notes

### Test Summary Report

One PDF per test, for stakeholders.

**Content:**
```
┌─────────────────────────────────────────┐
│  [Logo]  TEST SUMMARY REPORT            │
├─────────────────────────────────────────┤
│  Test: JavaScript Fundamentals          │
│  Period: Jan 1 - Jan 29, 2025           │
│  Generated: January 29, 2025            │
├─────────────────────────────────────────┤
│  OVERVIEW                               │
│                                         │
│  Total Candidates: 150                  │
│  Completed: 142 (95%)                   │
│  Average Score: 72%                     │
│  Pass Rate (≥70%): 68%                  │
├─────────────────────────────────────────┤
│  SCORE DISTRIBUTION                     │
│                                         │
│  [Histogram Chart]                      │
│                                         │
├─────────────────────────────────────────┤
│  QUESTION ANALYSIS                      │
│                                         │
│  Easiest: Q4 - Array methods (95%)      │
│  Hardest: Q7 - Promises (34%)           │
│                                         │
│  [Question success rate table]          │
├─────────────────────────────────────────┤
│  TOP PERFORMERS                         │
│                                         │
│  1. Jane Smith - 98%                    │
│  2. Bob Johnson - 95%                   │
│  3. Alice Brown - 94%                   │
└─────────────────────────────────────────┘
```

---

## API Endpoints

### Export Assessments

```javascript
// GET /api/tests/:testId/export/assessments
// Query params:
// - format: 'csv' | 'xlsx'
// - scope: 'list' | 'detailed'
// - status: 'all' | 'completed' | 'started'
// - from: ISO date (optional)
// - to: ISO date (optional)

// Response: File download with appropriate Content-Type
```

### Export Stats

```javascript
// GET /api/tests/:testId/export/stats
// Query params:
// - format: 'csv' | 'xlsx'
// - from: ISO date (optional)
// - to: ISO date (optional)

// Response: File download
```

### Generate PDF - Candidate Report

```javascript
// GET /api/assessments/:assessmentId/report/pdf
// Query params:
// - include_answers: boolean (show correct answers)
// - include_explanations: boolean

// Response: PDF file download
```

### Generate PDF - Test Summary

```javascript
// GET /api/tests/:testId/report/pdf
// Query params:
// - from: ISO date (optional)
// - to: ISO date (optional)
// - include_names: boolean (privacy option)

// Response: PDF file download
```

### Bulk Export

```javascript
// POST /api/tests/:testId/export/bulk-candidates
// Body:
{
  "assessment_ids": ["uuid1", "uuid2", ...],
  "format": "pdf"
}

// Response: ZIP file containing individual PDFs
```

---

## Frontend Implementation

### Assessments Tab Export

Location: Above/beside the assessments table

```
┌─────────────────────────────────────────────────┐
│ Assessments                                     │
│                                                 │
│ [Status: All ▼] [Test: JavaScript ▼] [Export ▼]│
│                                                 │
│ Export dropdown:                                │
│ ┌─────────────────────────┐                     │
│ │ Export Current Filter   │                     │
│ │ Export All              │                     │
│ │ ─────────────────────── │                     │
│ │ Download as CSV         │                     │
│ │ Download as XLSX        │                     │
│ └─────────────────────────┘                     │
└─────────────────────────────────────────────────┘
```

Clicking opens Export Modal.

### Export Modal

```
┌─────────────────────────────────────────────────┐
│  Export Assessments                        [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Data Selection                                 │
│  ○ Current filter (25 assessments)              │
│  ● All assessments (142 assessments)            │
│                                                 │
│  Data Scope                                     │
│  ○ Assessment list (basic info)                 │
│  ● Detailed results (per-question)              │
│  ○ Aggregated stats only                        │
│                                                 │
│  Format                                         │
│  ○ CSV                                          │
│  ● XLSX (Excel)                                 │
│  ○ PDF (Summary report)                         │
│                                                 │
│  Date Range (optional)                          │
│  From: [          ] To: [          ]            │
│                                                 │
├─────────────────────────────────────────────────┤
│                      [Cancel]  [Export]         │
└─────────────────────────────────────────────────┘
```

### Individual Candidate Export

In assessment details or table row actions:

```
Actions: [View] [Export PDF ▼]
                ┌──────────────────────┐
                │ Basic Report         │
                │ With Correct Answers │
                │ With Explanations    │
                └──────────────────────┘
```

### Analytics Tab Export

```
┌─────────────────────────────────────────────────┐
│ Analytics                                       │
│                                                 │
│ Test: [JavaScript Fundamentals ▼]  [Export ▼]   │
│                                                 │
│ Export dropdown:                                │
│ ┌─────────────────────────┐                     │
│ │ Export Stats (CSV)      │                     │
│ │ Export Stats (XLSX)     │                     │
│ │ ─────────────────────── │                     │
│ │ Download Summary (PDF)  │                     │
│ └─────────────────────────┘                     │
└─────────────────────────────────────────────────┘
```

### Test Modal Export

In test edit modal, new "Export" section or tab:

```
Export Options
─────────────────────────────────
[Export Assessments]  → Opens Export Modal
[Download Summary PDF] → Direct download
[Bulk Export Candidate PDFs] → Select candidates
```

---

## Technical Implementation

### Libraries

**Backend:**
- CSV: Built-in or `csv-stringify`
- XLSX: `xlsx` (SheetJS) or `exceljs`
- PDF: `pdfkit` or `puppeteer` (HTML to PDF)

**Considerations:**
- Large exports should be async (queue job, email link)
- Stream large CSV files, don't load all in memory
- Cache generated reports briefly (5 min) to avoid regeneration

### File Naming

```
{test-slug}-assessments-{date}.csv
{test-slug}-detailed-{date}.xlsx
{test-slug}-summary-{date}.pdf
{candidate-name}-{test-slug}-report.pdf
```

---

## Permissions

| Export Type | ADMIN | AUTHOR | USER |
|-------------|:-----:|:------:|:----:|
| Own test assessments | Yes | Yes | No |
| Any test assessments | Yes | No | No |
| Own assessment report | Yes | Yes | Yes |
| Any candidate report | Yes | Own tests | No |

---

## Implementation Phases

### Phase 1 - CSV/XLSX Assessment Export
- [ ] Export endpoint for assessment list
- [ ] CSV generation
- [ ] XLSX generation with formatting
- [ ] Export button in Assessments tab
- [ ] Basic export modal

### Phase 2 - Detailed Export
- [ ] Per-question data in export
- [ ] Multi-sheet XLSX
- [ ] Detailed scope option in modal

### Phase 3 - PDF Reports
- [ ] PDF generation library setup
- [ ] Individual candidate report template
- [ ] Test summary report template
- [ ] Chart rendering in PDF

### Phase 4 - Bulk & Polish
- [ ] Bulk candidate PDF export (ZIP)
- [ ] Export from Test modal
- [ ] Large export handling (async)
- [ ] Export history/recent downloads

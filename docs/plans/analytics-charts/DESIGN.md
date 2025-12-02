# Analytics Charts - Design

> **Status:** Draft
> **Created:** 2025-01-29
> **Author:** Claude + Human collaboration

## Overview

Add visual analytics to the Analytics tab with a score distribution histogram that provides insights into test difficulty and candidate performance.

### Key Decisions

- **Chart type:** Score distribution histogram
- **Bucket logic:** Smart auto-adjust based on data spread
- **Location:** Analytics tab only
- **Time filtering:** Preset ranges (7d/30d/90d/All) + custom date picker

---

## Score Distribution Histogram

### Purpose

Visualize how candidates scored on a test:
- See if test is too easy (scores clustered high) or too hard (clustered low)
- Identify bimodal distributions (two groups: those who "get it" and those who don't)
- Spot outliers
- Track changes over time with date filtering

### Smart Bucket Algorithm

Instead of fixed 0-10%, 10-20%, etc. buckets, auto-adjust based on actual data:

**Algorithm:**
1. Find min and max scores in dataset
2. Add padding (5% on each side, capped at 0-100)
3. Divide range into 8-12 buckets (depending on data spread)
4. Round bucket boundaries to nice numbers (5%, 10%, etc.)

**Examples:**

Scenario 1 - Wide spread (scores: 25% to 95%):
```
Buckets: 20-30, 30-40, 40-50, 50-60, 60-70, 70-80, 80-90, 90-100
```

Scenario 2 - Narrow spread (scores: 65% to 85%):
```
Buckets: 60-65, 65-70, 70-75, 75-80, 80-85, 85-90
```

Scenario 3 - Very narrow (scores: 70% to 75%):
```
Buckets: 70-71, 71-72, 72-73, 73-74, 74-75
```

**Fallback:** If all scores identical, show single bar with count.

---

## Data Model

No new tables required. Chart data computed from existing `assessments` table.

### Query Structure

```sql
SELECT
  score_percentage,
  COUNT(*) as count
FROM assessments
WHERE
  test_id = :testId
  AND status = 'COMPLETED'
  AND completed_at >= :fromDate  -- optional
  AND completed_at <= :toDate    -- optional
GROUP BY score_percentage
ORDER BY score_percentage
```

---

## API Endpoint

### Get Score Distribution

```javascript
// GET /api/tests/:testId/analytics/score-distribution
// Query params:
// - from: ISO date (optional)
// - to: ISO date (optional)
// - preset: '7d' | '30d' | '90d' | 'all' (alternative to from/to)

// Response:
{
  "test_id": "uuid",
  "test_title": "JavaScript Fundamentals",
  "period": {
    "from": "2025-01-01T00:00:00Z",
    "to": "2025-01-29T23:59:59Z",
    "preset": "30d"
  },
  "summary": {
    "total_completed": 142,
    "average_score": 72.5,
    "median_score": 74.0,
    "min_score": 25.0,
    "max_score": 98.0,
    "std_deviation": 15.3
  },
  "distribution": {
    "buckets": [
      { "min": 20, "max": 30, "count": 3, "percentage": 2.1 },
      { "min": 30, "max": 40, "count": 8, "percentage": 5.6 },
      { "min": 40, "max": 50, "count": 12, "percentage": 8.5 },
      { "min": 50, "max": 60, "count": 18, "percentage": 12.7 },
      { "min": 60, "max": 70, "count": 28, "percentage": 19.7 },
      { "min": 70, "max": 80, "count": 35, "percentage": 24.6 },
      { "min": 80, "max": 90, "count": 27, "percentage": 19.0 },
      { "min": 90, "max": 100, "count": 11, "percentage": 7.7 }
    ],
    "bucket_size": 10,
    "auto_adjusted": true
  }
}
```

---

## Frontend Implementation

### Chart Library

Options (choose one):
- **Chart.js** - Simple, lightweight, good for basic charts
- **Recharts** - React-native, composable, good documentation
- **Victory** - React-native, flexible, good animations

Recommendation: **Recharts** - fits React stack, easy histogram support.

### Analytics Tab Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Test: [JavaScript Fundamentals ▼]     [Export ▼]            │
│                                                             │
│ Time Range: [7 days] [30 days] [90 days] [All] [Custom]     │
│             └──────────────────────────────────────────┘    │
│             [Custom: Jan 1, 2025 - Jan 29, 2025] [Apply]    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SCORE DISTRIBUTION                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │     ▄▄                                                 │ │
│  │    ████  ▄▄                                            │ │
│  │   ██████████ ▄▄                                        │ │
│  │  ████████████████ ▄▄                                   │ │
│  │ ██████████████████████ ▄▄                              │ │
│  │████████████████████████████ ▄▄                         │ │
│  │                                                        │ │
│  │ 20  30  40  50  60  70  80  90  100                    │ │
│  │              Score (%)                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  142 candidates • Average: 72.5% • Median: 74%              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SUMMARY STATS                                              │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Completed    │ Average      │ Pass Rate    │            │
│  │    142       │   72.5%      │    68%       │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  QUESTION STATS (existing table)                            │
│  ...                                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Time Range Selector

```jsx
<TimeRangeSelector
  presets={['7d', '30d', '90d', 'all']}
  defaultPreset="30d"
  allowCustom={true}
  onChange={handleTimeRangeChange}
/>
```

**Behavior:**
- Preset buttons are toggles (one active at a time)
- Clicking "Custom" opens date picker
- Custom range replaces presets until a preset is clicked
- URL params sync: `?range=30d` or `?from=2025-01-01&to=2025-01-29`

### Chart Component

```jsx
<ScoreDistributionChart
  data={distribution.buckets}
  summary={summary}
  loading={isLoading}
  empty={total === 0}
/>
```

**Features:**
- Hover tooltip: "70-80%: 35 candidates (24.6%)"
- Click on bar: Could filter assessments list (future enhancement)
- Responsive sizing
- Loading skeleton
- Empty state: "No completed assessments in this period"

### Chart Styling

- Bar color: Brand primary color (`#4DA6C0` tech-blue)
- Hover: Slightly darker shade
- Grid lines: Light gray, subtle
- Axis labels: Clear, readable font size
- Summary stats below chart

---

## Edge Cases

### No Data

```
┌────────────────────────────────────────┐
│                                        │
│        📊 No Data Available            │
│                                        │
│  No completed assessments found        │
│  for the selected time period.         │
│                                        │
│  [Try a different date range]          │
│                                        │
└────────────────────────────────────────┘
```

### Single Score

All candidates scored exactly the same:

```
┌────────────────────────────────────────┐
│                                        │
│              ████████                  │
│                75%                     │
│                                        │
│  All 15 candidates scored 75%          │
│                                        │
└────────────────────────────────────────┘
```

### Very Few Data Points

Less than 5 assessments: Show data but add note "Limited data - results may not be representative"

### Loading State

Skeleton chart with pulsing bars while fetching data.

---

## Performance Considerations

### Caching

- Cache distribution data for 5 minutes
- Invalidate on new assessment completion
- Cache key: `test:{testId}:distribution:{from}:{to}`

### Large Datasets

- Aggregation done in database (not in JS)
- Response is always small (just bucket counts)
- No pagination needed for distribution endpoint

---

## Accessibility

- Chart has `aria-label` describing the data
- Provide text summary below chart
- Color contrast meets WCAG AA
- Keyboard navigable (tab through bars)
- Screen reader: "Score distribution chart. 35 candidates scored between 70 and 80 percent."

---

## Future Enhancements (Not in Scope)

For reference, these could be added later:

1. **Trend over time** - Line chart showing average score by week/month
2. **Comparison view** - Compare two time periods side by side
3. **Question difficulty chart** - Bar chart of success rate per question
4. **Completion funnel** - Started → Completed → Passed visualization
5. **Click-to-filter** - Click bar to filter assessments table to that score range

---

## Implementation Phases

### Phase 1 - Basic Chart
- [ ] Install Recharts
- [ ] Score distribution API endpoint
- [ ] Basic histogram component
- [ ] Integration in Analytics tab

### Phase 2 - Smart Buckets
- [ ] Auto-adjust bucket algorithm
- [ ] Handle edge cases (no data, single score)
- [ ] Summary stats below chart

### Phase 3 - Time Filtering
- [ ] Preset range buttons (7d/30d/90d/All)
- [ ] Custom date picker
- [ ] URL param sync for time range
- [ ] API support for date filtering

### Phase 4 - Polish
- [ ] Loading skeleton
- [ ] Empty states
- [ ] Tooltips and hover effects
- [ ] Accessibility improvements
- [ ] Caching layer

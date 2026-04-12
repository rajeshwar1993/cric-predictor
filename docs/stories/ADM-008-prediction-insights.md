# ADM-008: Prediction Insights

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Prediction volume, timing patterns, accuracy distribution, per-scenario breakdown

---

## Description

Build the prediction insights page at `/admin/predictions` — shows prediction volume metrics, timing patterns (early vs last-minute), accuracy distributions, and per-scenario analysis. Helps identify engagement patterns, scenario difficulty, and user behavior trends. All data is fetched via the service role Supabase client through admin DAL functions.

---

## Acceptance Criteria

### Volume Metrics
- [ ] Cards: total predictions (all time), average per fixture, average scenarios filled per user per fixture (out of 19)
- [ ] Most predicted fixture (by count) and least predicted fixture
- [ ] Predictions today / this week
- [ ] Each card uses the admin metric card pattern from ADM-001 layout

### Timing Patterns
- [ ] Distribution chart: time before deadline when predictions were submitted
- [ ] Buckets: >12h, 6-12h, 2-6h, 1-2h, <1h before deadline
- [ ] Bar chart showing the distribution (CSS bar chart)
- [ ] Average time before deadline displayed as a summary stat

### Accuracy Distribution
- [ ] Global accuracy rate (correct / resolved) as a headline stat
- [ ] Accuracy per scenario slug: table showing which scenarios are hardest/easiest, sorted by accuracy
- [ ] User accuracy histogram: distribution of user accuracy percentages (buckets: 0-10%, 10-20%, ..., 90-100%)
- [ ] Points distribution per match: histogram of points per user per fixture
- [ ] Perfect scores count (all 19 correct in a match)
- [ ] Zero-point matches count (0 correct)

### Scenario-Level Breakdown
- [ ] Table per scenario slug:
  - Participation rate (predictions for this slug / total prediction-eligible users)
  - Accuracy rate
  - Most popular answer choice (value distribution)
  - Correct answer distribution across matches
- [ ] Table sortable by participation rate or accuracy rate
- [ ] Scenario slugs displayed with human-readable labels

### DAL Functions (`src/lib/dal/admin/predictions.ts`)
- [ ] `getPredictionVolume()` — total, per-fixture average, scenarios-per-user average, most/least predicted fixture, today/this week counts
- [ ] `getPredictionTiming()` — time-before-deadline distribution across buckets
- [ ] `getAccuracyDistribution()` — global accuracy, per-slug accuracy, user accuracy histogram, perfect/zero scores
- [ ] `getScenarioBreakdown()` — per-slug participation, accuracy, popular answers, correct answer distribution
- [ ] `getPointsDistribution()` — points-per-user-per-fixture histogram

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── predictions/
│               └── page.tsx
├── components/
│   └── admin/
│       └── predictions/
│           ├── prediction-volume.tsx
│           ├── prediction-volume.stories.tsx
│           ├── prediction-timing-chart.tsx
│           ├── prediction-timing-chart.stories.tsx
│           ├── accuracy-distribution.tsx
│           ├── accuracy-distribution.stories.tsx
│           ├── scenario-breakdown-table.tsx
│           ├── scenario-breakdown-table.stories.tsx
│           ├── points-distribution-chart.tsx
│           └── points-distribution-chart.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── predictions.ts
```

---

## Technical Notes

### Timing Calculation
Timing requires computing the difference between `submitted_at` on each prediction and the prediction deadline for that fixture+gang. The deadline is derived from:
- Fixture start time (`v2_fixtures.starts_at`)
- Gang's custom deadline offset (`v2_gang_league_seasons.prediction_deadline_mins`, default 45)
- Deadline = `starts_at - prediction_deadline_mins minutes`

```typescript
export async function getPredictionTiming() {
  const supabase = createAdminClient()

  // Join predictions → fixture_scenarios → fixtures, and predictions → gang context
  // to compute: submitted_at vs (starts_at - prediction_deadline_mins)
  // Then bucket the difference into >12h, 6-12h, 2-6h, 1-2h, <1h
  //
  // This is a heavy query — consider using a Postgres function or
  // fetching raw data and computing buckets in application code.

  const { data, error } = await supabase
    .from('v2_predictions')
    .select(`
      submitted_at,
      gang_id,
      v2_fixture_scenarios!inner (
        fixture_id,
        v2_fixtures!inner (starts_at)
      )
    `)

  if (error) throw error

  // For each prediction, look up gang's prediction_deadline_mins
  // Compute time_before_deadline = deadline - submitted_at
  // Bucket and count
  return computeTimingBuckets(data)
}
```

### Accuracy Per Slug
```typescript
export async function getAccuracyDistribution() {
  const supabase = createAdminClient()

  // Per-slug accuracy
  const { data: slugAccuracy } = await supabase
    .from('v2_predictions')
    .select(`
      is_correct,
      v2_fixture_scenarios!inner (slug)
    `)
    .not('is_correct', 'is', null)

  // Group by slug: SUM(is_correct::int) / COUNT(*) for each slug
  // Sort by accuracy ascending (hardest first) or descending (easiest first)

  // Global accuracy
  const totalCorrect = slugAccuracy?.filter(p => p.is_correct).length ?? 0
  const totalResolved = slugAccuracy?.length ?? 0
  const globalAccuracy = totalResolved > 0 ? totalCorrect / totalResolved : 0

  return { globalAccuracy, perSlugAccuracy: computePerSlugAccuracy(slugAccuracy) }
}
```

### Perfect Scores
```typescript
// Perfect score: user + fixture combo where all 19 predictions are correct
// Query v2_gang_fixture_standings WHERE correct_count = 19
// (assuming 19 scenarios per fixture)
const { count: perfectScores } = await supabase
  .from('v2_gang_fixture_standings')
  .select('*', { count: 'exact', head: true })
  .eq('correct_count', 19)
```

### Points Distribution
```typescript
export async function getPointsDistribution() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('v2_gang_fixture_standings')
    .select('points_earned')

  // Bucket points into ranges (e.g., 0-10, 11-20, 21-30, ..., 181-190)
  // Return histogram data for chart rendering
  return computePointsBuckets(data)
}
```

### Key Design Decisions
- Charts: CSS bar charts — no external chart library. Admin dashboard prioritizes simplicity and fast load times over animation.
- Timing query is expensive (joins predictions with fixtures and gang settings). Consider adding a date range filter to limit data scanned.
- Date range filters: implement as optional query parameters. Default to "current season" or "last 30 days". Options: last 7 days, last 30 days, current season, all time.
- Scenario breakdown table: use shadcn Table component with sortable column headers (client-side sorting after data fetch).
- The page is a server component. Heavy data sections can use Suspense boundaries for independent loading.
- Perfect/zero scores are derived from `v2_gang_fixture_standings` which is a materialized view — fast to query.

---

## Edge Cases

- Fixtures with no predictions — excluded from "average per fixture" calculation
- Scenarios that have never been predicted — show 0% participation in breakdown table
- Users who predicted but whose predictions are all voided — excluded from accuracy calculations
- Timing for predictions submitted after the deadline (edge case where deadline enforcement failed) — show as separate "after deadline" bucket
- Empty state: no predictions exist yet — show placeholder with "No prediction data yet"

---

## Storybook Requirements

### PredictionVolume Stories
- `Default` — typical volume across a season
- `HighVolume` — high engagement numbers
- `Empty` — no predictions yet, empty state

### PredictionTimingChart Stories
- `Default` — mixed distribution across all buckets
- `MostlyLastMinute` — majority in the <1h bucket

### AccuracyDistribution Stories
- `Normal` — bell curve around 40-60% accuracy
- `HighAccuracy` — skewed toward high accuracy
- `LowAccuracy` — skewed toward low accuracy

### ScenarioBreakdownTable Stories
- `Default` — all scenarios with mixed participation and accuracy
- `SortedByAccuracy` — sorted with hardest scenarios first

### PointsDistributionChart Stories
- `Default` — normal distribution of points per match

---

## Testing Requirements

- [ ] Unit test: `getPredictionVolume()` returns correct total count, per-fixture average, and today/week counts
- [ ] Unit test: `getPredictionVolume()` correctly identifies most and least predicted fixtures
- [ ] Unit test: `getPredictionTiming()` correctly buckets timing differences into the 5 defined ranges
- [ ] Unit test: `getPredictionTiming()` handles predictions submitted after deadline (edge bucket)
- [ ] Unit test: `getAccuracyDistribution()` computes global accuracy as correct/resolved
- [ ] Unit test: `getAccuracyDistribution()` returns per-slug accuracy sorted correctly
- [ ] Unit test: `getAccuracyDistribution()` counts perfect scores (19/19) and zero-point matches (0/19)
- [ ] Unit test: `getScenarioBreakdown()` computes participation rate per slug
- [ ] Unit test: `getScenarioBreakdown()` identifies most popular answer choice per slug
- [ ] Unit test: `getPointsDistribution()` correctly buckets points into histogram ranges
- [ ] Unit test: all functions handle empty data gracefully (no predictions exist)

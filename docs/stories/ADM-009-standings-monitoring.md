# ADM-009: Leaderboard & Standings Monitoring

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Season standings health checks, fixture standings health checks, consistency validation

---

## Description

Build the standings monitoring page at `/admin/standings` — validates the integrity of materialized standings views by comparing them against actual prediction data. Detects mismatches that indicate trigger failures or calculation bugs. This is a diagnostic tool, not an auto-fix tool — it surfaces problems for manual investigation. All checks are triggered on-demand (not on page load) since the validation queries are expensive.

---

## Acceptance Criteria

### Season Standings Health
- [ ] Check: missing standings (users with predictions but no season standings row)
- [ ] Check: orphaned standings (standings for deleted gangs or deleted users)
- [ ] Check: NULL ranks (standings rows with NULL rank but user has predictions)
- [ ] Check: `accuracy_pct` sanity (values outside 0-100% range)
- [ ] Check: points consistency (season standings `total_points` vs SUM of fixture standings `points_earned`)
- [ ] Summary: total checks run, pass count, fail count
- [ ] Failed checks show affected records (gang, user, expected vs actual values)

### Fixture Standings Health
- [ ] Check: `predicted_count` mismatch (standings value vs actual COUNT of predictions)
- [ ] Check: `correct_count` mismatch (standings vs actual correct predictions count)
- [ ] Check: `resolved_count` mismatch (standings vs actual resolved non-voided prediction count)
- [ ] Check: `points_earned` mismatch (standings vs actual SUM of `points_earned` from predictions)
- [ ] Run checks per fixture or across all fixtures in active season
- [ ] Failed checks show: fixture, gang, user, field, expected, actual

### Validation Controls
- [ ] "Run All Checks" button that triggers all validation queries
- [ ] Per-section run buttons (run season checks only, run fixture checks only)
- [ ] Loading state while checks are running (some queries are expensive)
- [ ] Last run timestamp displayed after checks complete
- [ ] Export results (copy to clipboard as JSON)
- [ ] Fixture selector: dropdown to run fixture checks for a specific fixture or all fixtures in active season

### DAL / Server Actions (`src/lib/dal/admin/standings.ts`)
- [ ] `runSeasonStandingsChecks()` — runs all season-level validation checks
- [ ] `runFixtureStandingsChecks(fixtureId?: string)` — runs fixture-level checks for one or all fixtures
- [ ] `getAllStandingsHealth()` — runs all checks and returns combined results

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── standings/
│               └── page.tsx
├── components/
│   └── admin/
│       └── standings/
│           ├── standings-health-check.tsx
│           ├── standings-health-check.stories.tsx
│           ├── season-standings-checks.tsx
│           ├── season-standings-checks.stories.tsx
│           ├── fixture-standings-checks.tsx
│           ├── fixture-standings-checks.stories.tsx
│           ├── check-result-table.tsx
│           └── check-result-table.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── standings.ts
```

---

## Technical Notes

### Interactive Run Pattern
This page uses a different pattern from most admin pages. Because the validation queries are expensive, the page does NOT fetch data on load. Instead:

1. Page renders with "Run Checks" buttons and empty result areas
2. User clicks a button, which calls a server action
3. Results stream back and populate the result tables
4. Last-run timestamp is saved in client state

```tsx
// page.tsx — thin server component shell
export default function StandingsMonitoringPage() {
  return (
    <div>
      <h1>Standings Monitoring</h1>
      <p>Validate the integrity of materialized standings against actual prediction data.</p>
      <StandingsHealthCheck />
    </div>
  )
}

// StandingsHealthCheck — client component managing run/loading/results state
'use client'
// Uses server actions to trigger checks
// Manages: isRunning, lastRunAt, seasonResults, fixtureResults
```

### Season Standings Checks
```typescript
export async function runSeasonStandingsChecks() {
  const supabase = createAdminClient()
  const results: CheckResult[] = []

  // 1. Missing standings: users with predictions in active season but no season standings row
  const { data: missingStandings } = await supabase.rpc('admin_check_missing_season_standings')
  // Or manual query:
  // SELECT DISTINCT p.user_id, p.gang_id FROM v2_predictions p
  // JOIN v2_fixture_scenarios fs ON p.scenario_id = fs.id
  // JOIN v2_fixtures f ON fs.fixture_id = f.id
  // WHERE f.season_id = <active_season_id>
  // AND NOT EXISTS (SELECT 1 FROM v2_gang_season_standings ss
  //   WHERE ss.user_id = p.user_id AND ss.gang_id = p.gang_id AND ss.season_id = f.season_id)

  // 2. Orphaned standings: standings for deleted gangs or departed users
  const { data: orphanedStandings } = await supabase
    .from('v2_gang_season_standings')
    .select('*, v2_gangs!inner(is_deleted), v2_profiles!inner(is_deleted)')
    .or('v2_gangs.is_deleted.eq.true,v2_profiles.is_deleted.eq.true')

  // 3. NULL ranks with predictions
  const { data: nullRanks } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id, user_id, total_points, matches_predicted')
    .is('rank', null)
    .gt('matches_predicted', 0)

  // 4. accuracy_pct sanity
  const { data: badAccuracy } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id, user_id, accuracy_pct')
    .or('accuracy_pct.lt.0,accuracy_pct.gt.100')

  // 5. Points consistency: compare total_points vs SUM(fixture standings points_earned)
  // This requires aggregating v2_gang_fixture_standings per (gang, user, season)
  // and comparing against v2_gang_season_standings.total_points

  return results
}
```

### Fixture Standings Checks
```typescript
export async function runFixtureStandingsChecks(fixtureId?: string) {
  const supabase = createAdminClient()
  const results: CheckResult[] = []

  // For each (gang, fixture, user) in v2_gang_fixture_standings:
  // Compare against actual predictions:
  //
  // predicted_count: COUNT(*) FROM v2_predictions WHERE gang_id AND user_id
  //   AND scenario_id IN (SELECT id FROM v2_fixture_scenarios WHERE fixture_id)
  //
  // correct_count: COUNT(*) WHERE is_correct = true
  //
  // resolved_count: COUNT(*) WHERE is_correct IS NOT NULL (resolved, non-voided)
  //
  // points_earned: SUM(points_earned) FROM v2_predictions WHERE ...
  //
  // If fixtureId is provided, scope to that fixture.
  // Otherwise, scope to all fixtures in the active season.

  // Build the query dynamically based on fixtureId parameter
  let standingsQuery = supabase
    .from('v2_gang_fixture_standings')
    .select('gang_id, fixture_id, user_id, predicted_count, correct_count, resolved_count, points_earned')

  if (fixtureId) {
    standingsQuery = standingsQuery.eq('fixture_id', fixtureId)
  }

  const { data: standings } = await standingsQuery

  // For each standings row, query actual prediction aggregates and compare
  // Flag any mismatches with: fixture, gang, user, field, expected, actual

  return results
}
```

### Check Result Types
```typescript
interface CheckResult {
  check: string           // e.g., "missing_season_standings", "predicted_count_mismatch"
  status: 'pass' | 'fail'
  category: 'season' | 'fixture'
  details?: CheckFailure[]
}

interface CheckFailure {
  gangId: string
  gangName?: string
  userId: string
  displayName?: string
  fixtureId?: string      // only for fixture-level checks
  field: string           // e.g., "predicted_count", "total_points"
  expected: number | string
  actual: number | string
}
```

### Export to Clipboard
```typescript
function handleExport(results: CheckResult[]) {
  const json = JSON.stringify(results, null, 2)
  navigator.clipboard.writeText(json)
  // Show toast: "Results copied to clipboard"
}
```

### Key Design Decisions
- No data fetched on page load. All checks are user-initiated via buttons.
- Use server actions (not DAL functions called from server components) since checks are triggered by user interaction in a client component.
- The DAL file still houses the query logic, but the server actions in the page or a separate actions file call into the DAL.
- Results displayed in a table with pass/fail indicators using green check / red X icons.
- Points consistency check (season standings vs sum of fixture standings) is the most expensive query — it requires aggregating all fixture standings per user per gang per season. Show a separate loading indicator for this check.
- Fixture selector: fetch the list of fixtures in the active season on page load (this is a cheap query). Display as a dropdown with "All fixtures" as the default option.

---

## Edge Cases

- No active season — show message "No active season found. Checks cannot run."
- Fixture with no predictions — should have no fixture standings rows (not a mismatch)
- User who left a gang but has historical predictions — their standings may legitimately exist but with no new data
- Voided predictions (`is_correct IS NULL` but `points_earned = 0`) — should not count toward `correct_count` or `resolved_count`
- Season standings for a gang not enrolled in the active season — flag as orphaned
- Race condition: if a trigger is currently updating standings while checks run, results may show transient mismatches. Display a note: "Results reflect a point-in-time snapshot. Transient mismatches during live matches are expected."

---

## Storybook Requirements

### StandingsHealthCheck Stories
- `NotRun` — initial state with "Run Checks" buttons, no results
- `Running` — loading spinners on all sections
- `AllPassed` — all checks passed with green indicators
- `WithFailures` — mix of passed and failed checks

### SeasonStandingsChecks Stories
- `Passed` — all season checks passed
- `WithMismatches` — missing standings, orphaned rows, points inconsistencies

### FixtureStandingsChecks Stories
- `Passed` — all fixture checks passed
- `WithMismatches` — predicted_count and points_earned mismatches shown

### CheckResultTable Stories
- `Empty` — no results (checks not yet run)
- `WithResults` — table showing pass/fail rows
- `WithFailures` — expanded failure details showing expected vs actual

---

## Testing Requirements

- [ ] Unit test: `runSeasonStandingsChecks()` detects missing standings (user has predictions but no standings row)
- [ ] Unit test: `runSeasonStandingsChecks()` detects orphaned standings (deleted gang or deleted user)
- [ ] Unit test: `runSeasonStandingsChecks()` detects NULL ranks with non-zero predictions
- [ ] Unit test: `runSeasonStandingsChecks()` detects `accuracy_pct` outside 0-100 range
- [ ] Unit test: `runSeasonStandingsChecks()` detects points mismatch (season total vs sum of fixture points)
- [ ] Unit test: `runSeasonStandingsChecks()` returns all-pass when data is consistent
- [ ] Unit test: `runFixtureStandingsChecks()` detects `predicted_count` mismatch
- [ ] Unit test: `runFixtureStandingsChecks()` detects `correct_count` mismatch
- [ ] Unit test: `runFixtureStandingsChecks()` detects `resolved_count` mismatch (excludes voided predictions)
- [ ] Unit test: `runFixtureStandingsChecks()` detects `points_earned` mismatch
- [ ] Unit test: `runFixtureStandingsChecks(fixtureId)` scopes checks to a single fixture
- [ ] Unit test: `runFixtureStandingsChecks()` without fixtureId checks all fixtures in active season
- [ ] Unit test: all check functions handle empty data gracefully (no predictions, no standings)

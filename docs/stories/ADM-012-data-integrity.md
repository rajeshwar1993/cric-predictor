# ADM-012: Data Integrity Checks

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Referential integrity checks, business logic consistency, scenario consistency validation

---

## Description

Build the data integrity page at `/admin/integrity` — runs comprehensive validation queries to detect orphaned records, constraint violations, business logic inconsistencies, and scenario seeding issues. Unlike other admin pages, these checks are on-demand (button-triggered) because they involve expensive queries that may perform full table scans. Results are stored in client state and not persisted — they must be re-run each session. All queries use the admin service role client.

---

## Acceptance Criteria

### Referential Integrity Checks
- [ ] Predictions referencing deleted gangs (gang `is_deleted = true` or gang row missing)
- [ ] Predictions referencing non-existent scenarios (scenario row missing)
- [ ] Fixture scenarios referencing deleted gangs
- [ ] Standings entries (fixture + season) for deleted gangs
- [ ] Gang members without corresponding profiles (profile row missing)
- [ ] Gang league seasons for deleted gangs
- [ ] Each check displays: description, status (pass/fail/not-run), affected record count, expandable sample records (up to 10)

### Business Logic Consistency
- [ ] Gangs with > 20 approved members (trigger-enforced limit — verify no violations)
- [ ] Users in > 40 active gangs (trigger-enforced limit — verify no violations)
- [ ] Predictions submitted after the prediction deadline (RLS-enforced — verify no violations)
- [ ] Duplicate predictions for the same (user, scenario) pair (unique constraint enforced — verify no violations)
- [ ] Match number gaps or duplicates within a season (e.g., two fixtures with match_number = 5, or a gap from 14 to 16)
- [ ] Resolved fixture without a corresponding `fixture_results` row
- [ ] `fixture_results` row without a resolved fixture (orphaned result)
- [ ] Each check displays: description, status (pass/fail/not-run), affected count, expandable sample records

### Scenario Consistency
- [ ] Active gangs missing scenarios for upcoming fixtures within the 14-hour seeding window
- [ ] Wrong scenario count per (gang, fixture) pair — should be exactly 19 non-voided scenarios per pair
- [ ] Voided scenarios for a non-voided fixture (scenarios voided but fixture is still active)
- [ ] Non-voided scenarios for a voided fixture (fixture abandoned but scenarios were not voided)
- [ ] Each check displays: description, status (pass/fail/not-run), count, expandable list of affected (gang, fixture) pairs

### Controls
- [ ] "Run All Checks" button at the top that runs all three sections sequentially
- [ ] Per-section "Run" button to run only that section's checks
- [ ] Loading spinners while checks are in progress (per section)
- [ ] Last run timestamp displayed per section (e.g., "Last run: 2 minutes ago")
- [ ] Overall summary bar at top: "X checks passed, Y failed, Z not yet run"
- [ ] "Copy Results as JSON" button that copies all check results to clipboard for debugging
- [ ] Buttons disabled while a check is already running

### Layout
- [ ] Page title: "DATA INTEGRITY" in admin header breadcrumb
- [ ] Summary bar at the top with pass/fail/not-run counts and "Run All Checks" button
- [ ] Three collapsible sections: Referential Integrity, Business Logic, Scenario Consistency
- [ ] Each section has its own "Run" button and last-run timestamp
- [ ] CheckResultCard used consistently across all sections

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── integrity/
│               └── page.tsx
├── components/
│   └── admin/
│       └── integrity/
│           ├── integrity-dashboard.tsx
│           ├── integrity-dashboard.stories.tsx
│           ├── referential-checks.tsx
│           ├── referential-checks.stories.tsx
│           ├── business-logic-checks.tsx
│           ├── business-logic-checks.stories.tsx
│           ├── scenario-checks.tsx
│           ├── scenario-checks.stories.tsx
│           ├── check-result-card.tsx
│           └── check-result-card.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── integrity.ts
```

---

## Technical Notes

### Integrity Page
```tsx
// src/app/(admin)/admin/integrity/page.tsx
// This page is a thin server shell that renders the client-side IntegrityDashboard.
// Checks are on-demand (user-triggered), so the dashboard is a client component
// that calls server actions when the user clicks "Run".

import { IntegrityDashboard } from '@/components/admin/integrity/integrity-dashboard'

export default function IntegrityPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Data Integrity
      </h1>
      <IntegrityDashboard />
    </div>
  )
}
```

### Check Result Type
```typescript
type CheckStatus = 'pass' | 'fail' | 'not-run' | 'running'

interface CheckResult {
  id: string                      // unique check identifier
  name: string                    // human-readable name
  description: string             // what this check validates
  status: CheckStatus
  affectedCount: number           // 0 for pass, >0 for fail
  sampleRecords: Record<string, unknown>[]  // up to 10 sample records
  runAt: string | null            // ISO timestamp of last run
}

interface SectionResult {
  section: 'referential' | 'business-logic' | 'scenarios'
  checks: CheckResult[]
  lastRunAt: string | null
  isRunning: boolean
}
```

### CheckResultCard Component
```tsx
// src/components/admin/integrity/check-result-card.tsx
interface CheckResultCardProps {
  check: CheckResult
}

// Visual:
// - Background: #1A1A1A, border #333333, radius 12px
// - Left side: status icon (checkmark green for pass, X red for fail, dash gray for not-run, spinner for running)
// - Check name (bold, white) + description (caption, #A3A3A3)
// - Right side: affected count badge (red pill if > 0, green pill if 0)
// - Expandable: click to reveal sample records in a monospace table
// - Not-run state: muted, no count shown
```

### IntegrityDashboard Component
```tsx
// src/components/admin/integrity/integrity-dashboard.tsx
'use client'

// Client component that manages check state and triggers server actions.
// Uses useState for check results (not persisted across navigations).
// Calls server actions: runReferentialChecks(), runBusinessLogicChecks(), runScenarioChecks()

// Summary bar calculation:
// passed = checks.filter(c => c.status === 'pass').length
// failed = checks.filter(c => c.status === 'fail').length
// notRun = checks.filter(c => c.status === 'not-run').length
```

### Server Actions / DAL Functions
```typescript
// src/lib/dal/admin/integrity.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function runReferentialChecks(): Promise<CheckResult[]> {
  const supabase = createAdminClient()
  const results: CheckResult[] = []

  // 1. Predictions referencing deleted gangs
  const { data: predDeletedGangs } = await supabase.rpc('admin_check_predictions_deleted_gangs')
  // Fallback if no RPC: use raw query via supabase
  // SELECT p.id, p.gang_id FROM v2_predictions p
  // LEFT JOIN v2_gangs g ON p.gang_id = g.id
  // WHERE g.id IS NULL OR g.is_deleted = true
  // LIMIT 10

  // 2. Predictions referencing non-existent scenarios
  // SELECT p.id, p.scenario_id FROM v2_predictions p
  // LEFT JOIN v2_gang_fixture_scenarios s ON p.scenario_id = s.id
  // WHERE s.id IS NULL
  // LIMIT 10

  // 3. Fixture scenarios referencing deleted gangs
  // SELECT s.id, s.gang_id FROM v2_gang_fixture_scenarios s
  // LEFT JOIN v2_gangs g ON s.gang_id = g.id
  // WHERE g.id IS NULL OR g.is_deleted = true
  // LIMIT 10

  // 4. Standings for deleted gangs
  // SELECT fs.id, fs.gang_id FROM v2_fixture_standings fs
  // LEFT JOIN v2_gangs g ON fs.gang_id = g.id
  // WHERE g.id IS NULL OR g.is_deleted = true
  // LIMIT 10
  // (repeat for v2_season_standings)

  // 5. Gang members without profiles
  // SELECT gm.id, gm.user_id FROM v2_gang_members gm
  // LEFT JOIN v2_profiles p ON gm.user_id = p.id
  // WHERE p.id IS NULL
  // LIMIT 10

  // 6. Gang league seasons for deleted gangs
  // SELECT gls.id, gls.gang_id FROM v2_gang_league_seasons gls
  // LEFT JOIN v2_gangs g ON gls.gang_id = g.id
  // WHERE g.id IS NULL OR g.is_deleted = true
  // LIMIT 10

  return results
}

export async function runBusinessLogicChecks(): Promise<CheckResult[]> {
  const supabase = createAdminClient()
  const results: CheckResult[] = []

  // 1. Gangs with > 20 approved members
  // SELECT gang_id, COUNT(*) as member_count
  // FROM v2_gang_members
  // WHERE status = 'approved'
  // GROUP BY gang_id
  // HAVING COUNT(*) > 20

  // 2. Users in > 40 active gangs
  // SELECT user_id, COUNT(*) as gang_count
  // FROM v2_gang_members gm
  // JOIN v2_gangs g ON gm.gang_id = g.id
  // WHERE gm.status = 'approved' AND g.is_deleted = false
  // GROUP BY user_id
  // HAVING COUNT(*) > 40

  // 3. Predictions submitted after deadline
  // Compare v2_predictions.submitted_at with the computed prediction deadline
  // for each (fixture_id, gang_id) pair. The deadline is derived from
  // fixture start_time minus the gang's prediction_window setting.
  // SELECT p.id, p.submitted_at, f.start_time
  // FROM v2_predictions p
  // JOIN v2_gang_fixture_scenarios s ON p.scenario_id = s.id
  // JOIN v2_league_season_fixtures lsf ON s.fixture_id = lsf.id
  // JOIN v2_fixtures f ON lsf.fixture_id = f.id
  // WHERE p.submitted_at > (f.start_time - interval '30 minutes')
  // LIMIT 10

  // 4. Duplicate predictions (same user, same scenario)
  // SELECT user_id, scenario_id, COUNT(*)
  // FROM v2_predictions
  // GROUP BY user_id, scenario_id
  // HAVING COUNT(*) > 1

  // 5. Match number gaps or duplicates within a season
  // SELECT season_id, match_number, COUNT(*) as cnt
  // FROM v2_fixtures
  // GROUP BY season_id, match_number
  // HAVING COUNT(*) > 1
  // UNION ALL
  // (detect gaps by checking for non-sequential match numbers)

  // 6. Resolved fixture without fixture_results row
  // SELECT f.id FROM v2_fixtures f
  // LEFT JOIN v2_fixture_results fr ON f.id = fr.fixture_id
  // WHERE f.status = 'resolved' AND fr.id IS NULL

  // 7. fixture_results row without resolved fixture
  // SELECT fr.id, fr.fixture_id FROM v2_fixture_results fr
  // JOIN v2_fixtures f ON fr.fixture_id = f.id
  // WHERE f.status != 'resolved'

  return results
}

export async function runScenarioChecks(): Promise<CheckResult[]> {
  const supabase = createAdminClient()
  const results: CheckResult[] = []

  // 1. Active gangs missing scenarios for upcoming fixtures within 14h
  // For each upcoming fixture starting within 14 hours, check that every
  // active gang (with a gang_league_season for the fixture's league season)
  // has scenarios seeded.
  // SELECT g.id as gang_id, lsf.id as fixture_id
  // FROM v2_gangs g
  // JOIN v2_gang_league_seasons gls ON g.id = gls.gang_id
  // JOIN v2_league_season_fixtures lsf ON gls.league_season_id = lsf.league_season_id
  // JOIN v2_fixtures f ON lsf.fixture_id = f.id
  // LEFT JOIN v2_gang_fixture_scenarios s ON s.gang_id = g.id AND s.fixture_id = lsf.id
  // WHERE g.is_deleted = false
  //   AND f.status = 'upcoming'
  //   AND f.start_time <= NOW() + interval '14 hours'
  //   AND s.id IS NULL
  // GROUP BY g.id, lsf.id

  // 2. Wrong scenario count per (gang, fixture) — should be exactly 19
  // SELECT gang_id, fixture_id, COUNT(*) as scenario_count
  // FROM v2_gang_fixture_scenarios
  // WHERE is_voided = false
  // GROUP BY gang_id, fixture_id
  // HAVING COUNT(*) != 19

  // 3. Voided scenarios for non-voided fixture
  // SELECT DISTINCT s.gang_id, s.fixture_id
  // FROM v2_gang_fixture_scenarios s
  // JOIN v2_league_season_fixtures lsf ON s.fixture_id = lsf.id
  // JOIN v2_fixtures f ON lsf.fixture_id = f.id
  // WHERE s.is_voided = true
  //   AND f.status NOT IN ('abandoned', 'no_result')

  // 4. Non-voided scenarios for voided fixture
  // SELECT DISTINCT s.gang_id, s.fixture_id
  // FROM v2_gang_fixture_scenarios s
  // JOIN v2_league_season_fixtures lsf ON s.fixture_id = lsf.id
  // JOIN v2_fixtures f ON lsf.fixture_id = f.id
  // WHERE s.is_voided = false
  //   AND f.status IN ('abandoned', 'no_result')

  return results
}
```

### Copy Results as JSON
```typescript
// Utility to serialize all check results for clipboard:
function serializeResults(sections: SectionResult[]): string {
  return JSON.stringify(
    sections.map((s) => ({
      section: s.section,
      lastRunAt: s.lastRunAt,
      checks: s.checks.map((c) => ({
        name: c.name,
        status: c.status,
        affectedCount: c.affectedCount,
        sampleRecords: c.sampleRecords,
      })),
    })),
    null,
    2
  )
}
```

### Key Design Decisions
- All queries use the admin service role client from ADM-001 (bypasses RLS)
- Checks are on-demand (button-triggered) because they involve expensive queries — full table scans and multi-table JOINs
- Results are stored in client state (React `useState`) and not persisted. They are lost on page navigation and must be re-run each session.
- Server actions are used because these are user-initiated operations that return results
- The CheckResultCard is a reusable component shared across all three sections with consistent status icons, count badges, and expandable detail
- Sample records are capped at 10 to avoid transferring large payloads from server actions
- The summary bar ("X passed, Y failed, Z not run") provides immediate high-level status
- Predictions-after-deadline check uses the gang's prediction window setting to compute the actual deadline (not a hardcoded 30 minutes)
- Scenario count check expects exactly 19 non-voided scenarios per (gang, fixture) pair — this is the canonical number of prediction scenarios in Bragg

---

## Edge Cases

- Fresh deploy with no data → all checks pass (zero records to violate)
- Running checks concurrently → disable buttons while a section is running to prevent duplicate queries
- Very large tables (100k+ predictions) → these queries may take several seconds; show loading spinners and consider timeouts
- Deleted gangs that still have active scenarios → correctly flagged by referential checks
- Voided fixture with partial scenario voiding → caught by scenario consistency check 4
- Match number gaps caused by abandoned fixtures → distinguish legitimate gaps from data issues
- Copy JSON with no results yet → button disabled when nothing has been run
- Section partially run → summary bar shows accurate counts across all sections

---

## Storybook Requirements

### IntegrityDashboard Stories
- `NotRun` — all checks in not-run state, summary shows "0 passed, 0 failed, 20 not yet run"
- `AllPassed` — all checks have been run and passed, green summary bar
- `SomeFailures` — mix of passed and failed checks, summary shows counts in red/green

### ReferentialChecks Stories
- `AllPassed` — all 6 referential checks passing with green badges
- `WithOrphans` — predictions referencing deleted gangs and members without profiles flagged red

### BusinessLogicChecks Stories
- `AllPassed` — all 7 business logic checks passing
- `WithViolations` — gangs over member limit and duplicate predictions detected

### ScenarioChecks Stories
- `AllPassed` — all 4 scenario checks passing
- `WithIssues` — wrong scenario count and non-voided scenarios for voided fixture detected

### CheckResultCard Stories
- `Pass` — green checkmark, zero affected count, description visible
- `Fail` — red X, affected count badge, expandable sample records shown
- `NotRun` — gray dash, muted text, no count shown
- `Running` — spinner animation, "Checking..." text

---

## Testing Requirements

- [ ] Unit test: `runReferentialChecks()` returns pass for all checks when data is clean
- [ ] Unit test: `runReferentialChecks()` detects predictions referencing deleted gangs
- [ ] Unit test: `runReferentialChecks()` detects gang members without profiles
- [ ] Unit test: `runBusinessLogicChecks()` returns pass when no constraint violations exist
- [ ] Unit test: `runBusinessLogicChecks()` detects gangs with > 20 approved members
- [ ] Unit test: `runBusinessLogicChecks()` detects resolved fixtures without fixture_results
- [ ] Unit test: `runScenarioChecks()` returns pass when all scenarios are correctly seeded
- [ ] Unit test: `runScenarioChecks()` detects wrong scenario count (not 19)
- [ ] Unit test: `runScenarioChecks()` detects non-voided scenarios for voided fixtures
- [ ] Unit test: CheckResultCard renders pass state correctly (green checkmark, zero count)
- [ ] Unit test: CheckResultCard renders fail state with expandable sample records
- [ ] Unit test: IntegrityDashboard summary bar calculates correct counts
- [ ] Unit test: "Copy Results as JSON" produces valid JSON with all check data

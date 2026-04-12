# ADM-005: Scenario Resolution Tracking

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Resolution overview, by-phase breakdown, by-slug breakdown, anomaly detection

---

## Description

Build the scenario resolution tracking page at `/admin/scenarios` — shows resolution progress across the active season, breakdowns by resolution phase and by scenario slug, and flags data anomalies. This page helps the admin monitor whether the automated resolution pipeline is working correctly and identify scenarios that may need manual intervention.

---

## Acceptance Criteria

### Resolution Overview (`src/components/admin/scenarios/resolution-overview.tsx`)
- [ ] Summary stat cards:
  - Total Created (all `v2_fixture_scenarios` in active season)
  - Resolved (where `is_resolved = true`)
  - Voided (where `is_voided = true`)
  - Pending (where `is_resolved = false AND is_voided = false`)
  - Resolution Rate % (`resolved / (resolved + pending) * 100`, excluding voided)
- [ ] Visual progress bar: stacked horizontal bar showing resolved (green), pending (yellow), voided (red) proportions
- [ ] All counts across all gangs in the active season

### Resolution by Phase (`src/components/admin/scenarios/resolution-by-phase.tsx`)
- [ ] Table or horizontal stacked bar chart grouped by `resolution_phase`
- [ ] Phases in lifecycle order: `toss`, `first_wicket`, `team_powerplay_end`, `mid_match`, `team_innings_end`, `end`, `post_match`
- [ ] Each phase shows: resolved count, pending count, voided count, resolution rate %
- [ ] Phases with 0 resolved but > 0 pending flagged with amber warning icon (potential pipeline issue)
- [ ] Phase labels displayed as human-readable: "Toss", "First Wicket", "Powerplay End", "Mid Match", "Innings End", "Match End", "Post Match"

### Resolution by Slug (`src/components/admin/scenarios/resolution-by-slug.tsx`)
- [ ] Table of all 19 active scenario slugs
- [ ] Columns:
  - Slug (e.g., `match_winner`)
  - Title (from `v2_scenario_templates.title`, with placeholders)
  - Total Instances (count of `v2_fixture_scenarios` with this slug)
  - Resolved count
  - Voided count
  - Pending count
  - Accuracy Rate % (correct predictions / total resolved predictions for this slug)
  - Most Common Correct Answer (mode of `correct_answer` for resolved scenarios)
- [ ] Sortable by any column
- [ ] Accuracy rate helps identify which scenarios are hardest (low accuracy) or easiest (high accuracy)
- [ ] Uses shadcn/ui Table component

### Scenario Anomalies (`src/components/admin/scenarios/scenario-anomalies.tsx`)
- [ ] Alert list of detected data anomalies, each with description, count, and affected IDs
- [ ] Anomaly types:
  - **Resolved with NULL correct_answer:** `is_resolved = true` but `correct_answer IS NULL` (resolution ran but didn't set answer)
  - **Resolved but fixture still upcoming:** scenario `is_resolved = true` but fixture `status = 'upcoming'` (should never happen)
  - **Non-voided scenarios for abandoned fixture:** fixture `status IN ('abandoned', 'no_result')` but scenario `is_voided = false AND is_resolved = false`
  - **Voided scenarios for non-voided fixture:** scenario `is_voided = true` but fixture `status NOT IN ('abandoned', 'no_result')` (scenarios voided when they shouldn't be)
  - **Wrong scenario count per (gang, fixture):** count != 19 active scenarios per (gang, fixture) pair (templates may have changed or seeding was incomplete)
  - **Orphaned scenarios:** scenario's `gang_id` references a gang where `is_deleted = true` (gang was soft-deleted but scenarios remain)
- [ ] Each anomaly row shows: severity icon, anomaly type, count of affected records, sample fixture/gang IDs (first 5) with links to fixture detail page
- [ ] No anomalies state: green checkmark with "No anomalies detected"
- [ ] Anomalies sorted by count descending (most prevalent first)

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── scenarios/
│               └── page.tsx
├── components/
│   └── admin/
│       └── scenarios/
│           ├── resolution-overview.tsx
│           ├── resolution-overview.stories.tsx
│           ├── resolution-by-phase.tsx
│           ├── resolution-by-phase.stories.tsx
│           ├── resolution-by-slug.tsx
│           ├── resolution-by-slug.stories.tsx
│           ├── scenario-anomalies.tsx
│           └── scenario-anomalies.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── scenarios.ts
```

---

## Technical Notes

### Page Composition
```tsx
// src/app/(admin)/admin/scenarios/page.tsx
import { Suspense } from 'react'
import {
  getResolutionOverview,
  getResolutionByPhase,
  getResolutionBySlug,
  getScenarioAnomalies,
} from '@/lib/dal/admin/scenarios'
import { ResolutionOverview } from '@/components/admin/scenarios/resolution-overview'
import { ResolutionByPhase } from '@/components/admin/scenarios/resolution-by-phase'
import { ResolutionBySlug } from '@/components/admin/scenarios/resolution-by-slug'
import { ScenarioAnomalies } from '@/components/admin/scenarios/scenario-anomalies'

export default async function ScenariosPage() {
  const [overview, byPhase, bySlug] = await Promise.all([
    getResolutionOverview(),
    getResolutionByPhase(),
    getResolutionBySlug(),
  ])

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Scenario Resolution
      </h1>
      <ResolutionOverview data={overview} />
      <ResolutionByPhase data={byPhase} />
      <ResolutionBySlug data={bySlug} />
      {/* Anomalies fetched separately — more expensive queries */}
      <Suspense fallback={<AnomaliesSkeleton />}>
        <ScenarioAnomaliesSection />
      </Suspense>
    </div>
  )
}

async function ScenarioAnomaliesSection() {
  const anomalies = await getScenarioAnomalies()
  return <ScenarioAnomalies anomalies={anomalies} />
}
```

### DAL Functions (`src/lib/dal/admin/scenarios.ts`)
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

interface ResolutionOverviewData {
  totalCreated: number
  resolved: number
  voided: number
  pending: number
  resolutionRate: number
}

export async function getResolutionOverview(): Promise<ResolutionOverviewData> {
  const supabase = createAdminClient()
  const seasonId = await getActiveSeasonId()

  const { data, error } = await supabase
    .from('v2_fixture_scenarios')
    .select('is_resolved, is_voided')
    .eq('season_id', seasonId)

  if (error) throw error

  const totalCreated = data.length
  const resolved = data.filter(s => s.is_resolved).length
  const voided = data.filter(s => s.is_voided).length
  const pending = data.filter(s => !s.is_resolved && !s.is_voided).length
  const resolutionRate = resolved + pending > 0
    ? Math.round((resolved / (resolved + pending)) * 100)
    : 0

  return { totalCreated, resolved, voided, pending, resolutionRate }
}

export async function getResolutionByPhase() {
  const supabase = createAdminClient()
  const seasonId = await getActiveSeasonId()

  const { data, error } = await supabase
    .from('v2_fixture_scenarios')
    .select('resolution_phase, is_resolved, is_voided')
    .eq('season_id', seasonId)

  if (error) throw error

  // Group by resolution_phase and compute counts
  const phaseMap = new Map<string, { resolved: number; pending: number; voided: number }>()
  for (const scenario of data) {
    const phase = scenario.resolution_phase
    const entry = phaseMap.get(phase) ?? { resolved: 0, pending: 0, voided: 0 }
    if (scenario.is_resolved) entry.resolved++
    else if (scenario.is_voided) entry.voided++
    else entry.pending++
    phaseMap.set(phase, entry)
  }

  return phaseMap
}

export async function getResolutionBySlug() {
  const supabase = createAdminClient()
  const seasonId = await getActiveSeasonId()

  // Fetch scenarios with slug data
  const { data: scenarios, error: scenarioError } = await supabase
    .from('v2_fixture_scenarios')
    .select('id, slug, title, is_resolved, is_voided, correct_answer')
    .eq('season_id', seasonId)

  if (scenarioError) throw scenarioError

  // Fetch predictions for accuracy calculation
  const { data: predictions, error: predError } = await supabase
    .from('v2_predictions')
    .select('scenario_id, is_correct')
    .eq('season_id', seasonId)
    .not('is_correct', 'is', null)

  if (predError) throw predError

  // Group and compute per-slug stats
  // ... aggregate by slug, compute accuracy from predictions
  return aggregatedData
}

export async function getScenarioAnomalies() {
  const supabase = createAdminClient()
  const seasonId = await getActiveSeasonId()
  const anomalies: ScenarioAnomaly[] = []

  // 1. Resolved with NULL correct_answer
  const { data: nullAnswer } = await supabase
    .from('v2_fixture_scenarios')
    .select('id, fixture_id, gang_id, slug')
    .eq('season_id', seasonId)
    .eq('is_resolved', true)
    .is('correct_answer', null)

  if (nullAnswer?.length) {
    anomalies.push({
      type: 'resolved_null_answer',
      description: 'Resolved scenarios with NULL correct_answer',
      count: nullAnswer.length,
      sampleIds: nullAnswer.slice(0, 5),
    })
  }

  // 2. Resolved but fixture still upcoming
  // 3. Non-voided scenarios for abandoned fixture
  // 4. Voided scenarios for non-voided fixture
  // 5. Wrong scenario count per (gang, fixture)
  // 6. Orphaned scenarios (deleted gang)
  // Each follows the same pattern: query, check, push to anomalies

  return anomalies
}
```

### Resolution Phase Labels
```typescript
const phaseOrder = [
  'toss',
  'first_wicket',
  'team_powerplay_end',
  'mid_match',
  'team_innings_end',
  'end',
  'post_match',
] as const

const phaseLabels: Record<string, string> = {
  toss: 'Toss',
  first_wicket: 'First Wicket',
  team_powerplay_end: 'Powerplay End',
  mid_match: 'Mid Match',
  team_innings_end: 'Innings End',
  end: 'Match End',
  post_match: 'Post Match',
}
```

### Progress Bar Component
```tsx
// Stacked horizontal bar for resolution overview
function ResolutionProgressBar({
  resolved, pending, voided, total,
}: {
  resolved: number; pending: number; voided: number; total: number
}) {
  if (total === 0) return <div className="h-4 w-full rounded-full bg-neutral-800" />

  const resolvedPct = (resolved / total) * 100
  const pendingPct = (pending / total) * 100
  const voidedPct = (voided / total) * 100

  return (
    <div className="flex h-4 w-full overflow-hidden rounded-full bg-neutral-800">
      <div className="bg-green-500" style={{ width: `${resolvedPct}%` }} />
      <div className="bg-amber-500" style={{ width: `${pendingPct}%` }} />
      <div className="bg-red-500" style={{ width: `${voidedPct}%` }} />
    </div>
  )
}
```

### Key Design Decisions
- Overview and by-phase/by-slug data are fetched in parallel (fast queries on indexed columns)
- Anomaly detection is in a Suspense boundary with its own loading skeleton (more expensive queries with joins)
- Resolution by slug joins `v2_predictions` for accuracy — this is the heaviest query on the page
- Accuracy per slug: `COUNT(is_correct = true) / COUNT(is_correct IS NOT NULL)` for resolved predictions only
- Most common correct_answer: computed client-side from the scenario data (mode calculation)
- Wrong scenario count check uses 19 as the expected count per (gang, fixture) — matches the number of active templates

---

## Storybook Requirements

### ResolutionOverview Stories
- `EarlySeason` — low resolution rate (5%), mostly pending
- `MidSeason` — 50% resolution rate, mix of all states
- `AllResolved` — 100% resolution rate, some voided
- `Empty` — zero scenarios (season not started)

### ResolutionByPhase Stories
- `Default` — all phases with varying resolution states
- `WithIssues` — some phases flagged with 0 resolved but >0 pending
- `AllResolved` — every phase fully resolved
- `EarlySeason` — only toss and first_wicket phases have any resolved

### ResolutionBySlug Stories
- `Default` — all 19 slugs with mixed stats
- `SortedByAccuracy` — sorted by accuracy rate ascending (hardest first)
- `SortedByPending` — sorted by pending count descending
- `Loading` — skeleton state

### ScenarioAnomalies Stories
- `NoAnomalies` — green checkmark, all clear
- `WithAnomalies` — 3 different anomaly types detected
- `CriticalAnomalies` — high-count anomalies (e.g., 50+ resolved with null answer)
- `SingleAnomaly` — only one anomaly type

---

## Testing Requirements

- [ ] Unit test: `getResolutionOverview()` correctly computes totals and resolution rate
- [ ] Unit test: `getResolutionOverview()` returns 0% rate when no scenarios exist
- [ ] Unit test: `getResolutionOverview()` excludes voided from resolution rate denominator
- [ ] Unit test: `getResolutionByPhase()` groups scenarios by all 7 phases
- [ ] Unit test: `getResolutionByPhase()` handles phases with zero scenarios
- [ ] Unit test: `getResolutionBySlug()` computes accuracy rate per slug
- [ ] Unit test: `getResolutionBySlug()` returns 0 accuracy when no predictions are resolved
- [ ] Unit test: `getResolutionBySlug()` computes most common correct_answer
- [ ] Unit test: `getScenarioAnomalies()` detects resolved scenarios with NULL correct_answer
- [ ] Unit test: `getScenarioAnomalies()` detects resolved scenarios for upcoming fixtures
- [ ] Unit test: `getScenarioAnomalies()` detects non-voided scenarios for abandoned fixtures
- [ ] Unit test: `getScenarioAnomalies()` detects voided scenarios for non-voided fixtures
- [ ] Unit test: `getScenarioAnomalies()` detects wrong scenario count per (gang, fixture)
- [ ] Unit test: `getScenarioAnomalies()` detects orphaned scenarios for deleted gangs
- [ ] Unit test: `getScenarioAnomalies()` returns empty array when no anomalies exist

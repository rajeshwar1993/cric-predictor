# ADM-004: Fixture Pipeline

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001, ADM-003
**Estimated scope:** Fixture pipeline visualization, fixture table, detail drill-down, fixture alerts

---

## Description

Build the fixture pipeline view at `/admin/fixtures` — a visual status pipeline (Kanban-style columns by status), a sortable/filterable fixture table for the active season, and a detail drill-down page per fixture showing results, live scores, scenario resolution, and prediction summaries. This is the primary operational view for monitoring match lifecycle and catching issues before they affect users.

---

## Acceptance Criteria

### Pipeline Visualization (`src/components/admin/fixtures/fixture-pipeline.tsx`)
- [ ] Kanban-style columns for each status: Upcoming, Live, Completed, Resolved, Abandoned/No Result
- [ ] Each column shows count badge and compact fixture cards (match # + team codes, e.g., "M23: CSK vs MI")
- [ ] Live column highlighted with pulsing lime border if any fixtures are currently live
- [ ] Fixtures ordered by `start_datetime` within each column (ascending for Upcoming, descending for Completed/Resolved)
- [ ] Clicking a fixture card navigates to the fixture detail page
- [ ] Responsive: columns stack vertically on mobile, horizontal scroll on tablet+

### Fixture Table (`src/components/admin/fixtures/fixture-table.tsx`)
- [ ] Full table of all fixtures in the active season
- [ ] Columns:
  - Match # (`match_number`)
  - Round (`round`)
  - Home Team (team `code` + `color` dot)
  - Away Team (team `code` + `color` dot)
  - Start Datetime (formatted in IST, `DD MMM HH:mm`)
  - Venue (`venue_name`, truncated with tooltip)
  - Status (color-coded badge)
  - Status Changed At (relative time, e.g., "2h ago")
  - Pre-match Synced (green check or red x icon)
  - Has Results (green check or red x icon — based on existence of `v2_fixture_results` row)
  - Scenarios Seeded (count of distinct gangs with scenarios for this fixture)
  - Scenarios Resolved % (resolved / total non-voided scenarios across all gangs)
  - Total Predictions (count of `v2_predictions` rows for this fixture)
  - Time in Current Status (duration since `status_changed_at`, formatted as "Xh Ym")
- [ ] Sortable by any column (click header to toggle asc/desc)
- [ ] Filterable by status (multi-select dropdown, defaults to all statuses)
- [ ] Click row navigates to fixture detail drill-down (`/admin/fixtures/[fixtureId]`)
- [ ] Uses shadcn/ui Table component

### Fixture Detail Page (`/admin/fixtures/[fixtureId]`)
- [ ] Full fixture metadata card: all `v2_league_season_fixtures` columns displayed with labels
- [ ] Team names, codes, and colors resolved from `v2_league_teams`
- [ ] Tabbed sections: Metadata, Results, Live Scores, Scenarios, Predictions

#### Results Tab
- [ ] All `v2_fixture_results` columns with human-readable labels
- [ ] Player names resolved from `v2_players` for `top_scorer_id`, `top_wicket_taker_id`, `most_sixes_player_id`, `player_of_match_id`
- [ ] Team names resolved for `toss_winner_id`, `match_winner_id`
- [ ] Empty state: "No results recorded yet" for upcoming/live fixtures

#### Live Scores Tab
- [ ] All `v2_fixture_live_scores` columns with formatted values
- [ ] `last_polled_at` shown with relative time and absolute timestamp
- [ ] Batting team name resolved
- [ ] `raw_scorecard_json` shown in collapsible JSON viewer
- [ ] Empty state: "No live score data" for non-live fixtures

#### Scenarios Tab
- [ ] Scenario resolution table grouped by gang (gang name as group header)
- [ ] Columns: slug, title, is_resolved (boolean icon), is_voided (boolean icon), correct_answer, resolution_phase
- [ ] Color-coded rows: green background tint = resolved, red = voided, yellow/amber = pending
- [ ] Summary row per gang: X/19 resolved, X voided, X pending

#### Predictions Tab
- [ ] Prediction summary per gang: gang name, prediction count, distinct users who predicted, total approved members, participation rate (predicted / approved members %)
- [ ] Expandable per-gang detail showing per-user prediction counts

### Fixture Alerts (`src/components/admin/fixtures/fixture-alerts.tsx`)
- [ ] Alert banner displayed at top of `/admin/fixtures` page for any active issues
- [ ] Alert severity levels with color coding:
  - **Critical** (red): Fixture stuck in `completed` status for > 120 minutes (resolution should have run)
  - **High** (orange): Fixture is `live` but `last_polled_at` > 2 minutes ago or NULL (live polling may be broken)
  - **High** (orange): Fixture is `upcoming` within 14 hours but no scenarios seeded for any gang
  - **Medium** (yellow): `pre_match_synced = false` and fixture starts within 30 minutes
  - **Medium** (yellow): Fixture is `resolved` but no `v2_fixture_results` row exists
- [ ] Each alert shows: severity icon, description, affected fixture(s) with match # and team codes
- [ ] Alerts sorted by severity (critical first)
- [ ] Dismissible per-session (not persisted)
- [ ] No alerts state: green "All clear" indicator

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── fixtures/
│               ├── page.tsx                          # Pipeline + table + alerts
│               └── [fixtureId]/
│                   └── page.tsx                      # Fixture detail drill-down
├── components/
│   └── admin/
│       └── fixtures/
│           ├── fixture-pipeline.tsx
│           ├── fixture-pipeline.stories.tsx
│           ├── fixture-pipeline-column.tsx
│           ├── fixture-table.tsx
│           ├── fixture-table.stories.tsx
│           ├── fixture-detail.tsx
│           ├── fixture-detail.stories.tsx
│           ├── fixture-results-panel.tsx
│           ├── fixture-live-scores-panel.tsx
│           ├── fixture-scenarios-table.tsx
│           ├── fixture-scenarios-table.stories.tsx
│           ├── fixture-predictions-summary.tsx
│           ├── fixture-alerts.tsx
│           └── fixture-alerts.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── fixtures.ts
```

---

## Technical Notes

### Pipeline Page Composition
```tsx
// src/app/(admin)/admin/fixtures/page.tsx
import { getFixturePipeline, getFixtureTable, getFixtureAlerts } from '@/lib/dal/admin/fixtures'
import { FixtureAlerts } from '@/components/admin/fixtures/fixture-alerts'
import { FixturePipeline } from '@/components/admin/fixtures/fixture-pipeline'
import { FixtureTable } from '@/components/admin/fixtures/fixture-table'

export default async function FixturesPage() {
  const [pipeline, fixtures, alerts] = await Promise.all([
    getFixturePipeline(),
    getFixtureTable(),
    getFixtureAlerts(),
  ])

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Fixture Pipeline
      </h1>
      <FixtureAlerts alerts={alerts} />
      <FixturePipeline fixtures={pipeline} />
      <FixtureTable fixtures={fixtures} />
    </div>
  )
}
```

### DAL Functions (`src/lib/dal/admin/fixtures.ts`)
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

export async function getFixturePipeline() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('v2_league_season_fixtures')
    .select(`
      id, match_number, status, start_datetime,
      home_team:v2_league_teams!home_team_id (code, color),
      away_team:v2_league_teams!away_team_id (code, color)
    `)
    .eq('season_id', activeSeasonId) // resolve active season first
    .order('start_datetime', { ascending: true })

  if (error) throw error
  return data
}

export async function getFixtureTable() {
  const supabase = createAdminClient()

  // Main fixture query with joined team data
  const { data, error } = await supabase
    .from('v2_league_season_fixtures')
    .select(`
      id, match_number, round, start_datetime, venue_name, status,
      status_changed_at, pre_match_synced,
      home_team:v2_league_teams!home_team_id (id, name, code, color),
      away_team:v2_league_teams!away_team_id (id, name, code, color),
      v2_fixture_results (fixture_id)
    `)
    .eq('season_id', activeSeasonId)
    .order('match_number', { ascending: true })

  if (error) throw error

  // Aggregate scenario and prediction counts separately for performance
  // (avoid N+1 by using grouped counts)
  return data
}

export async function getFixtureDetail(fixtureId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('v2_league_season_fixtures')
    .select(`
      *,
      home_team:v2_league_teams!home_team_id (*),
      away_team:v2_league_teams!away_team_id (*),
      v2_fixture_results (
        *,
        toss_winner:v2_league_teams!toss_winner_id (name, code),
        match_winner:v2_league_teams!match_winner_id (name, code),
        top_scorer:v2_players!top_scorer_id (name),
        top_wicket_taker:v2_players!top_wicket_taker_id (name),
        most_sixes_player:v2_players!most_sixes_player_id (name),
        player_of_match:v2_players!player_of_match_id (name)
      ),
      v2_fixture_live_scores (*)
    `)
    .eq('id', fixtureId)
    .single()

  if (error) throw error
  return data
}

export async function getFixtureScenarios(fixtureId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('v2_fixture_scenarios')
    .select(`
      id, slug, title, is_resolved, is_voided, correct_answer, resolution_phase,
      v2_gangs!inner (id, name)
    `)
    .eq('fixture_id', fixtureId)
    .order('gang_id')
    .order('resolution_phase')

  if (error) throw error
  return data
}

export async function getFixtureAlerts() {
  const supabase = createAdminClient()
  const now = new Date()
  const alerts: FixtureAlert[] = []

  // Critical: completed > 120 min
  const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000)
  const { data: stuckCompleted } = await supabase
    .from('v2_league_season_fixtures')
    .select('id, match_number, status_changed_at, home_team:v2_league_teams!home_team_id (code), away_team:v2_league_teams!away_team_id (code)')
    .eq('status', 'completed')
    .lt('status_changed_at', twoHoursAgo.toISOString())

  // High: live but stale polling
  // High: upcoming within 14h, no scenarios
  // Medium: pre_match_synced false within 30 min
  // Medium: resolved but no results row

  return alerts
}
```

### Pipeline Visualization
```tsx
// Uses CSS Grid, not drag-and-drop (read-only dashboard)
const statusColumns = [
  { key: 'upcoming', label: 'Upcoming', color: 'bg-blue-500/10 border-blue-500/30' },
  { key: 'live', label: 'Live', color: 'bg-green-500/10 border-green-500/30' },
  { key: 'completed', label: 'Completed', color: 'bg-amber-500/10 border-amber-500/30' },
  { key: 'resolved', label: 'Resolved', color: 'bg-neutral-500/10 border-neutral-500/30' },
  { key: 'abandoned', label: 'Abandoned', color: 'bg-red-500/10 border-red-500/30' },
  { key: 'no_result', label: 'No Result', color: 'bg-red-500/10 border-red-500/30' },
] as const
```

### Status Badges
```tsx
const statusBadgeColors: Record<string, string> = {
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  live: 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse',
  completed: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  resolved: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
  abandoned: 'bg-red-500/20 text-red-400 border-red-500/30',
  no_result: 'bg-red-500/20 text-red-400 border-red-500/30',
}
```

### Fixture Detail Tabs
```tsx
// Use shadcn/ui Tabs component for detail sections
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue="metadata">
  <TabsList>
    <TabsTrigger value="metadata">Metadata</TabsTrigger>
    <TabsTrigger value="results">Results</TabsTrigger>
    <TabsTrigger value="live-scores">Live Scores</TabsTrigger>
    <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
    <TabsTrigger value="predictions">Predictions</TabsTrigger>
  </TabsList>
  <TabsContent value="metadata"><FixtureMetadata fixture={fixture} /></TabsContent>
  <TabsContent value="results"><FixtureResultsPanel results={fixture.v2_fixture_results} /></TabsContent>
  <TabsContent value="live-scores"><FixtureLiveScoresPanel scores={fixture.v2_fixture_live_scores} /></TabsContent>
  <TabsContent value="scenarios"><FixtureScenariosTable scenarios={scenarios} /></TabsContent>
  <TabsContent value="predictions"><FixturePredictionsSummary predictions={predictions} /></TabsContent>
</Tabs>
```

### Active Season Resolution
```typescript
// All admin fixture queries scope to the active season
async function getActiveSeasonId(): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('v2_seasons')
    .select('id')
    .eq('is_active', true)
    .single()

  if (error || !data) throw new Error('No active season found')
  return data.id
}
```

### Key Design Decisions
- Pipeline is CSS Grid, not a drag-and-drop library — the admin dashboard is read-only
- Fixture table uses shadcn/ui Table with sortable column headers (client-side sorting)
- Status filter is a client-side multi-select (all data loaded server-side for the active season)
- Fixture detail page is a Server Component that fetches all data in parallel
- Scenario and prediction aggregates are separate DAL calls to avoid overly complex joins
- Alert queries run independently with loading states since some are more expensive

---

## Storybook Requirements

### FixturePipeline Stories
- `AllStatuses` — fixtures spread across all 5 status columns
- `OnlyUpcoming` — season hasn't started yet, all in Upcoming
- `WithLive` — Live column has pulsing border, 2 live fixtures
- `Empty` — no fixtures in the season

### FixtureTable Stories
- `Default` — full season of fixtures with mixed statuses
- `FilteredByStatus` — filtered to show only live + completed
- `SortedByDate` — sorted by start datetime descending
- `Loading` — skeleton loading state

### FixtureDetail Stories
- `Upcoming` — no results, no live scores, scenarios pending
- `Live` — live scores populated, scenarios partially resolved
- `Completed` — results populated, most scenarios resolved
- `Resolved` — all scenarios resolved, full prediction summary

### FixtureScenariosTable Stories
- `AllResolved` — all 19 scenarios resolved for a gang (green rows)
- `MixedStatus` — some resolved, some pending, some voided
- `MultipleGangs` — grouped by 3 gangs with different resolution states

### FixtureAlerts Stories
- `NoAlerts` — green "All clear" indicator
- `WithCritical` — single critical alert (stuck in completed)
- `MultipleAlerts` — mix of critical, high, and medium alerts
- `AllSeverities` — one of each severity level

---

## Testing Requirements

- [ ] Unit test: `getFixturePipeline()` returns fixtures grouped by status
- [ ] Unit test: `getFixtureTable()` returns all fixtures for active season with team data
- [ ] Unit test: `getFixtureDetail()` returns fixture with resolved team names, player names, results, and live scores
- [ ] Unit test: `getFixtureScenarios()` returns scenarios grouped by gang
- [ ] Unit test: `getFixtureAlerts()` detects stuck-in-completed fixtures (> 120 min)
- [ ] Unit test: `getFixtureAlerts()` detects stale live polling (last_polled_at > 2 min)
- [ ] Unit test: `getFixtureAlerts()` detects upcoming fixtures without seeded scenarios
- [ ] Unit test: `getFixtureAlerts()` detects pre_match_synced false near match start
- [ ] Unit test: `getFixtureAlerts()` detects resolved fixtures without results row
- [ ] Unit test: `getFixtureAlerts()` returns empty array when no issues exist
- [ ] Unit test: status badge color mapping covers all 6 statuses
- [ ] Unit test: fixture detail page returns 404 for non-existent fixture ID

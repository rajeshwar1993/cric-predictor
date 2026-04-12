# ADM-002: Platform Overview

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Admin home page with key metric cards, cron health panel, data freshness indicators

---

## Description

Build the admin dashboard home page at `/admin/overview` — the first thing an admin sees after logging in. Shows key platform metrics (users, gangs, predictions, season progress), cron job health status, and data freshness indicators. All data is fetched server-side via the admin service role client. This page is read-only.

---

## Acceptance Criteria

### Key Metric Cards
- [ ] Total active users (non-deleted profiles)
- [ ] Deleted accounts count
- [ ] Onboarded vs not-yet-onboarded breakdown
- [ ] Active gangs count
- [ ] Deleted gangs count
- [ ] Total predictions (all time)
- [ ] Predictions today
- [ ] Active season info (name, dates, days remaining)
- [ ] Season progress bar (fixtures resolved / total)
- [ ] Fixture status breakdown: counts per status (upcoming, live, completed, resolved, abandoned, no_result) — color-coded chips
- [ ] Live fixtures highlighted if any are currently live

### Cron Job Health Panel
- [ ] Card per cron job: sync-fixtures, sync-fixtures-pre-match, live-poll-resolve-fixtures, seed-scenarios, deadline-reminders
- [ ] Each shows: schedule, last run time (if trackable), status indicator (green/yellow/red)
- [ ] Note: v1 shows static schedule info since no cron log table exists yet — add a note about this limitation

### Data Freshness Indicators
- [ ] Last fixture sync age (flag if > 26 hours)
- [ ] Live score freshness for any live fixtures (flag if `last_polled_at` > 60s)
- [ ] Scenario seeding coverage: count of unseeded (gang, fixture) pairs within 14h window
- [ ] Pre-match sync: fixtures starting within 30 min with `pre_match_synced = false`

### Layout
- [ ] 4-column responsive grid for metric cards (4 cols desktop, 2 cols tablet, 1 col mobile)
- [ ] Cron health in a separate section below metrics
- [ ] Data freshness indicators as a status bar or alert section at the top
- [ ] All data fetched server-side via admin DAL functions
- [ ] Page title: "OVERVIEW" in admin header breadcrumb

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── overview/
│               └── page.tsx
├── components/
│   └── admin/
│       └── overview/
│           ├── metric-card.tsx
│           ├── metric-card.stories.tsx
│           ├── metrics-grid.tsx
│           ├── metrics-grid.stories.tsx
│           ├── cron-health-panel.tsx
│           ├── cron-health-panel.stories.tsx
│           ├── data-freshness-bar.tsx
│           ├── data-freshness-bar.stories.tsx
│           ├── season-progress.tsx
│           └── season-progress.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── overview.ts              # All overview DAL functions
```

---

## Technical Notes

### Overview Page
```tsx
// src/app/(admin)/admin/overview/page.tsx
import { MetricsGrid } from '@/components/admin/overview/metrics-grid'
import { CronHealthPanel } from '@/components/admin/overview/cron-health-panel'
import { DataFreshnessBar } from '@/components/admin/overview/data-freshness-bar'
import {
  getOverviewMetrics,
  getFixtureStatusCounts,
  getSeasonProgress,
  getDataFreshnessChecks,
} from '@/lib/dal/admin/overview'

export default async function OverviewPage() {
  const [metrics, fixtureStatus, seasonProgress, freshness] = await Promise.all([
    getOverviewMetrics(),
    getFixtureStatusCounts(),
    getSeasonProgress(),
    getDataFreshnessChecks(),
  ])

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Overview
      </h1>
      <DataFreshnessBar checks={freshness} />
      <MetricsGrid metrics={metrics} fixtureStatus={fixtureStatus} seasonProgress={seasonProgress} />
      <CronHealthPanel />
    </div>
  )
}
```

### MetricCard Component
```tsx
// src/components/admin/overview/metric-card.tsx
interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtitle?: string        // e.g., "12 onboarded / 3 pending"
  alert?: 'green' | 'amber' | 'red'  // optional color indicator
  trend?: string           // e.g., "+5 today"
}
```

- Background: `#1A1A1A`, border `#333333`, radius 12px, padding 20px
- Icon: 20px, `#A3A3A3` (or alert color)
- Label: caption style, `#A3A3A3`, uppercase
- Value: H2 style, white, Space Grotesk 700
- Alert colors: green = `#C8E64A`, amber = `#F59E0B`, red = `#EF4444`

### Season Progress Component
```tsx
// src/components/admin/overview/season-progress.tsx
interface SeasonProgressProps {
  seasonName: string
  startDate: string
  endDate: string
  daysRemaining: number
  resolvedFixtures: number
  totalFixtures: number
}

// Visual: horizontal progress bar with resolved/total as fraction
// Bar fill: lime (#C8E64A) on dark track (#333333)
// Percentage label centered: "45% (32/71)"
```

### Fixture Status Chips
```typescript
const statusColors: Record<string, string> = {
  upcoming:   '#3B82F6', // blue
  live:       '#22C55E', // green
  completed:  '#F59E0B', // amber
  resolved:   '#6B7280', // gray
  abandoned:  '#EF4444', // red
  no_result:  '#8B5CF6', // purple
}
```

### Cron Health Panel
```typescript
const cronJobs = [
  { name: 'sync-fixtures',                schedule: 'Every 24h at 02:00 UTC',       description: 'Fetches fixtures from Sportmonks API' },
  { name: 'sync-fixtures-pre-match',      schedule: '15 min before each match',     description: 'Updates lineup and toss data' },
  { name: 'live-poll-resolve-fixtures',   schedule: 'Every 30s during live matches', description: 'Polls live scores and resolves scenarios' },
  { name: 'seed-scenarios',               schedule: 'Every 1h',                     description: 'Seeds scenarios for upcoming fixtures' },
  { name: 'deadline-reminders',           schedule: 'Every 15 min',                 description: 'Sends prediction deadline notifications' },
] as const
```

v1 limitation: since there is no cron log table, all cron cards show static schedule info with a "Manual check required" status. A `// TODO: ADM-XXX — add cron_logs table for real-time health` comment should be placed.

### DAL Functions
```typescript
// src/lib/dal/admin/overview.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function getOverviewMetrics() {
  const supabase = createAdminClient()

  // Active users: profiles where is_deleted = false
  const { count: activeUsers } = await supabase
    .from('v2_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)

  // Deleted accounts
  const { count: deletedUsers } = await supabase
    .from('v2_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', true)

  // Onboarded: has_onboarded = true
  const { count: onboardedUsers } = await supabase
    .from('v2_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('has_onboarded', true)
    .eq('is_deleted', false)

  // Active gangs
  const { count: activeGangs } = await supabase
    .from('v2_gangs')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)

  // Deleted gangs
  const { count: deletedGangs } = await supabase
    .from('v2_gangs')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', true)

  // Total predictions
  const { count: totalPredictions } = await supabase
    .from('v2_predictions')
    .select('*', { count: 'exact', head: true })

  // Predictions today
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { count: predictionsToday } = await supabase
    .from('v2_predictions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())

  return {
    activeUsers: activeUsers ?? 0,
    deletedUsers: deletedUsers ?? 0,
    onboardedUsers: onboardedUsers ?? 0,
    notOnboardedUsers: (activeUsers ?? 0) - (onboardedUsers ?? 0),
    activeGangs: activeGangs ?? 0,
    deletedGangs: deletedGangs ?? 0,
    totalPredictions: totalPredictions ?? 0,
    predictionsToday: predictionsToday ?? 0,
  }
}

export async function getFixtureStatusCounts() {
  const supabase = createAdminClient()

  // Get active season
  const { data: season } = await supabase
    .from('v2_seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (!season) return {}

  // Count fixtures per status
  const { data } = await supabase
    .from('v2_fixtures')
    .select('status')
    .eq('season_id', season.id)

  const counts: Record<string, number> = {}
  data?.forEach((row) => {
    counts[row.status] = (counts[row.status] || 0) + 1
  })

  return counts
}

export async function getSeasonProgress() {
  const supabase = createAdminClient()

  const { data: season } = await supabase
    .from('v2_seasons')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()

  if (!season) return null

  const { count: totalFixtures } = await supabase
    .from('v2_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', season.id)

  const { count: resolvedFixtures } = await supabase
    .from('v2_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', season.id)
    .eq('status', 'resolved')

  return {
    seasonName: season.name,
    startDate: season.start_date,
    endDate: season.end_date,
    daysRemaining: Math.max(0, Math.ceil(
      (new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )),
    resolvedFixtures: resolvedFixtures ?? 0,
    totalFixtures: totalFixtures ?? 0,
  }
}

export async function getDataFreshnessChecks() {
  const supabase = createAdminClient()

  // Last fixture sync: most recent updated_at on any fixture
  const { data: lastSync } = await supabase
    .from('v2_fixtures')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastSyncAge = lastSync
    ? (Date.now() - new Date(lastSync.updated_at).getTime()) / (1000 * 60 * 60)
    : null

  // Live score freshness: live fixtures with stale last_polled_at
  const { data: liveFixtures } = await supabase
    .from('v2_fixtures')
    .select('id, last_polled_at')
    .eq('status', 'live')

  const staleLiveFixtures = (liveFixtures ?? []).filter(
    (f) => f.last_polled_at && (Date.now() - new Date(f.last_polled_at).getTime()) > 60_000
  )

  // Unseeded scenario pairs: fixtures starting within 14h without scenarios
  const windowEnd = new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString()
  const { count: unseededPairs } = await supabase
    .from('v2_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'upcoming')
    .lte('start_time', windowEnd)
    // Further check would require cross-referencing v2_gang_fixture_scenarios

  // Pre-match sync: fixtures starting within 30 min with pre_match_synced = false
  const thirtyMinWindow = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const { count: unsyncedPreMatch } = await supabase
    .from('v2_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('pre_match_synced', false)
    .lte('start_time', thirtyMinWindow)
    .gte('start_time', new Date().toISOString())

  return {
    lastSyncAgeHours: lastSyncAge,
    isFixtureSyncStale: lastSyncAge !== null && lastSyncAge > 26,
    liveFixtureCount: liveFixtures?.length ?? 0,
    staleLiveFixtureCount: staleLiveFixtures.length,
    unseededPairsCount: unseededPairs ?? 0,
    unsyncedPreMatchCount: unsyncedPreMatch ?? 0,
  }
}
```

### Key Design Decisions
- All queries use the admin service role client from ADM-001 (bypasses RLS)
- Page is a Server Component — no client-side fetching
- Metric cards use a consistent component with optional alert colors
- Cron health is informational only in v1 (static schedules); in v2 a `cron_logs` table could power real status
- Data freshness thresholds are hardcoded but reasonable: 26h for fixture sync, 60s for live polls

---

## Edge Cases

- No active season → show "No active season" message instead of season progress
- Zero fixtures → season progress bar shows 0%
- No live fixtures → live score freshness section hidden
- First deploy with no data → all metrics show 0 cleanly (no NaN or undefined)

---

## Storybook Requirements

### MetricCard Stories
- `Default` — standard metric (e.g., "Active Users: 142")
- `WithAlert` — amber alert indicator (e.g., stale sync)
- `WithTrend` — shows "+12 today" trend text
- `Loading` — skeleton placeholder

### MetricsGrid Stories
- `AllGreen` — all metrics healthy, no alerts
- `WithAlerts` — some metrics flagged amber/red

### CronHealthPanel Stories
- `AllHealthy` — all cron jobs green status
- `SomeStale` — one or more cron jobs showing yellow/red

### DataFreshnessBar Stories
- `AllFresh` — all checks passing (green)
- `StaleData` — fixture sync stale, live polls stale

### SeasonProgress Stories
- `EarlySeason` — 5% through (3/71 resolved)
- `MidSeason` — 50% through (35/71 resolved)
- `SeasonComplete` — 100% (71/71 resolved)

---

## Testing Requirements

- [ ] Unit test: `getOverviewMetrics()` returns correct counts for active/deleted users, gangs, predictions
- [ ] Unit test: `getFixtureStatusCounts()` correctly groups fixtures by status
- [ ] Unit test: `getSeasonProgress()` returns `null` when no active season
- [ ] Unit test: `getSeasonProgress()` calculates `daysRemaining` correctly (never negative)
- [ ] Unit test: `getDataFreshnessChecks()` flags sync as stale when > 26 hours
- [ ] Unit test: `getDataFreshnessChecks()` flags live fixtures as stale when `last_polled_at` > 60s
- [ ] Unit test: MetricCard renders value, label, and alert color correctly
- [ ] Unit test: SeasonProgress renders correct percentage and fraction

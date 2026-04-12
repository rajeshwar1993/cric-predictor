# ADM-011: Operational Health & Alerts

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Edge function monitoring, Sportmonks API health, consolidated alert board

---

## Description

Build the operational health page at `/admin/operations` — monitors edge function status (inferred from data state since no cron log table exists in v1), Sportmonks API health indicators (fixture/player/live score data freshness), and provides a consolidated alert board that aggregates all active platform alerts from across the admin dashboard, ordered by severity. All data is fetched server-side via the admin service role client. This page is read-only.

---

## Acceptance Criteria

### Edge Function Monitoring
- [ ] Card per edge function: `sync-fixtures`, `sync-fixtures-pre-match`, `live-poll-resolve-fixtures`
- [ ] Each card shows: function name, schedule description, brief explanation of what it does
- [ ] Status indicator based on data freshness (green/amber/red):
  - `sync-fixtures`: green if most recent fixture `updated_at` or `created_at` is within 26 hours
  - `sync-fixtures-pre-match`: green if no upcoming fixtures starting within 30 minutes have `pre_match_synced = false`
  - `live-poll-resolve-fixtures`: green if no live fixtures have `last_polled_at` older than 60 seconds
- [ ] When no live fixtures exist, `live-poll-resolve-fixtures` shows a neutral/gray "No live fixtures" state (not green or red)
- [ ] Clear UI note: "v1 infers health from data state. No cron invocation logs available." with a `// TODO: ADM-XXX — add cron_logs table for real-time health` comment in code

### Sportmonks API Health (Inferred)
- [ ] Fixture data freshness: timestamp of last fixture sync (most recent `updated_at` from `v2_fixtures`)
- [ ] Player data freshness: timestamp of last player sync (most recent `updated_at` from `v2_players` or `v2_league_season_team_players`)
- [ ] Live score data: age of most recent live score poll (`last_polled_at` from live fixtures), or "No live fixtures" if none
- [ ] Data regression events: displayed as "Not tracked in v1" — would require a dedicated log table
- [ ] Reconciliation events: scenarios that were re-resolved — displayed as "Not tracked in v1" unless detectable from data patterns (e.g., `resolved_at` changing)
- [ ] Each indicator shows a timestamp, relative age ("2 hours ago"), and a freshness badge (green/amber/red)

### Consolidated Alert Board
- [ ] Aggregates ALL alerts from across the admin dashboard into one prioritized view
- [ ] Priority levels with color coding:
  - **Critical** (red `#EF4444`): requires immediate attention
  - **High** (orange `#F97316`): should be addressed soon
  - **Medium** (yellow `#F59E0B`): worth monitoring
  - **Low** (blue `#3B82F6`): informational
- [ ] Alert definitions:
  - Critical: Fixture stuck in `completed` status for > 120 minutes (should have been resolved)
  - Critical: Edge function inferred errors (data state suggests function is not running)
  - High: Live fixture with stale data — `last_polled_at` > 2 minutes
  - High: Unseeded scenarios for fixtures starting within 12 hours
  - High: Missing cron runs (inferred from data — e.g., fixtures not synced in > 26h)
  - Medium: Pre-match sync not confirmed before fixture start time
  - Medium: Standings data mismatches (from ADM-009 checks, if available)
  - Low: Gang approaching member limit (18-19 of 20 approved members)
  - Low: User approaching gang limit (38-39 of 40 active gangs)
- [ ] Each alert shows: severity badge, description text, affected entity with link to the relevant admin detail page, time detected (relative)
- [ ] Alerts sorted by severity (critical first), then by time detected (newest first)
- [ ] Empty state: "All systems operational" message with a green checkmark icon
- [ ] Alert count badge in the section header: "ALERTS (3)"

### Layout
- [ ] Page title: "OPERATIONS" in admin header breadcrumb
- [ ] Edge function cards in a 3-column grid at the top
- [ ] Sportmonks API health section below edge functions
- [ ] Consolidated alert board as the largest section at the bottom
- [ ] All data fetched server-side via admin DAL functions

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── operations/
│               └── page.tsx
├── components/
│   └── admin/
│       └── operations/
│           ├── edge-function-cards.tsx
│           ├── edge-function-cards.stories.tsx
│           ├── sportmonks-health.tsx
│           ├── sportmonks-health.stories.tsx
│           ├── alert-board.tsx
│           ├── alert-board.stories.tsx
│           ├── alert-item.tsx
│           └── alert-item.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── operations.ts
```

---

## Technical Notes

### Operations Page
```tsx
// src/app/(admin)/admin/operations/page.tsx
import { EdgeFunctionCards } from '@/components/admin/operations/edge-function-cards'
import { SportmonksHealth } from '@/components/admin/operations/sportmonks-health'
import { AlertBoard } from '@/components/admin/operations/alert-board'
import {
  getEdgeFunctionHealth,
  getSportmonksHealth,
  getConsolidatedAlerts,
} from '@/lib/dal/admin/operations'

export default async function OperationsPage() {
  const [edgeFunctions, sportmonks, alerts] = await Promise.all([
    getEdgeFunctionHealth(),
    getSportmonksHealth(),
    getConsolidatedAlerts(),
  ])

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Operations
      </h1>
      <EdgeFunctionCards data={edgeFunctions} />
      <SportmonksHealth data={sportmonks} />
      <AlertBoard alerts={alerts} />
    </div>
  )
}
```

### Alert Type Definition
```typescript
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'

interface PlatformAlert {
  id: string                   // unique identifier for the alert
  severity: AlertSeverity
  title: string                // e.g., "Fixture stuck in completed"
  description: string          // e.g., "Match #42 (MI vs CSK) has been completed for 3 hours"
  entityType: 'fixture' | 'gang' | 'user' | 'scenario' | 'system'
  entityId?: string            // link target ID
  detailHref?: string          // e.g., "/admin/fixtures/42"
  detectedAt: string           // ISO timestamp
}
```

### Alert Severity Colors
```typescript
const severityConfig: Record<AlertSeverity, { color: string; label: string; order: number }> = {
  critical: { color: '#EF4444', label: 'CRITICAL', order: 0 },
  high:     { color: '#F97316', label: 'HIGH',     order: 1 },
  medium:   { color: '#F59E0B', label: 'MEDIUM',   order: 2 },
  low:      { color: '#3B82F6', label: 'LOW',      order: 3 },
}
```

### AlertItem Component
```tsx
// src/components/admin/operations/alert-item.tsx
interface AlertItemProps {
  alert: PlatformAlert
}

// Visual:
// - Left border colored by severity (4px)
// - Severity badge (pill) at top-left
// - Title + description
// - Right side: affected entity link + relative time
// - Background: #1A1A1A, hover: #222222
```

### DAL Functions
```typescript
// src/lib/dal/admin/operations.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function getEdgeFunctionHealth() {
  const supabase = createAdminClient()

  // sync-fixtures: check if most recent fixture updated_at is within 26h
  const { data: lastFixtureSync } = await supabase
    .from('v2_fixtures')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const syncAge = lastFixtureSync
    ? (Date.now() - new Date(lastFixtureSync.updated_at).getTime()) / (1000 * 60 * 60)
    : null

  // sync-fixtures-pre-match: check for upcoming fixtures within 30 min missing pre_match_synced
  const thirtyMinWindow = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const { count: unsyncedPreMatch } = await supabase
    .from('v2_fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('pre_match_synced', false)
    .lte('start_time', thirtyMinWindow)
    .gte('start_time', new Date().toISOString())

  // live-poll-resolve-fixtures: check live fixture staleness
  const { data: liveFixtures } = await supabase
    .from('v2_fixtures')
    .select('id, last_polled_at')
    .eq('status', 'live')

  const staleLive = (liveFixtures ?? []).filter(
    (f) => f.last_polled_at && (Date.now() - new Date(f.last_polled_at).getTime()) > 60_000
  )

  return {
    syncFixtures: {
      name: 'sync-fixtures',
      schedule: 'Every 24h at 02:00 UTC',
      description: 'Fetches fixtures from Sportmonks API',
      status: syncAge === null ? 'unknown' : syncAge <= 26 ? 'healthy' : 'unhealthy',
      lastSyncAge: syncAge,
    },
    syncPreMatch: {
      name: 'sync-fixtures-pre-match',
      schedule: '15 min before each match',
      description: 'Updates lineup and toss data',
      status: (unsyncedPreMatch ?? 0) === 0 ? 'healthy' : 'unhealthy',
      unsyncedCount: unsyncedPreMatch ?? 0,
    },
    livePoll: {
      name: 'live-poll-resolve-fixtures',
      schedule: 'Every 30s during live matches',
      description: 'Polls live scores and resolves scenarios',
      status: (liveFixtures?.length ?? 0) === 0
        ? 'no_live_fixtures'
        : staleLive.length === 0
          ? 'healthy'
          : 'unhealthy',
      liveFixtureCount: liveFixtures?.length ?? 0,
      staleCount: staleLive.length,
    },
  }
}

export async function getSportmonksHealth() {
  const supabase = createAdminClient()

  // Fixture data freshness
  const { data: lastFixture } = await supabase
    .from('v2_fixtures')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Player data freshness
  const { data: lastPlayer } = await supabase
    .from('v2_players')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Live score freshness
  const { data: latestPoll } = await supabase
    .from('v2_fixtures')
    .select('last_polled_at')
    .eq('status', 'live')
    .order('last_polled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    fixtureFreshness: lastFixture?.updated_at ?? null,
    playerFreshness: lastPlayer?.updated_at ?? null,
    liveScoreFreshness: latestPoll?.last_polled_at ?? null,
    dataRegressionEvents: null,    // Not tracked in v1
    reconciliationEvents: null,    // Not tracked in v1
  }
}

export async function getConsolidatedAlerts(): Promise<PlatformAlert[]> {
  const supabase = createAdminClient()
  const alerts: PlatformAlert[] = []
  const now = new Date()

  // Critical: Fixture stuck in completed > 120 min
  const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000).toISOString()
  const { data: stuckFixtures } = await supabase
    .from('v2_fixtures')
    .select('id, home_team_name, away_team_name, updated_at')
    .eq('status', 'completed')
    .lte('updated_at', twoHoursAgo)

  stuckFixtures?.forEach((f) => {
    alerts.push({
      id: `stuck-fixture-${f.id}`,
      severity: 'critical',
      title: 'Fixture stuck in completed',
      description: `${f.home_team_name} vs ${f.away_team_name} has been completed for over 2 hours without resolution`,
      entityType: 'fixture',
      entityId: String(f.id),
      detailHref: `/admin/fixtures/${f.id}`,
      detectedAt: f.updated_at,
    })
  })

  // High: Live fixture stale data > 2 min
  const { data: staleLive } = await supabase
    .from('v2_fixtures')
    .select('id, home_team_name, away_team_name, last_polled_at')
    .eq('status', 'live')

  staleLive?.filter(
    (f) => f.last_polled_at && (now.getTime() - new Date(f.last_polled_at).getTime()) > 2 * 60 * 1000
  ).forEach((f) => {
    alerts.push({
      id: `stale-live-${f.id}`,
      severity: 'high',
      title: 'Live fixture stale data',
      description: `${f.home_team_name} vs ${f.away_team_name} last polled ${f.last_polled_at}`,
      entityType: 'fixture',
      entityId: String(f.id),
      detailHref: `/admin/fixtures/${f.id}`,
      detectedAt: now.toISOString(),
    })
  })

  // High: Unseeded scenarios within 12h of match
  const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
  // This requires cross-referencing fixtures with gang_fixture_scenarios —
  // simplified here; full implementation checks for (gang, fixture) pairs missing scenarios

  // Medium: Pre-match sync unconfirmed before start
  const { data: unsyncedPreMatch } = await supabase
    .from('v2_fixtures')
    .select('id, home_team_name, away_team_name, start_time')
    .eq('pre_match_synced', false)
    .lte('start_time', new Date(now.getTime() + 30 * 60 * 1000).toISOString())
    .gte('start_time', now.toISOString())

  unsyncedPreMatch?.forEach((f) => {
    alerts.push({
      id: `prematch-unsync-${f.id}`,
      severity: 'medium',
      title: 'Pre-match sync unconfirmed',
      description: `${f.home_team_name} vs ${f.away_team_name} starts soon without pre-match sync`,
      entityType: 'fixture',
      entityId: String(f.id),
      detailHref: `/admin/fixtures/${f.id}`,
      detectedAt: now.toISOString(),
    })
  })

  // Low: Gang approaching member limit (18-19 of 20)
  // Requires counting approved members per gang — simplified
  // Full implementation: GROUP BY gang_id HAVING COUNT(*) >= 18

  // Low: User approaching gang limit (38-39 of 40)
  // Requires counting active gangs per user — simplified

  // Sort: severity order first, then newest first
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  alerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (sevDiff !== 0) return sevDiff
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  })

  return alerts
}
```

### Caching Consideration
The `getConsolidatedAlerts()` function runs multiple queries across several tables. Consider using Next.js `unstable_cache` or a short TTL (60 seconds) to avoid hammering the database on repeated page loads:
```typescript
import { unstable_cache } from 'next/cache'

const getCachedAlerts = unstable_cache(
  getConsolidatedAlerts,
  ['admin-consolidated-alerts'],
  { revalidate: 60 }
)
```

### Key Design Decisions
- All queries use the admin service role client from ADM-001 (bypasses RLS)
- Page is a Server Component — no client-side fetching
- Edge function health is INFERRED from data state in v1 — no invocation logs exist. This limitation is stated clearly in the UI.
- The alert board is a composition of queries that other admin pages also use individually; it aggregates them into a single prioritized view
- AlertItem is a reusable component used across severity levels with consistent layout and color-coded left borders
- Each alert links to the relevant admin detail page for quick drill-down
- The "All systems operational" empty state provides immediate reassurance

---

## Edge Cases

- No live fixtures → `live-poll-resolve-fixtures` shows neutral gray state, not green or red
- No fixtures at all (fresh deploy) → edge function health shows "unknown" state
- Alert board with zero alerts → "All systems operational" empty state
- Very many alerts (20+) → consider a scrollable container or "Show more" pattern
- Sportmonks API fields not tracked in v1 → explicitly show "Not tracked in v1" rather than hiding the row
- Fixture `updated_at` could be updated by non-sync operations (manual edits) — acknowledge this limitation in the UI tooltip

---

## Storybook Requirements

### EdgeFunctionCards Stories
- `AllHealthy` — all three edge functions green
- `SomeUnhealthy` — sync-fixtures stale (red), pre-match unhealthy (amber), live poll healthy (green)
- `Unknown` — no data available, all showing unknown/gray state

### SportmonksHealth Stories
- `Healthy` — all freshness indicators green, timestamps recent
- `Stale` — fixture sync 30+ hours old, live score stale
- `Unknown` — fresh deploy, no data available

### AlertBoard Stories
- `NoAlerts` — empty state with "All systems operational" message and green checkmark
- `CriticalAlerts` — 2 critical alerts (stuck fixtures) prominently displayed
- `MixedAlerts` — mix of critical, high, medium, and low alerts
- `ManyAlerts` — 15+ alerts to verify scrolling and sorting behavior

### AlertItem Stories
- `Critical` — red left border, red severity badge, fixture link
- `High` — orange left border, orange severity badge
- `Medium` — yellow left border, yellow severity badge
- `Low` — blue left border, blue severity badge

---

## Testing Requirements

- [ ] Unit test: `getEdgeFunctionHealth()` returns `healthy` when fixture sync is within 26h
- [ ] Unit test: `getEdgeFunctionHealth()` returns `unhealthy` when fixture sync exceeds 26h
- [ ] Unit test: `getEdgeFunctionHealth()` returns `no_live_fixtures` when no live fixtures exist
- [ ] Unit test: `getEdgeFunctionHealth()` returns `unhealthy` for stale live poll (>60s)
- [ ] Unit test: `getSportmonksHealth()` returns null for untracked v1 fields
- [ ] Unit test: `getConsolidatedAlerts()` returns empty array when no issues
- [ ] Unit test: `getConsolidatedAlerts()` includes stuck fixtures as critical alerts
- [ ] Unit test: `getConsolidatedAlerts()` sorts by severity then by time
- [ ] Unit test: AlertItem renders correct severity color and badge
- [ ] Unit test: AlertBoard renders empty state when no alerts
- [ ] Unit test: AlertBoard renders alert count in header

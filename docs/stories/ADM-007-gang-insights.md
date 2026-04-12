# ADM-007: Gang Insights

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Gang metrics, size distribution, activity, health indicators, gang detail lookup

---

## Description

Build the gang insights page at `/admin/gangs` — shows gang growth and size distribution, activity metrics, health indicators, and a gang detail lookup. The gang detail page at `/admin/gangs/[gangId]` shows full gang metadata, members, season enrollment, and standings. All data is fetched via the service role Supabase client through admin DAL functions.

---

## Acceptance Criteria

### Summary Metrics
- [ ] Cards: active gangs, deleted gangs, created today/this week, auto-accept enabled count, enrolled in active season count
- [ ] Each card uses the admin metric card pattern from ADM-001 layout

### Gang Size Distribution
- [ ] Histogram/chart: gang size buckets (1, 2-5, 6-10, 11-15, 16-20)
- [ ] Average and median approved members per gang
- [ ] Solo gangs count (1 member) — potential abandoned indicator
- [ ] Full gangs count (20 members) — at capacity
- [ ] Gangs with pending join requests count

### Gang Activity
- [ ] Gangs with predictions in last match (at least one member predicted)
- [ ] Average match participation per gang (% of members predicting per fixture)
- [ ] Inactive gangs: no predictions in last 3+ fixtures
- [ ] Gangs with custom prediction deadline (`prediction_deadline_mins != 45`)

### Gang Health Indicators
- [ ] Alert list:
  - Gangs with blocked members (`is_blocked = true`)
  - High churn gangs (many left/removed members)
  - Admin account deleted (`created_by` references deleted profile)
  - Not enrolled in active season
- [ ] Each alert shows gang name, invite code, and details

### Gang Detail Lookup
- [ ] Search by gang name or invite code
- [ ] Results shown in a table with clickable rows
- [ ] `/admin/gangs/[gangId]` detail page showing:
  - Metadata: name, invite_code, created_by, auto_accept, is_deleted, created_at
  - Members table: display_name, role, status, is_blocked, requested_at, approved_at, departed_at
  - League season enrollment: prediction_deadline_mins, is_active
  - Season standings: ranked member list (points, accuracy, matches predicted)
  - Per-fixture standings summary

### DAL Functions (`src/lib/dal/admin/gangs.ts`)
- [ ] `getGangMetrics()` — summary metric cards
- [ ] `getGangSizeDistribution()` — size buckets, averages, solo/full counts
- [ ] `getGangActivity()` — activity and participation metrics
- [ ] `getGangHealthAlerts()` — blocked members, churn, orphaned admins, unenrolled gangs
- [ ] `searchGangs(query: string)` — search by name or invite code
- [ ] `getGangDetail(gangId: string)` — full gang data with joins for members, enrollment, standings

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── gangs/
│               ├── page.tsx                          # Gang insights page
│               └── [gangId]/
│                   └── page.tsx                      # Gang detail page
├── components/
│   └── admin/
│       └── gangs/
│           ├── gang-metrics.tsx
│           ├── gang-metrics.stories.tsx
│           ├── gang-size-chart.tsx
│           ├── gang-size-chart.stories.tsx
│           ├── gang-activity-section.tsx
│           ├── gang-activity-section.stories.tsx
│           ├── gang-health-alerts.tsx
│           ├── gang-health-alerts.stories.tsx
│           ├── gang-search.tsx
│           ├── gang-search.stories.tsx
│           ├── gang-detail.tsx
│           └── gang-detail.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── gangs.ts
```

---

## Technical Notes

### Summary Metrics Queries
```typescript
export async function getGangMetrics() {
  const supabase = createAdminClient()

  // Active gangs
  const { count: activeCount } = await supabase
    .from('v2_gangs')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)

  // Deleted gangs
  const { count: deletedCount } = await supabase
    .from('v2_gangs')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', true)

  // Created today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: createdToday } = await supabase
    .from('v2_gangs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())

  // Auto-accept enabled
  const { count: autoAcceptCount } = await supabase
    .from('v2_gangs')
    .select('*', { count: 'exact', head: true })
    .eq('auto_accept', true)
    .eq('is_deleted', false)

  // Enrolled in active season: join v2_gang_league_seasons where is_active = true
  const { count: enrolledCount } = await supabase
    .from('v2_gang_league_seasons')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  return { activeCount, deletedCount, createdToday, autoAcceptCount, enrolledCount }
}
```

### Size Distribution Query
```typescript
export async function getGangSizeDistribution() {
  const supabase = createAdminClient()

  // Get approved member counts per gang
  const { data } = await supabase
    .from('v2_gang_members')
    .select('gang_id, v2_gangs!inner(is_deleted)')
    .eq('status', 'approved')
    .eq('v2_gangs.is_deleted', false)

  // Group by gang_id, count members, bucket into size ranges
  // Also compute: average, median, solo count (1), full count (20), pending requests count
  // Bucketing and stats done in application code after fetching raw counts
}
```

### Gang Search
```typescript
export async function searchGangs(query: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('v2_gangs')
    .select('id, name, invite_code, is_deleted, auto_accept, created_at')
    .or(`name.ilike.%${query}%,invite_code.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data
}
```

### Gang Detail Query
```typescript
export async function getGangDetail(gangId: string) {
  const supabase = createAdminClient()

  // Gang metadata
  const { data: gang } = await supabase
    .from('v2_gangs')
    .select('*')
    .eq('id', gangId)
    .single()

  // Members with profiles
  const { data: members } = await supabase
    .from('v2_gang_members')
    .select(`
      user_id, role, status, is_blocked, requested_at, approved_at, departed_at,
      v2_profiles (display_name)
    `)
    .eq('gang_id', gangId)
    .order('role', { ascending: true })

  // League season enrollment
  const { data: enrollment } = await supabase
    .from('v2_gang_league_seasons')
    .select('*, v2_league_seasons (name, season_year)')
    .eq('gang_id', gangId)

  // Season standings
  const { data: seasonStandings } = await supabase
    .from('v2_gang_season_standings')
    .select(`
      user_id, total_points, matches_predicted, accuracy_pct, rank,
      v2_profiles (display_name)
    `)
    .eq('gang_id', gangId)
    .order('rank', { ascending: true, nullsFirst: false })

  return { gang, members, enrollment, seasonStandings }
}
```

### Key Design Decisions
- Size distribution: use a simple CSS bar chart (no external chart library required). Each bucket is a horizontal bar with width proportional to count.
- Gang search: client-side component with debounced input (300ms). Uses a server action or route handler to call the DAL function.
- Gang detail: server component fetching all gang data with joins. Sub-sections (members, enrollment, standings) can use Suspense for independent loading.
- Health alerts: some queries are expensive (churn analysis requires scanning departed members). Use separate loading states per alert category.
- For "inactive gangs": check if any member of the gang has predictions for the last 3 resolved fixtures. Query `v2_predictions` joined with `v2_fixture_scenarios` for recent resolved fixtures.

---

## Edge Cases

- Deleted gangs should still be searchable and viewable in detail (with a "DELETED" badge)
- Gang where `created_by` references a deleted profile — show "Deleted User" placeholder
- Gangs with 0 approved members (all left/removed) — show in solo bucket as edge case
- Search with empty query returns nothing (not all gangs)
- Gang detail for non-existent `gangId` — show 404 / not found state

---

## Storybook Requirements

### GangMetrics Stories
- `Default` — typical metric values
- `HighGrowth` — high created-today and created-this-week numbers

### GangSizeChart Stories
- `Default` — mixed distribution across all buckets
- `MostlySolo` — majority of gangs are solo (1 member)
- `MostlyFull` — majority of gangs are full (20 members)

### GangActivitySection Stories
- `Active` — most gangs have recent predictions
- `Inactive` — many gangs flagged as inactive

### GangHealthAlerts Stories
- `NoAlerts` — all checks pass, no issues
- `WithAlerts` — multiple alert types present (blocked members, churn, orphaned admin, unenrolled)

### GangSearch Stories
- `Empty` — no search query entered
- `WithResults` — search results shown in table

### GangDetail Stories
- `ActiveGang` — active gang with members, enrollment, standings
- `DeletedGang` — deleted gang with "DELETED" badge
- `FullGang` — gang with 20/20 members, at capacity

---

## Testing Requirements

- [ ] Unit test: `getGangMetrics()` returns correct counts for active, deleted, auto-accept, enrolled gangs
- [ ] Unit test: `getGangSizeDistribution()` correctly buckets gangs by member count
- [ ] Unit test: `searchGangs()` matches by name (case-insensitive) and invite code
- [ ] Unit test: `searchGangs('')` returns empty array (not all gangs)
- [ ] Unit test: `getGangDetail()` returns gang metadata, members, enrollment, and standings
- [ ] Unit test: `getGangDetail()` for non-existent gang returns null/throws appropriately
- [ ] Unit test: `getGangHealthAlerts()` detects blocked members, high churn, orphaned admin, unenrolled gangs
- [ ] Unit test: `getGangActivity()` correctly identifies inactive gangs (no predictions in last 3 fixtures)

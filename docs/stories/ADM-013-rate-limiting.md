# ADM-013: Rate Limiting

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Rate limit table monitoring, active entries, users hitting limits

---

## Description

Build the rate limiting page at `/admin/rate-limits` — monitors the `v2_rate_limits` table, shows active entries, and identifies users hitting rate limits. Note: the app currently uses in-memory LRU rate limiting, so this table may have limited data until the table-based approach is activated. This page is read-only. All data is fetched server-side via the admin service role client through admin DAL functions.

---

## Acceptance Criteria

### Rate Limit Overview
- [ ] Cards: total entries in table, active entries (window_start within last hour), distinct users with active limits
- [ ] Note banner (amber background, info icon) explaining current in-memory vs table-based rate limiting status
- [ ] Each card uses the admin metric card pattern from ADM-002

### Active Rate Limit Entries
- [ ] Table showing: user_id, action, count, window_start, window_end (derived as window_start + 1 hour)
- [ ] Sorted by count descending (users closest to limits first)
- [ ] Highlight entries where count is close to or at the limit threshold (amber for >= 80% of limit, red for at limit)
- [ ] Show user `display_name` (joined from `v2_profiles`) with fallback to truncated UUID if profile not found
- [ ] Empty state when no active entries exist

### Rate Limit History
- [ ] Total entries over time (if enough data exists) — simple count display, not a chart
- [ ] Most rate-limited actions (GROUP BY action, ORDER BY total count DESC)
- [ ] Users most frequently rate-limited (GROUP BY user_id, ORDER BY total count DESC, top 10)
- [ ] Display known rate limit thresholds as a reference table (e.g., `create_gang: 10/hour`, `send_magic_link: 5/hour`, `submit_predictions: 20/hour`)

### Cleanup Status
- [ ] Last cleanup-rate-limits cron run: inferred from data age (oldest entry = rough indicator of last cleanup)
- [ ] Stale entries count: entries with `window_start` older than 24 hours (should have been cleaned by the `cleanup-rate-limits` cron)
- [ ] If stale entries exist, show amber alert indicating cleanup may not be running

### Layout
- [ ] Page title: "RATE LIMITS" in admin header breadcrumb
- [ ] Sections stacked vertically: Overview cards, Note banner, Active entries table, History section, Cleanup status
- [ ] All data fetched server-side via admin DAL functions

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── rate-limits/
│               └── page.tsx
├── components/
│   └── admin/
│       └── rate-limits/
│           ├── rate-limit-overview.tsx
│           ├── rate-limit-overview.stories.tsx
│           ├── active-limits-table.tsx
│           ├── active-limits-table.stories.tsx
│           ├── rate-limit-history.tsx
│           └── rate-limit-history.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── rate-limits.ts
```

---

## Technical Notes

### Rate Limits Page
```tsx
// src/app/(admin)/admin/rate-limits/page.tsx
import { RateLimitOverview } from '@/components/admin/rate-limits/rate-limit-overview'
import { ActiveLimitsTable } from '@/components/admin/rate-limits/active-limits-table'
import { RateLimitHistory } from '@/components/admin/rate-limits/rate-limit-history'
import {
  getRateLimitOverview,
  getActiveLimits,
  getRateLimitHistory,
} from '@/lib/dal/admin/rate-limits'

export default async function RateLimitsPage() {
  const [overview, activeLimits, history] = await Promise.all([
    getRateLimitOverview(),
    getActiveLimits(),
    getRateLimitHistory(),
  ])

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Rate Limits
      </h1>
      <RateLimitOverview data={overview} />
      <ActiveLimitsTable entries={activeLimits} />
      <RateLimitHistory data={history} />
    </div>
  )
}
```

### Known Rate Limit Thresholds
```typescript
// Reference data displayed in the history section
const KNOWN_THRESHOLDS: Record<string, { limit: number; window: string }> = {
  create_gang:         { limit: 10, window: '1 hour' },
  send_magic_link:     { limit: 5,  window: '1 hour' },
  submit_predictions:  { limit: 20, window: '1 hour' },
  join_gang:           { limit: 10, window: '1 hour' },
  create_prediction:   { limit: 30, window: '1 hour' },
} as const

// Used to determine highlight thresholds:
// - count >= limit → red row
// - count >= limit * 0.8 → amber row
// - else → default
```

### DAL Functions
```typescript
// src/lib/dal/admin/rate-limits.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function getRateLimitOverview() {
  const supabase = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Total entries
  const { count: totalEntries } = await supabase
    .from('v2_rate_limits')
    .select('*', { count: 'exact', head: true })

  // Active entries (window_start within last hour)
  const { count: activeEntries } = await supabase
    .from('v2_rate_limits')
    .select('*', { count: 'exact', head: true })
    .gte('window_start', oneHourAgo)

  // Distinct users with active limits
  const { data: activeUsers } = await supabase
    .from('v2_rate_limits')
    .select('user_id')
    .gte('window_start', oneHourAgo)

  const distinctActiveUsers = new Set(activeUsers?.map((r) => r.user_id)).size

  // Stale entries (window_start older than 24 hours — should have been cleaned)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: staleEntries } = await supabase
    .from('v2_rate_limits')
    .select('*', { count: 'exact', head: true })
    .lt('window_start', twentyFourHoursAgo)

  return {
    totalEntries: totalEntries ?? 0,
    activeEntries: activeEntries ?? 0,
    distinctActiveUsers,
    staleEntries: staleEntries ?? 0,
  }
}

export async function getActiveLimits() {
  const supabase = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Active entries with profile join for display_name
  const { data, error } = await supabase
    .from('v2_rate_limits')
    .select('user_id, action, count, window_start, v2_profiles (display_name)')
    .gte('window_start', oneHourAgo)
    .order('count', { ascending: false })
    .limit(100)

  if (error) throw error
  return data ?? []
}

export async function getRateLimitHistory() {
  const supabase = createAdminClient()

  // Most rate-limited actions
  const { data: allEntries } = await supabase
    .from('v2_rate_limits')
    .select('user_id, action, count')

  // Group by action
  const actionCounts: Record<string, number> = {}
  const userCounts: Record<string, number> = {}
  allEntries?.forEach((entry) => {
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + entry.count
    userCounts[entry.user_id] = (userCounts[entry.user_id] || 0) + entry.count
  })

  const topActions = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const topUserIds = Object.entries(userCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([userId]) => userId)

  // Fetch display names for top users
  const { data: topUserProfiles } = await supabase
    .from('v2_profiles')
    .select('id, display_name')
    .in('id', topUserIds)

  const topUsers = topUserIds.map((userId) => ({
    userId,
    displayName: topUserProfiles?.find((p) => p.id === userId)?.display_name ?? null,
    totalCount: userCounts[userId],
  }))

  return {
    totalEntries: allEntries?.length ?? 0,
    topActions,
    topUsers,
  }
}
```

### Table Schema Reference
The `v2_rate_limits` table (migration `20260408000015`):
```sql
CREATE TABLE v2_rate_limits (
  user_id      UUID        NOT NULL,
  action       TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, window_start)
);
```
- No `window_end` column — derive as `window_start + 1 hour` for display
- Cleanup cron runs daily at 03:00 UTC, deletes rows older than 24 hours
- Index exists on `window_start` for cleanup query performance

### Key Design Decisions
- All queries use the admin service role client from ADM-001 (bypasses RLS)
- Page is a Server Component — no client-side fetching
- The note banner about in-memory vs table-based rate limiting is important context for admins who may see zero data
- History aggregation is done in application code since the table has no pre-aggregated views
- Active entries table uses shadcn/ui Table component with row highlighting via conditional classes
- Threshold reference table is hardcoded from app constants — update if thresholds change in code

---

## Edge Cases

- Empty table (most likely at launch) — show meaningful empty states explaining the in-memory rate limiting status
- Stale entries present after 24 hours — indicate cleanup cron may not be running
- User profile deleted but rate limit entries remain — show truncated UUID with "Deleted User" label
- Very large table (thousands of entries) — `getActiveLimits()` is capped at 100 rows; history uses full scan (acceptable given expected low volume)
- Action names not in known thresholds — display without highlight (unknown threshold)

---

## Storybook Requirements

### RateLimitOverview Stories
- `NoData` — all metrics at zero, note banner explaining in-memory rate limiting
- `WithActiveEntries` — non-zero metrics showing active rate limiting data

### ActiveLimitsTable Stories
- `Empty` — no active rate limit entries, empty state message
- `WithEntries` — several entries with varying counts and actions
- `NearLimit` — entries where count is at or near the known threshold (amber/red highlighting)

### RateLimitHistory Stories
- `NoHistory` — no entries in the table, empty message
- `WithHistory` — top actions and top users displayed with counts, threshold reference table shown

---

## Testing Requirements

- [ ] Unit test: `getRateLimitOverview()` returns correct counts for total, active, distinct users, and stale entries
- [ ] Unit test: `getRateLimitOverview()` returns all zeros when table is empty
- [ ] Unit test: `getActiveLimits()` returns entries sorted by count descending
- [ ] Unit test: `getActiveLimits()` only returns entries with `window_start` within the last hour
- [ ] Unit test: `getActiveLimits()` joins `display_name` from `v2_profiles`
- [ ] Unit test: `getRateLimitHistory()` correctly groups entries by action and user
- [ ] Unit test: `getRateLimitHistory()` returns top 10 actions and top 10 users
- [ ] Unit test: RateLimitOverview renders note banner about in-memory rate limiting
- [ ] Unit test: ActiveLimitsTable highlights rows at or near threshold (red at limit, amber at 80%)
- [ ] Unit test: ActiveLimitsTable renders empty state when no entries

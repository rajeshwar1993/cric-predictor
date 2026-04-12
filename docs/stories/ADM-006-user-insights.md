# ADM-006: User Insights

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** User metrics, growth chart, activity metrics, retention signals, user detail lookup

---

## Description

Build the user insights page at `/admin/users` — shows user growth and activity metrics, retention signals, and provides a user detail lookup for support and debugging. The user detail page (`/admin/users/[userId]`) shows a complete view of a single user's profile, gang memberships, prediction stats, and recent activity. This page is essential for understanding user behavior, identifying engagement issues, and supporting individual users.

---

## Acceptance Criteria

### Summary Metrics (`src/components/admin/users/user-metrics.tsx`)
- [ ] Stat cards row:
  - Total Registered (count of all `v2_profiles`)
  - Active (where `onboarding_completed = true AND is_deleted = false`)
  - Not Onboarded (where `onboarding_completed = false AND is_deleted = false`)
  - Deleted Accounts (where `is_deleted = true`)
- [ ] Users by terms version: grouped counts (e.g., "v2.0: 342, v1.0: 15, NULL: 3")
- [ ] Users who predicted at least once vs never predicted (count of distinct `user_id` in `v2_predictions` vs total active users)

### User Growth (`src/components/admin/users/user-growth-chart.tsx`)
- [ ] Daily signups chart: line or bar chart over time based on `v2_profiles.created_at`
- [ ] Cumulative user count line overlaid on the daily chart
- [ ] Default view: last 30 days
- [ ] Date range picker to adjust the window (e.g., "Last 7 days", "Last 30 days", "All time")
- [ ] Onboarding completion rate per cohort: for each day's signups, what % completed onboarding
- [ ] Chart rendered client-side (needs interactivity for hover tooltips and date range)

### User Activity (`src/components/admin/users/user-activity-section.tsx`)
- [ ] Active today: distinct users with predictions submitted today (by `submitted_at`)
- [ ] Active this week: distinct users with predictions submitted in the last 7 days
- [ ] Average scenarios predicted per user per fixture: across all fixtures where the user participated, average of `predicted_count` from `v2_gang_fixture_standings` (out of 19 max)
- [ ] Multi-gang user distribution: count of users in 1 gang, 2 gangs, 3+ gangs (from `v2_gang_members` where `status = 'approved'`)
- [ ] Users approaching 40-gang limit: count of users with 38–39 approved gang memberships (approaching the max of 40)

### Retention Signals (`src/components/admin/users/user-retention-section.tsx`)
- [ ] Match participation rate per fixture: for the last 10 fixtures, show (users who predicted / total approved members across all gangs with this fixture), displayed as a mini bar chart or table
- [ ] Gang joiners who never predicted: count of users in `v2_gang_members` (status = 'approved') who have zero rows in `v2_predictions`
- [ ] Days from signup to first prediction: average and distribution (histogram bins: 0 days, 1 day, 2-3 days, 4-7 days, 8+ days)
- [ ] Account deletion trend: count of deletions per week over the last 8 weeks

### User Detail Lookup (`/admin/users` — search on the listing page)
- [ ] Search input: search by email, display_name, or user_id (UUID)
- [ ] Debounced input (300ms) triggers server-side search
- [ ] Results table: display_name, email, onboarding status, is_deleted, created_at
- [ ] Click row navigates to `/admin/users/[userId]`
- [ ] Empty state: "No users found" when search returns no results
- [ ] Default state: "Search for a user by email, name, or ID" before any search

### User Detail Page (`/admin/users/[userId]`)
- [ ] Profile info card: display_name, email, date_of_birth, terms_version, terms_accepted_at, onboarding_completed, is_deleted, deleted_at, created_at
- [ ] Gang memberships table: gang name, gang_id, role, status, joined_at (from `v2_gang_members.created_at` — note: no explicit joined_at column, use created_at or the row's existence)
- [ ] Prediction stats per gang: from `v2_gang_season_standings` — total_points, matches_predicted, total_correct, total_resolved, accuracy_pct, rank
- [ ] Recent predictions: last 20 predictions with columns: fixture match # + teams, scenario slug, value, is_correct (check/x/pending), points_earned, submitted_at
- [ ] Back button to return to `/admin/users`

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── users/
│               ├── page.tsx                          # Metrics + search
│               └── [userId]/
│                   └── page.tsx                      # User detail page
├── components/
│   └── admin/
│       └── users/
│           ├── user-metrics.tsx
│           ├── user-metrics.stories.tsx
│           ├── user-growth-chart.tsx
│           ├── user-growth-chart.stories.tsx
│           ├── user-activity-section.tsx
│           ├── user-activity-section.stories.tsx
│           ├── user-retention-section.tsx
│           ├── user-retention-section.stories.tsx
│           ├── user-search.tsx
│           ├── user-search.stories.tsx
│           ├── user-detail.tsx
│           └── user-detail.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── users.ts
```

---

## Technical Notes

### Users Listing Page
```tsx
// src/app/(admin)/admin/users/page.tsx
import { Suspense } from 'react'
import { getUserMetrics, getUserGrowth, getUserActivity, getRetentionSignals } from '@/lib/dal/admin/users'
import { UserMetrics } from '@/components/admin/users/user-metrics'
import { UserGrowthChart } from '@/components/admin/users/user-growth-chart'
import { UserActivitySection } from '@/components/admin/users/user-activity-section'
import { UserRetentionSection } from '@/components/admin/users/user-retention-section'
import { UserSearch } from '@/components/admin/users/user-search'

export default async function UsersPage() {
  const [metrics, growth, activity, retention] = await Promise.all([
    getUserMetrics(),
    getUserGrowth(),
    getUserActivity(),
    getRetentionSignals(),
  ])

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        User Insights
      </h1>
      <UserMetrics data={metrics} />
      <UserGrowthChart data={growth} />
      <UserActivitySection data={activity} />
      <UserRetentionSection data={retention} />
      <UserSearch />
    </div>
  )
}
```

### User Detail Page
```tsx
// src/app/(admin)/admin/users/[userId]/page.tsx
import { getUserDetail } from '@/lib/dal/admin/users'
import { UserDetail } from '@/components/admin/users/user-detail'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function UserDetailPage({ params }: { params: { userId: string } }) {
  const user = await getUserDetail(params.userId)
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>
      <UserDetail user={user} />
    </div>
  )
}
```

### DAL Functions (`src/lib/dal/admin/users.ts`)
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

interface UserMetricsData {
  totalRegistered: number
  active: number
  notOnboarded: number
  deleted: number
  byTermsVersion: Record<string, number>
  predictedAtLeastOnce: number
  neverPredicted: number
}

export async function getUserMetrics(): Promise<UserMetricsData> {
  const supabase = createAdminClient()

  const { data: profiles, error } = await supabase
    .from('v2_profiles')
    .select('onboarding_completed, is_deleted, terms_version')

  if (error) throw error

  const totalRegistered = profiles.length
  const active = profiles.filter(p => p.onboarding_completed && !p.is_deleted).length
  const notOnboarded = profiles.filter(p => !p.onboarding_completed && !p.is_deleted).length
  const deleted = profiles.filter(p => p.is_deleted).length

  // Group by terms_version
  const byTermsVersion: Record<string, number> = {}
  for (const p of profiles) {
    const version = p.terms_version ?? 'NULL'
    byTermsVersion[version] = (byTermsVersion[version] ?? 0) + 1
  }

  // Users who have predicted at least once
  const { count: predictedCount } = await supabase
    .from('v2_predictions')
    .select('user_id', { count: 'exact', head: true })
    // Need distinct user_id — use a different approach
  // Alternative: use RPC or aggregate in app code

  return { totalRegistered, active, notOnboarded, deleted, byTermsVersion, predictedAtLeastOnce: 0, neverPredicted: 0 }
}

export async function getUserGrowth(days: number = 30) {
  const supabase = createAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('v2_profiles')
    .select('created_at, onboarding_completed')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw error

  // Group by date, compute daily signups and cumulative count
  const dailyMap = new Map<string, { signups: number; onboarded: number }>()
  for (const profile of data) {
    const date = new Date(profile.created_at).toISOString().split('T')[0]
    const entry = dailyMap.get(date) ?? { signups: 0, onboarded: 0 }
    entry.signups++
    if (profile.onboarding_completed) entry.onboarded++
    dailyMap.set(date, entry)
  }

  // Get total count before the window for cumulative base
  const { count: baseBefore } = await supabase
    .from('v2_profiles')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', since.toISOString())

  return {
    daily: Array.from(dailyMap.entries()).map(([date, counts]) => ({ date, ...counts })),
    cumulativeBase: baseBefore ?? 0,
  }
}

export async function getUserActivity() {
  const supabase = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Active today — distinct users with predictions submitted today
  const { data: todayPredictions } = await supabase
    .from('v2_predictions')
    .select('user_id')
    .gte('submitted_at', todayStart)

  const activeToday = new Set(todayPredictions?.map(p => p.user_id)).size

  // Active this week
  const { data: weekPredictions } = await supabase
    .from('v2_predictions')
    .select('user_id')
    .gte('submitted_at', weekAgo)

  const activeThisWeek = new Set(weekPredictions?.map(p => p.user_id)).size

  // Multi-gang distribution
  const { data: memberships } = await supabase
    .from('v2_gang_members')
    .select('user_id')
    .eq('status', 'approved')

  const gangCounts = new Map<string, number>()
  for (const m of memberships ?? []) {
    gangCounts.set(m.user_id, (gangCounts.get(m.user_id) ?? 0) + 1)
  }

  const distribution = { oneGang: 0, twoGangs: 0, threePlus: 0, nearLimit: 0 }
  for (const count of gangCounts.values()) {
    if (count === 1) distribution.oneGang++
    else if (count === 2) distribution.twoGangs++
    else distribution.threePlus++
    if (count >= 38) distribution.nearLimit++
  }

  return { activeToday, activeThisWeek, gangDistribution: distribution }
}

export async function getRetentionSignals() {
  const supabase = createAdminClient()

  // Match participation rate for last 10 fixtures
  // Gang joiners who never predicted
  // Days from signup to first prediction
  // Account deletion trend

  return { /* ... */ }
}

export async function searchUsers(query: string) {
  const supabase = createAdminClient()

  // Search by email, display_name, or user_id
  // UUID format check: if query matches UUID pattern, search by id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)

  if (isUuid) {
    const { data } = await supabase
      .from('v2_profiles')
      .select('id, display_name, email, onboarding_completed, is_deleted, created_at')
      .eq('id', query)
    return data ?? []
  }

  // Search by email or display_name (case-insensitive)
  const { data } = await supabase
    .from('v2_profiles')
    .select('id, display_name, email, onboarding_completed, is_deleted, created_at')
    .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getUserDetail(userId: string) {
  const supabase = createAdminClient()

  // Profile
  const { data: profile, error: profileError } = await supabase
    .from('v2_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) return null

  // Gang memberships
  const { data: memberships } = await supabase
    .from('v2_gang_members')
    .select(`
      gang_id, role, status, created_at,
      v2_gangs (name, is_deleted)
    `)
    .eq('user_id', userId)

  // Season standings per gang
  const { data: standings } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id, total_points, matches_predicted, total_correct, total_resolved, accuracy_pct, rank')
    .eq('user_id', userId)

  // Recent predictions (last 20)
  const { data: predictions } = await supabase
    .from('v2_predictions')
    .select(`
      value, is_correct, points_earned, submitted_at,
      v2_fixture_scenarios (slug),
      v2_league_season_fixtures (
        match_number,
        home_team:v2_league_teams!home_team_id (code),
        away_team:v2_league_teams!away_team_id (code)
      )
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(20)

  return {
    profile,
    memberships: memberships ?? [],
    standings: standings ?? [],
    predictions: predictions ?? [],
  }
}
```

### User Search Component (Client Component)
```tsx
'use client'
import { useState, useTransition } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function UserSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isPending, startTransition] = useTransition()
  const debouncedQuery = useDebounce(query, 300)

  // Effect: when debouncedQuery changes, call search server action
  // Navigate to /admin/users/[userId] on row click

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="Search by email, name, or user ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      {/* Results table or empty/default state */}
    </div>
  )
}
```

### Chart Implementation
```tsx
// User growth chart uses a lightweight approach.
// Option A: recharts (if already in dependencies)
// Option B: Simple CSS-based bar chart (admin-only, no need for polish)
//
// Since this is admin-only and read-only, a simple CSS bar approach works:
function DailySignupBar({ count, maxCount }: { count: number; maxCount: number }) {
  const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-neutral-400">{count}</span>
      <div className="w-6 rounded-t bg-[#C8E64A]" style={{ height: `${heightPct}%` }} />
    </div>
  )
}
```

### Key Design Decisions
- Metrics and growth data are fetched server-side in parallel
- User search is a client component with debounced input calling a server action
- User detail page is a full server component — no client interactivity needed
- Growth chart defaults to 30 days but supports a date range picker (client component)
- Multi-gang distribution counts use in-memory grouping from a single `v2_gang_members` query (faster than N subqueries)
- `searchUsers()` checks for UUID format first to enable direct ID lookup
- Retention signals section may be expensive — consider Suspense boundary with loading state
- For "predicted at least once" count: query distinct `user_id` from `v2_predictions` and compare against active user count

---

## Storybook Requirements

### UserMetrics Stories
- `Default` — healthy user base: 500 registered, 450 active, 30 not onboarded, 20 deleted
- `WithDeletedAccounts` — higher deletion rate: 100 deleted, highlighting churn
- `EarlyStage` — small user base: 15 registered, 10 active
- `Loading` — skeleton state

### UserGrowthChart Stories
- `GrowingFast` — steep upward trend in daily signups
- `Stable` — consistent flat daily signups
- `Empty` — no signups in the selected period
- `AllTime` — full history from day one

### UserActivitySection Stories
- `HighActivity` — many active users today and this week, balanced gang distribution
- `LowActivity` — few active users, most users in only 1 gang
- `NearLimitUsers` — 3 users approaching the 40-gang limit

### UserRetentionSection Stories
- `HealthyRetention` — high participation rates, low deletion trend
- `ChurnWarning` — declining participation, rising deletions, many never-predicted joiners
- `NewSeason` — only 2 fixtures played, limited data

### UserSearch Stories
- `Empty` — default state before any search ("Search for a user...")
- `WithResults` — search results showing 5 matching users
- `NoResults` — search executed but no matches found
- `Loading` — search in progress with loading indicator

### UserDetail Stories
- `ActiveUser` — fully onboarded, 3 gangs, recent predictions, good accuracy
- `DeletedUser` — `is_deleted = true`, greyed out styling, historical data still shown
- `NeverPredicted` — onboarded, joined 2 gangs, zero predictions
- `PowerUser` — 10+ gangs, high accuracy, many predictions

---

## Testing Requirements

- [ ] Unit test: `getUserMetrics()` correctly computes active, not-onboarded, deleted counts
- [ ] Unit test: `getUserMetrics()` groups users by terms_version including NULL
- [ ] Unit test: `getUserMetrics()` computes predicted-at-least-once vs never-predicted
- [ ] Unit test: `getUserGrowth()` groups signups by date correctly
- [ ] Unit test: `getUserGrowth()` computes cumulative base count from before the window
- [ ] Unit test: `getUserGrowth()` computes onboarding completion rate per cohort
- [ ] Unit test: `getUserActivity()` counts distinct active users for today and this week
- [ ] Unit test: `getUserActivity()` computes multi-gang distribution (1, 2, 3+ gangs)
- [ ] Unit test: `getUserActivity()` detects users near 40-gang limit
- [ ] Unit test: `getRetentionSignals()` computes match participation rate per fixture
- [ ] Unit test: `getRetentionSignals()` counts gang joiners who never predicted
- [ ] Unit test: `getRetentionSignals()` computes days from signup to first prediction
- [ ] Unit test: `getRetentionSignals()` computes account deletion trend per week
- [ ] Unit test: `searchUsers()` finds user by exact UUID
- [ ] Unit test: `searchUsers()` finds users by partial email (case-insensitive)
- [ ] Unit test: `searchUsers()` finds users by partial display_name (case-insensitive)
- [ ] Unit test: `searchUsers()` returns empty array for no matches
- [ ] Unit test: `searchUsers()` limits results to 20
- [ ] Unit test: `getUserDetail()` returns profile, memberships, standings, and predictions
- [ ] Unit test: `getUserDetail()` returns null for non-existent user ID
- [ ] Unit test: `getUserDetail()` resolves gang names and team codes in predictions

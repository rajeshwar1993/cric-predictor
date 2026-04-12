# ADM-014: Moderation & Support

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Blocked users, deleted accounts, deleted gangs, pending join requests, member departures

---

## Description

Build the moderation & support page at `/admin/moderation` — provides views into blocked users, deleted accounts/gangs, stale pending join requests, and member departure patterns. Essential for support debugging and detecting abuse. The page is organized into 5 tabbed sub-sections using shadcn/ui Tabs. All data is read-only, fetched server-side via the admin service role client through admin DAL functions.

---

## Acceptance Criteria

### Blocked Users
- [ ] Table: all `v2_gang_members WHERE is_blocked = true`
- [ ] Columns: user display_name, user email, gang name, blocked by (gang admin display_name), blocked since (`departed_at` or status change timestamp)
- [ ] Link to user detail page (`/admin/users/[userId]`) and gang detail page (`/admin/gangs/[gangId]`)
- [ ] Empty state: "No blocked users" with shield icon

### Deleted Accounts
- [ ] Table: `v2_profiles WHERE is_deleted = true ORDER BY deleted_at DESC`
- [ ] Columns: display_name, email, deleted_at, gangs affected count (gangs where user was a member), auto-promotion events triggered (gangs where user was admin and a new admin was promoted)
- [ ] Show last 50 by default with pagination (shadcn/ui pagination, 50 per page)
- [ ] Link to user detail page (`/admin/users/[userId]`) even for deleted users
- [ ] Empty state: "No deleted accounts" with user-x icon

### Deleted Gangs
- [ ] Table: `v2_gangs WHERE is_deleted = true ORDER BY deleted_at DESC`
- [ ] Columns: name, created_by (display_name from joined profile), deleted_at, member count at deletion (count of all `v2_gang_members` for that gang regardless of status), deletion trigger badge
- [ ] Deletion trigger logic: if `v2_gangs.created_by` references a deleted profile AND the gang was deleted within 5 minutes of the profile `deleted_at` → "Cascade" badge (purple). Otherwise → "Admin Action" badge (blue).
- [ ] Show last 50 by default with pagination
- [ ] Empty state: "No deleted gangs" with shield-off icon

### Pending Join Requests
- [ ] Table: `v2_gang_members WHERE status = 'pending'` across all gangs
- [ ] Columns: user display_name, gang name, gang admin display_name (the `role = 'admin'` member of the gang), requested_at, age of request (relative time)
- [ ] Flag stale requests: pending > 7 days (amber background), pending > 14 days (red background)
- [ ] Sorted by age (oldest first, i.e., `requested_at ASC`)
- [ ] Show relative time ("3 days ago", "2 weeks ago") with absolute timestamp on hover (title attribute)
- [ ] Empty state: "No pending requests" with inbox icon

### Member Departures
- [ ] Table: `v2_gang_members WHERE status IN ('left', 'removed') ORDER BY departed_at DESC`
- [ ] Columns: user display_name, gang name, status badge (left = gray, removed = red), departed_at
- [ ] Pattern detection: gangs losing members frequently (>3 departures in last 30 days) shown as "High Churn" alert section above the table
- [ ] High churn gangs: gang name, departure count, link to gang detail page
- [ ] Show last 50 by default with pagination
- [ ] Empty state: "No member departures" with user-minus icon

### Tab Navigation
- [ ] shadcn/ui Tabs with 5 tabs: Blocked Users, Deleted Accounts, Deleted Gangs, Pending Requests, Departures
- [ ] Each tab shows count badge (total items in that tab)
- [ ] Default active tab: Blocked Users
- [ ] Tab state preserved in URL search params (e.g., `?tab=deleted-accounts`)

### Layout
- [ ] Page title: "MODERATION" in admin header breadcrumb
- [ ] Tabs below the title, content area below tabs
- [ ] All data fetched server-side via admin DAL functions

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── moderation/
│               └── page.tsx
├── components/
│   └── admin/
│       └── moderation/
│           ├── blocked-users-table.tsx
│           ├── blocked-users-table.stories.tsx
│           ├── deleted-accounts-table.tsx
│           ├── deleted-accounts-table.stories.tsx
│           ├── deleted-gangs-table.tsx
│           ├── deleted-gangs-table.stories.tsx
│           ├── pending-requests-table.tsx
│           ├── pending-requests-table.stories.tsx
│           ├── member-departures-table.tsx
│           ├── member-departures-table.stories.tsx
│           ├── moderation-tabs.tsx
│           └── moderation-tabs.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── moderation.ts
```

---

## Technical Notes

### Moderation Page
```tsx
// src/app/(admin)/admin/moderation/page.tsx
import { ModerationTabs } from '@/components/admin/moderation/moderation-tabs'
import {
  getBlockedUsers,
  getDeletedAccounts,
  getDeletedGangs,
  getPendingRequests,
  getMemberDepartures,
  getHighChurnGangs,
  getModerationCounts,
} from '@/lib/dal/admin/moderation'

interface ModerationPageProps {
  searchParams: Promise<{ tab?: string; page?: string }>
}

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  const { tab = 'blocked-users', page = '1' } = await searchParams
  const currentPage = parseInt(page, 10)

  const [counts, blockedUsers, deletedAccounts, deletedGangs, pendingRequests, departures, highChurnGangs] =
    await Promise.all([
      getModerationCounts(),
      getBlockedUsers(),
      getDeletedAccounts(currentPage),
      getDeletedGangs(currentPage),
      getPendingRequests(),
      getMemberDepartures(currentPage),
      getHighChurnGangs(),
    ])

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Moderation
      </h1>
      <ModerationTabs
        activeTab={tab}
        counts={counts}
        blockedUsers={blockedUsers}
        deletedAccounts={deletedAccounts}
        deletedGangs={deletedGangs}
        pendingRequests={pendingRequests}
        departures={departures}
        highChurnGangs={highChurnGangs}
        currentPage={currentPage}
      />
    </div>
  )
}
```

### DAL Functions
```typescript
// src/lib/dal/admin/moderation.ts
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 50

export async function getModerationCounts() {
  const supabase = createAdminClient()

  const [blocked, deletedAccounts, deletedGangs, pending, departures] = await Promise.all([
    supabase
      .from('v2_gang_members')
      .select('*', { count: 'exact', head: true })
      .eq('is_blocked', true),
    supabase
      .from('v2_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', true),
    supabase
      .from('v2_gangs')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', true),
    supabase
      .from('v2_gang_members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('v2_gang_members')
      .select('*', { count: 'exact', head: true })
      .in('status', ['left', 'removed']),
  ])

  return {
    blockedUsers: blocked.count ?? 0,
    deletedAccounts: deletedAccounts.count ?? 0,
    deletedGangs: deletedGangs.count ?? 0,
    pendingRequests: pending.count ?? 0,
    memberDepartures: departures.count ?? 0,
  }
}

export async function getBlockedUsers() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('v2_gang_members')
    .select(`
      gang_id, user_id, departed_at,
      v2_profiles!user_id (display_name, email),
      v2_gangs!gang_id (name)
    `)
    .eq('is_blocked', true)

  if (error) throw error

  // For each blocked user, find the gang admin (role = 'admin', status = 'approved')
  const gangIds = [...new Set(data?.map((d) => d.gang_id) ?? [])]
  const { data: gangAdmins } = await supabase
    .from('v2_gang_members')
    .select('gang_id, v2_profiles!user_id (display_name)')
    .in('gang_id', gangIds)
    .eq('role', 'admin')
    .eq('status', 'approved')

  return (data ?? []).map((entry) => ({
    ...entry,
    gangAdmin: gangAdmins?.find((a) => a.gang_id === entry.gang_id)?.v2_profiles ?? null,
  }))
}

export async function getDeletedAccounts(page: number = 1) {
  const supabase = createAdminClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('v2_profiles')
    .select('id, display_name, email, deleted_at', { count: 'exact' })
    .eq('is_deleted', true)
    .order('deleted_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  // For each deleted user, count affected gangs
  const userIds = data?.map((d) => d.id) ?? []
  const { data: membershipData } = await supabase
    .from('v2_gang_members')
    .select('user_id, gang_id, role')
    .in('user_id', userIds)

  const enriched = (data ?? []).map((profile) => {
    const memberships = membershipData?.filter((m) => m.user_id === profile.id) ?? []
    const gangsAffected = memberships.length
    const adminGangs = memberships.filter((m) => m.role === 'admin').length
    return { ...profile, gangsAffected, autoPromotionEvents: adminGangs }
  })

  return { data: enriched, total: count ?? 0, page, pageSize: PAGE_SIZE }
}

export async function getDeletedGangs(page: number = 1) {
  const supabase = createAdminClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('v2_gangs')
    .select('id, name, created_by, deleted_at, v2_profiles!created_by (display_name, is_deleted, deleted_at)', { count: 'exact' })
    .eq('is_deleted', true)
    .order('deleted_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  // For each deleted gang, count total members (all statuses)
  const gangIds = data?.map((d) => d.id) ?? []
  const { data: memberCounts } = await supabase
    .from('v2_gang_members')
    .select('gang_id')
    .in('gang_id', gangIds)

  const enriched = (data ?? []).map((gang) => {
    const memberCount = memberCounts?.filter((m) => m.gang_id === gang.id).length ?? 0
    const creator = gang.v2_profiles
    // Deletion trigger: cascade if creator is deleted and gang deleted within 5 min of profile deletion
    let deletionTrigger: 'cascade' | 'admin_action' = 'admin_action'
    if (
      creator &&
      'is_deleted' in creator &&
      creator.is_deleted &&
      gang.deleted_at &&
      'deleted_at' in creator &&
      creator.deleted_at
    ) {
      const gangDeletedAt = new Date(gang.deleted_at).getTime()
      const profileDeletedAt = new Date(creator.deleted_at as string).getTime()
      if (Math.abs(gangDeletedAt - profileDeletedAt) < 5 * 60 * 1000) {
        deletionTrigger = 'cascade'
      }
    }
    return { ...gang, memberCount, deletionTrigger }
  })

  return { data: enriched, total: count ?? 0, page, pageSize: PAGE_SIZE }
}

export async function getPendingRequests() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('v2_gang_members')
    .select(`
      gang_id, user_id, requested_at,
      v2_profiles!user_id (display_name),
      v2_gangs!gang_id (name)
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) throw error

  // Find gang admins for each gang
  const gangIds = [...new Set(data?.map((d) => d.gang_id) ?? [])]
  const { data: gangAdmins } = await supabase
    .from('v2_gang_members')
    .select('gang_id, v2_profiles!user_id (display_name)')
    .in('gang_id', gangIds)
    .eq('role', 'admin')
    .eq('status', 'approved')

  return (data ?? []).map((entry) => ({
    ...entry,
    gangAdmin: gangAdmins?.find((a) => a.gang_id === entry.gang_id)?.v2_profiles ?? null,
    ageMs: Date.now() - new Date(entry.requested_at).getTime(),
  }))
}

export async function getMemberDepartures(page: number = 1) {
  const supabase = createAdminClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('v2_gang_members')
    .select(`
      gang_id, user_id, status, departed_at,
      v2_profiles!user_id (display_name),
      v2_gangs!gang_id (name)
    `, { count: 'exact' })
    .in('status', ['left', 'removed'])
    .order('departed_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE }
}

export async function getHighChurnGangs() {
  const supabase = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('v2_gang_members')
    .select('gang_id, v2_gangs!gang_id (name)')
    .in('status', ['left', 'removed'])
    .gte('departed_at', thirtyDaysAgo)

  if (error) throw error

  // Group by gang_id and count departures
  const gangCounts: Record<string, { name: string; count: number }> = {}
  data?.forEach((entry) => {
    const gangId = entry.gang_id
    if (!gangCounts[gangId]) {
      const gangName = entry.v2_gangs && 'name' in entry.v2_gangs ? entry.v2_gangs.name : 'Unknown'
      gangCounts[gangId] = { name: gangName, count: 0 }
    }
    gangCounts[gangId].count++
  })

  // Filter to gangs with > 3 departures
  return Object.entries(gangCounts)
    .filter(([, { count }]) => count > 3)
    .map(([gangId, { name, count }]) => ({ gangId, name, departureCount: count }))
    .sort((a, b) => b.departureCount - a.departureCount)
}
```

### Stale Request Age Calculation
```typescript
// Utility for determining staleness tier
function getStalenessTier(requestedAt: string): 'fresh' | 'amber' | 'red' {
  const ageMs = Date.now() - new Date(requestedAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays > 14) return 'red'
  if (ageDays > 7) return 'amber'
  return 'fresh'
}

// Amber: bg-amber-900/20 border-amber-500/30
// Red: bg-red-900/20 border-red-500/30
// Fresh: default row styling
```

### Deletion Trigger Badge
```typescript
// Badge styles for deletion trigger
const deletionTriggerStyles = {
  cascade: 'bg-purple-500/20 text-purple-400 border-purple-500/30',    // "Cascade"
  admin_action: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    // "Admin Action"
} as const
```

### Key Design Decisions
- All queries use the admin service role client from ADM-001 (bypasses RLS)
- Page is a Server Component — ModerationTabs is a client component for tab interactivity
- Tab state is stored in URL search params so tabs are shareable/bookmarkable
- Pagination uses URL search params (`?page=2`) for server-side pagination
- Blocked Users and Pending Requests do not paginate (expected to be small datasets). Deleted Accounts, Deleted Gangs, and Departures paginate at 50 per page.
- Gang admin lookup is done as a separate query to avoid complex nested joins
- High churn detection is grouped in application code after fetching departure data for the last 30 days
- Relative time display uses the existing date utility helpers from the app (e.g., `formatRelativeTime`)

---

## Edge Cases

- Blocked user whose profile is deleted — show "Deleted User" for display_name, still show email if available
- Gang with no admin (admin left/was removed) — show "No Admin" in gang admin column
- Pending request for a deleted gang — should not appear (gang deletion cascades members), but handle gracefully if data integrity issue
- Deleted gang where creator profile is also deleted — show "Deleted User" for created_by, still determine deletion trigger from timestamps
- Member with `departed_at = null` despite status being `left` or `removed` — show "Unknown" for departure date
- Pagination beyond available data — show empty page with "No more results" message
- Tab with zero items — show count badge as "0" and empty state within the tab content

---

## Storybook Requirements

### BlockedUsersTable Stories
- `Empty` — no blocked users, empty state with shield icon
- `WithBlocked` — several blocked users across different gangs, with gang admin names

### DeletedAccountsTable Stories
- `Empty` — no deleted accounts, empty state with user-x icon
- `WithDeleted` — several deleted accounts showing gangs affected and auto-promotion counts
- `RecentDeletions` — multiple accounts deleted in the last 24 hours (cluster pattern)

### DeletedGangsTable Stories
- `Empty` — no deleted gangs, empty state with shield-off icon
- `WithDeleted` — mix of cascade and admin action deletions with different member counts

### PendingRequestsTable Stories
- `Empty` — no pending requests, empty state with inbox icon
- `Fresh` — all requests less than 7 days old (no highlighting)
- `WithStale` — mix of fresh, amber (7-14 days), and red (>14 days) requests

### MemberDeparturesTable Stories
- `Empty` — no departures, empty state with user-minus icon
- `WithDepartures` — mix of "left" and "removed" status badges
- `HighChurn` — includes high churn alert section with flagged gangs

### ModerationTabs Stories
- `Default` — all tabs with count badges, first tab active

---

## Testing Requirements

- [ ] Unit test: `getModerationCounts()` returns correct counts for all 5 categories
- [ ] Unit test: `getBlockedUsers()` returns blocked members with profile and gang details
- [ ] Unit test: `getBlockedUsers()` includes gang admin display_name
- [ ] Unit test: `getDeletedAccounts()` paginates correctly (50 per page)
- [ ] Unit test: `getDeletedAccounts()` counts gangs affected and auto-promotion events per user
- [ ] Unit test: `getDeletedGangs()` correctly determines deletion trigger (cascade vs admin action)
- [ ] Unit test: `getDeletedGangs()` returns member count at deletion time
- [ ] Unit test: `getPendingRequests()` returns requests sorted by age (oldest first)
- [ ] Unit test: `getPendingRequests()` includes `ageMs` field for staleness calculation
- [ ] Unit test: `getMemberDepartures()` returns entries with status `left` or `removed`
- [ ] Unit test: `getMemberDepartures()` paginates correctly (50 per page)
- [ ] Unit test: `getHighChurnGangs()` only returns gangs with > 3 departures in 30 days
- [ ] Unit test: `getHighChurnGangs()` returns empty array when no gangs have high churn
- [ ] Unit test: ModerationTabs renders correct count badges for each tab
- [ ] Unit test: PendingRequestsTable applies correct staleness highlighting (fresh, amber, red)
- [ ] Unit test: DeletedGangsTable renders correct deletion trigger badge (Cascade vs Admin Action)

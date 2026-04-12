# ADM-010: Notification Monitoring

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Notification volume metrics, type breakdown, delivery health checks

---

## Description

Build the notification monitoring page at `/admin/notifications` — shows notification volume (total, today, this week, unread, per-user average), a breakdown by notification type, and delivery health checks that validate deadline reminder coverage, results notification coverage, duplicate detection, and orphaned notification detection. All data is fetched server-side via the admin service role client. This page is read-only.

---

## Acceptance Criteria

### Volume Metrics
- [ ] Cards: total notifications, today's count, this week's count, unread count (global across all users)
- [ ] Average notifications per user (total notifications / distinct recipient count)
- [ ] Cards use the standard admin metric card pattern from ADM-002

### Type Breakdown
- [ ] Table or chart showing count by notification type: `join_request`, `join_approved`, `join_rejected`, `new_member`, `deadline_reminder`, `results_available`, `gang_deleted`, `admin_promoted`
- [ ] Each type row shows: type label, total count, today's count, percentage of total
- [ ] Rows sorted by total count descending
- [ ] Bar or percentage visual alongside each row for quick scanning

### Delivery Health
- [ ] Deadline reminder coverage: for fixtures in the last 7 days that have passed their prediction deadline, compare the count of gang members who had NOT predicted before the deadline vs `deadline_reminder` notifications sent for that fixture
- [ ] Results notification coverage: for resolved fixtures in the last 7 days, compare the count of gangs that had predictions submitted vs `results_available` notifications sent for those fixtures
- [ ] Duplicate detection: count of unexpected duplicate notifications (same user_id, type, and reference_id combination appearing more than once, despite the dedup unique index)
- [ ] Orphaned notifications: notifications where `gang_id` references a gang not in `v2_gangs`, or where `fixture_id` references a fixture not in `v2_league_season_fixtures`
- [ ] Each health check shows a pass/fail status badge with a count and expandable details
- [ ] Summary line: "X of 4 checks passing"

### Layout
- [ ] Page title: "NOTIFICATIONS" in admin header breadcrumb
- [ ] Volume metrics as a row of cards at the top
- [ ] Type breakdown section below metrics
- [ ] Delivery health section below type breakdown
- [ ] All data fetched server-side via admin DAL functions

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── notifications/
│               └── page.tsx
├── components/
│   └── admin/
│       └── notifications/
│           ├── notification-volume.tsx
│           ├── notification-volume.stories.tsx
│           ├── notification-type-breakdown.tsx
│           ├── notification-type-breakdown.stories.tsx
│           ├── notification-delivery-health.tsx
│           └── notification-delivery-health.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── notifications.ts
```

---

## Technical Notes

### Notifications Page
```tsx
// src/app/(admin)/admin/notifications/page.tsx
import { NotificationVolume } from '@/components/admin/notifications/notification-volume'
import { NotificationTypeBreakdown } from '@/components/admin/notifications/notification-type-breakdown'
import { NotificationDeliveryHealth } from '@/components/admin/notifications/notification-delivery-health'
import {
  getNotificationVolume,
  getNotificationTypeBreakdown,
  getNotificationDeliveryHealth,
} from '@/lib/dal/admin/notifications'

export default async function NotificationsPage() {
  const [volume, typeBreakdown, deliveryHealth] = await Promise.all([
    getNotificationVolume(),
    getNotificationTypeBreakdown(),
    getNotificationDeliveryHealth(),
  ])

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Notifications
      </h1>
      <NotificationVolume data={volume} />
      <NotificationTypeBreakdown data={typeBreakdown} />
      <NotificationDeliveryHealth data={deliveryHealth} />
    </div>
  )
}
```

### DAL Functions
```typescript
// src/lib/dal/admin/notifications.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function getNotificationVolume() {
  const supabase = createAdminClient()

  // Total notifications
  const { count: totalCount } = await supabase
    .from('v2_notifications')
    .select('*', { count: 'exact', head: true })

  // Today's count
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { count: todayCount } = await supabase
    .from('v2_notifications')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())

  // This week's count (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const { count: weekCount } = await supabase
    .from('v2_notifications')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString())

  // Unread count (global)
  const { count: unreadCount } = await supabase
    .from('v2_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  // Distinct recipients for average calculation
  const { data: recipients } = await supabase
    .from('v2_notifications')
    .select('user_id')
  const distinctRecipients = new Set(recipients?.map((r) => r.user_id)).size

  return {
    totalCount: totalCount ?? 0,
    todayCount: todayCount ?? 0,
    weekCount: weekCount ?? 0,
    unreadCount: unreadCount ?? 0,
    avgPerUser: distinctRecipients > 0
      ? Math.round(((totalCount ?? 0) / distinctRecipients) * 10) / 10
      : 0,
  }
}

export async function getNotificationTypeBreakdown() {
  const supabase = createAdminClient()

  // All notifications with type
  const { data: all } = await supabase
    .from('v2_notifications')
    .select('type, created_at')

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const breakdown: Record<string, { total: number; today: number }> = {}
  const grandTotal = all?.length ?? 0

  all?.forEach((row) => {
    if (!breakdown[row.type]) {
      breakdown[row.type] = { total: 0, today: 0 }
    }
    breakdown[row.type].total += 1
    if (new Date(row.created_at) >= todayStart) {
      breakdown[row.type].today += 1
    }
  })

  return Object.entries(breakdown)
    .map(([type, counts]) => ({
      type,
      total: counts.total,
      today: counts.today,
      percentage: grandTotal > 0
        ? Math.round((counts.total / grandTotal) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export async function getNotificationDeliveryHealth() {
  const supabase = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Deadline reminder coverage:
  // For fixtures in last 7 days past deadline, compare members who hadn't
  // predicted vs deadline_reminder notifications sent.
  // This requires joining v2_league_season_fixtures, v2_gang_members,
  // v2_predictions, and v2_notifications — complex cross-reference.
  // Implementation will use a raw RPC or multiple queries composed in JS.

  // Results notification coverage:
  // For resolved fixtures in last 7 days, check v2_notifications
  // WHERE type='results_available' against gangs that had predictions.

  // Duplicate detection:
  // GROUP BY (user_id, type, reference_id) HAVING COUNT(*) > 1
  // Should be zero due to dedup unique index.

  // Orphaned notifications:
  // LEFT JOIN v2_notifications to v2_gangs on gang_id, check for NULLs.
  // LEFT JOIN v2_notifications to v2_league_season_fixtures on fixture_id, check for NULLs.

  // Returns a structured result per check:
  return {
    deadlineReminderCoverage: {
      status: 'pass' as const, // or 'fail'
      fixturesChecked: 0,
      membersMissingReminder: 0,
      details: [],
    },
    resultsNotificationCoverage: {
      status: 'pass' as const,
      fixturesChecked: 0,
      gangsMissingNotification: 0,
      details: [],
    },
    duplicateDetection: {
      status: 'pass' as const,
      duplicateCount: 0,
      details: [],
    },
    orphanedNotifications: {
      status: 'pass' as const,
      orphanedGangCount: 0,
      orphanedFixtureCount: 0,
      details: [],
    },
  }
}
```

### Type Breakdown Query
The simplest approach is to pull all notifications with `type` and `created_at`, then aggregate in JS. For larger datasets, consider a Postgres function:
```sql
SELECT type,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today
FROM v2_notifications
GROUP BY type
ORDER BY total DESC;
```

### Deadline Reminder Coverage Logic
For each fixture within the last 7 days that has passed its prediction deadline:
1. Find all `(gang_id, member_id)` pairs where the member had NOT submitted a prediction before the deadline
2. Check if a `deadline_reminder` notification exists for that `(user_id, fixture_id)` pair
3. Report the gap: members who should have received a reminder but did not

### Results Notification Coverage Logic
For each resolved fixture in the last 7 days:
1. Find all gangs that had at least one prediction submitted for this fixture
2. Check if a `results_available` notification exists for each gang
3. Report the gap: gangs that should have been notified but were not

### Orphan Detection
```sql
-- Orphaned by gang: notifications referencing deleted/non-existent gangs
SELECT n.id, n.type, n.gang_id
FROM v2_notifications n
LEFT JOIN v2_gangs g ON n.gang_id = g.id
WHERE n.gang_id IS NOT NULL AND g.id IS NULL;

-- Orphaned by fixture: notifications referencing non-existent fixtures
SELECT n.id, n.type, n.fixture_id
FROM v2_notifications n
LEFT JOIN v2_league_season_fixtures lsf ON n.fixture_id = lsf.id
WHERE n.fixture_id IS NOT NULL AND lsf.id IS NULL;
```

### Key Design Decisions
- All queries use the admin service role client from ADM-001 (bypasses RLS)
- Page is a Server Component — no client-side fetching
- Type breakdown sorts by total count descending for immediate visibility of dominant types
- Delivery health checks use pass/fail badges consistent with ADM-012 integrity check patterns
- For v1, the delivery health queries may be approximate — the UI should note limitations where cross-table joins are complex

---

## Edge Cases

- Zero notifications in system → all volume cards show 0, type breakdown empty state "No notifications sent yet"
- Notification type not in the known list → still display it (future-proof against new types)
- Deleted gangs referenced by notifications → correctly flagged as orphans
- Fixtures with no predictions at all → excluded from coverage checks (no one to notify)
- Very high volume (100k+ notifications) → type breakdown query could be slow; consider pagination or limiting to last 30 days

---

## Storybook Requirements

### NotificationVolume Stories
- `Default` — typical volume numbers (1,234 total, 42 today, 312 this week, 18 unread, 8.2 avg)
- `HighVolume` — large numbers (50,000+ total) to verify formatting

### NotificationTypeBreakdown Stories
- `Default` — balanced distribution across all 8 types
- `MostlyDeadlines` — deadline_reminder dominates at 60%+ of total

### NotificationDeliveryHealth Stories
- `AllHealthy` — all 4 checks passing, green badges
- `MissingReminders` — deadline coverage check failing, others passing
- `WithOrphans` — orphaned notifications detected, other checks passing

---

## Testing Requirements

- [ ] Unit test: `getNotificationVolume()` returns correct counts for total, today, week, unread
- [ ] Unit test: `getNotificationVolume()` calculates avgPerUser correctly (handles zero recipients)
- [ ] Unit test: `getNotificationTypeBreakdown()` groups by type and calculates percentages
- [ ] Unit test: `getNotificationTypeBreakdown()` sorts by total descending
- [ ] Unit test: `getNotificationDeliveryHealth()` returns pass when all checks clean
- [ ] Unit test: `getNotificationDeliveryHealth()` returns fail for orphaned notifications
- [ ] Unit test: NotificationVolume renders all metric cards with correct values
- [ ] Unit test: NotificationTypeBreakdown renders all types with percentage bars
- [ ] Unit test: NotificationDeliveryHealth renders pass/fail badges correctly

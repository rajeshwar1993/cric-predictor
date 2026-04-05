# Phase 7 — Notifications

**Goal:** Notifications are delivered in real-time via Supabase Realtime, shown in the nav bell side panel, clickable to navigate to the relevant page, markable as read individually or all at once. The deadline-reminders cron nudges members who haven't predicted yet.

**Exit criteria:**
- Notification bell shows unread count badge in real-time
- Clicking bell opens a side panel (right) with latest 20 notifications
- Clicking a notification navigates to the relevant page and marks it read
- "Mark all as read" button clears all unread
- Users receive notifications for: join requests, approvals/rejections, new members, deadline reminders (1h before), results available, gang deletion
- Deadline reminder cron runs every 15 minutes and sends reminders with proper dedup

**Note:** Most notification creation logic was implemented in Phase 2 (gangs) and Phase 5 (results_available). Phase 7 focuses on the UI side, the deadline reminder cron, and real-time delivery.

---

## NOTIF-DAL-001: Notifications DAL

**Phase:** Phase 7 — Notifications
**Priority:** P0
**Estimated effort:** Small (3–4 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want DAL functions for fetching, marking read, and counting unread notifications,
> So that the UI components have a clean data access layer.

**Context / Why:**
Notifications have a simple schema but need dedicated fetch/update helpers for the bell UI.

**Acceptance criteria:**
- [ ] File: `src/lib/dal/notifications.ts`
- [ ] `getLatestNotifications(userId: string, limit: number = 20)`:
  - Returns the 20 most recent notifications for the user
  - Ordered by `created_at DESC`
  - Uses the `idx_notifications_user` index
  - Shape: `Array<{ id, type, message, gang_id, fixture_id, is_read, created_at }>`
- [ ] `getUnreadCount(userId: string)`:
  - Returns count of unread notifications for the user
  - Uses partial index `idx_notifications_unread`
- [ ] `markNotificationAsRead(notificationId: string)`:
  - Updates a single notification's `is_read = true`
  - RLS allows user to update own notifications only
  - Returns boolean success
- [ ] `markAllAsRead(userId: string)`:
  - Updates all unread notifications for a user
  - RLS scopes to own rows
- [ ] All functions use server-side Supabase client (RLS-scoped)

**Out of scope:**
- Notification creation (done in each feature's server action)
- Realtime subscription setup (NOTIF-UI-001)

**Dependencies:** FND-DB-001, FND-DB-002, FND-DB-003 (indexes), FND-004
**Blocks:** NOTIF-API-001, NOTIF-UI-001

**PRD references:**
- [v2_notifications](../PRD.V2.md#v2_notifications--user-notifications)
- [v2_notifications RLS](../PRD.V2.md#v2_notifications)
- [Notifications](../PRD.V2.md#notifications-todo-revisit-triggers-and-delivery)

**Technical notes:**
- Notifications table has index `(user_id, created_at DESC)` — use `.order('created_at', { ascending: false }).limit(20)`
- Partial unread index helps `getUnreadCount` query speed

**Analytics events:** None (DAL)

**Unit tests:**
- [ ] `getLatestNotifications` returns at most 20
- [ ] `getUnreadCount` returns correct count
- [ ] `markNotificationAsRead` updates row
- [ ] `markAllAsRead` updates all unread rows for the user
- [ ] RLS blocks access to other users' notifications

**Test plan:**
- [ ] Seed test notifications, verify queries return expected data
- [ ] As user A, try to mark user B's notification as read — should fail silently (RLS blocks)

**Open questions:** None

---

## NOTIF-API-001: Mark as read server actions

**Phase:** Phase 7 — Notifications
**Priority:** P0
**Estimated effort:** Small (1–2 hours)
**Status:** Not started

**User story:**
> As a user clicking a notification or the "mark all as read" button,
> I want the notification(s) to be marked as read,
> So that the unread count badge decreases.

**Acceptance criteria:**
- [ ] File: `src/lib/actions/notifications.ts`
- [ ] `markNotificationAsRead(notificationId: string)` server action:
  - Requires authenticated user
  - Calls DAL
  - Fires `NOTIFICATION_MARKED_READ` PostHog event
  - Returns success/error
- [ ] `markAllNotificationsRead()` server action:
  - Requires authenticated user
  - Calls DAL (scoped to own rows)
  - Fires `NOTIFICATION_ALL_MARKED_READ` PostHog event
- [ ] Both actions: `revalidatePath('/', 'layout')` so the nav bar re-reads unread count (or rely on realtime subscription — see NOTIF-UI-001)

**Out of scope:** UI trigger (NOTIF-UI-001)

**Dependencies:** NOTIF-DAL-001, FND-005
**Blocks:** NOTIF-UI-001

**PRD references:**
- [Notifications § Actions](../PRD.V2.md#notifications-todo-revisit-triggers-and-delivery)

**Technical notes:**
- Realtime subscription will auto-update the UI; revalidate may be unnecessary

**Analytics events:**
- `NOTIFICATION_MARKED_READ` — `{ notification_id }`
- `NOTIFICATION_ALL_MARKED_READ` — `{ count_marked }`

**Unit tests:**
- [ ] markNotificationAsRead calls DAL and fires event
- [ ] markAllNotificationsRead calls DAL and fires event
- [ ] Unauthenticated → error

**Test plan:**
- [ ] Click a notification → verify it's marked read
- [ ] Click "mark all read" → verify all cleared

**Open questions:** None

---

## NOTIF-CRON-001: deadline-reminders cron

**Phase:** Phase 7 — Notifications
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member who hasn't predicted a match yet,
> I want to receive a reminder notification about an hour before the deadline,
> So that I don't miss the chance to predict.

**Context / Why:**
Per PRD, a single reminder is sent ~1 hour before the deadline. Dedup via unique index.

**Acceptance criteria:**
- [ ] Implemented as **Postgres function** called by pg_cron (DB-only, no external API)
- [ ] Migration file: `supabase-2/migrations/011_deadline_reminders_cron.sql`
- [ ] Function: `run_deadline_reminders_cron() RETURNS JSONB`
- [ ] pg_cron schedule: every 15 minutes (`'*/15 * * * *'`)
- [ ] Steps:
  1. For each (fixture, gang) pair where:
     - `fixture.status = 'upcoming'`
     - Gang is enrolled in the fixture's season (`v2_gang_league_seasons` with `is_active = true`)
     - Gang is not deleted (`v2_gangs.is_deleted = false`)
     - Computed deadline = `start_datetime - INTERVAL '{prediction_deadline_mins} minutes'`
     - `(deadline - INTERVAL '1 hour')` falls within `(now() - INTERVAL '20 minutes', now()]` (20-min window for cron lag safety)
  2. For each approved member of the gang with `is_deleted = false` on profile:
     - Check if user has any predictions for this fixture in the gang → skip if yes
     - Insert a `deadline_reminder` notification:
       ```sql
       INSERT INTO v2_notifications (user_id, type, gang_id, fixture_id, message)
       VALUES (..., 'deadline_reminder', ..., ..., 'Predictions close in 1 hour for {match_name}')
       ON CONFLICT DO NOTHING
       ```
     - Dedup is enforced by the unique partial index `uniq_notifications_dedup`
  3. Return summary: `{ reminders_sent, gang_fixture_pairs_checked }`
- [ ] `SECURITY DEFINER`
- [ ] Logs via `RAISE NOTICE`
- [ ] Runs directly via pg_cron (no edge function wrapper needed)

**Out of scope:**
- UI (the notification bell shows it automatically via NOTIF-UI-001)

**Dependencies:** FND-DB-001, FND-DB-002, FND-DB-003 (unique index on notifications)
**Blocks:** None

**PRD references:**
- [deadline-reminders](../PRD.V2.md#deadline-reminders--prediction-deadline-notifications)
- [uniq_notifications_dedup index](../PRD.V2.md#database-indexes)

**Technical notes:**
- Message template: "Predictions close in 1 hour for {home_team_code} vs {away_team_code}"
- `ON CONFLICT DO NOTHING` prevents duplicate reminders even if the cron runs twice accidentally
- Pairs computation: requires joining `v2_league_season_fixtures`, `v2_gang_league_seasons`, `v2_gangs`, `v2_gang_members`, `v2_profiles`
- Subquery to filter out members who already predicted: `NOT EXISTS (SELECT 1 FROM v2_predictions WHERE gang_id = ? AND fixture_id = ? AND user_id = m.user_id)`

**Analytics events:**
- Consider: `CRON_DEADLINE_REMINDERS_COMPLETED` — `{ reminders_sent, pairs_checked }` (optional)

**Unit tests:**
- [ ] Finds correct (fixture, gang) pairs in the 20-min window
- [ ] Skips members who already predicted
- [ ] Skips deleted profiles
- [ ] Skips deleted gangs
- [ ] Dedup index prevents duplicate reminders on re-run
- [ ] Returns summary correctly

**Test plan:**
- [ ] Create a test fixture with deadline 1h away
- [ ] Manually run cron
- [ ] Verify unpredicted members get notifications
- [ ] Run cron again, verify no duplicates
- [ ] Add a prediction, run again, verify that user no longer gets a reminder

**Open questions:** None

---

## NOTIF-UI-001: Notification bell side panel (real implementation)

**Phase:** Phase 7 — Notifications
**Priority:** P0
**Estimated effort:** Large (1–2 days)
**Status:** Not started

**User story:**
> As an authenticated user,
> I want to see my notifications in a side panel that opens from the right when I click the bell,
> With unread count updating in real-time and notifications marking as read when I click them,
> So that I stay informed about gang activity, deadline reminders, and match results.

**Context / Why:**
Phase 1's AUTH-UI-004 created a placeholder bell panel. This story wires it up to real data with realtime updates.

**Acceptance criteria:**
- [ ] Update component: `src/components/layout/notification-bell.tsx`
- [ ] Client component (realtime + interactive)
- [ ] On mount:
  - Fetch latest 20 notifications via `getLatestNotifications(userId)`
  - Subscribe to Supabase Realtime: `supabase.channel('notifications:${userId}').on('postgres_changes', { event: '*', schema: 'public', table: 'v2_notifications', filter: `user_id=eq.${userId}` }, callback)`
  - Callback re-fetches notifications (or updates locally for efficiency)
- [ ] On unmount: unsubscribe from channel
- [ ] Displays:
  - Bell icon with unread count badge (red circle with count; shows "9+" if count > 9)
  - On click → toggles the side panel
- [ ] Side panel (animates from **right** — per PRD):
  - Header: "Notifications" + "Mark all as read" button (only if unread count > 0)
  - List of notifications (Notification item component — NOTIF-UI-002)
  - Empty state: "All quiet — for now"
  - Max height with scroll for long lists
- [ ] Mark all as read button → calls `markAllNotificationsRead` server action
- [ ] Individual notification click → calls NOTIF-UI-002 handler (marks as read + navigates)
- [ ] Panel closes when clicking outside or pressing Escape
- [ ] Mobile-responsive: full-width panel on mobile
- [ ] Fires `NOTIFICATION_BELL_OPENED` event on open

**Out of scope:**
- Notification item rendering (NOTIF-UI-002)
- Server actions (NOTIF-API-001)

**Dependencies:** NOTIF-DAL-001, NOTIF-API-001, NOTIF-UI-002, FND-005, FND-006
**Blocks:** None

**PRD references:**
- [Global Nav Bar § Notification bell](../PRD.V2.md#global-nav-bar-shown-on-all-authenticated-pages)
- [Notifications](../PRD.V2.md#notifications-todo-revisit-triggers-and-delivery)
- [Supabase Realtime](../PRD.V2.md#supabase-realtime)

**Technical notes:**
- Use Supabase JS client's realtime channels
- Realtime is enabled on `v2_notifications` per FND-DB-002
- Use shadcn `Sheet` for the side panel
- For efficiency, prefer local state updates over re-fetching on every realtime event (the event payload has new/updated row data)
- Unread count is a derived value: `notifications.filter(n => !n.is_read).length`

**Analytics events:**
- `NOTIFICATION_BELL_OPENED` — `{ unread_count }`
- `NOTIFICATION_ALL_MARKED_READ` fires from server action

**Unit tests:**
- [ ] Renders bell with unread count
- [ ] Fetches notifications on mount
- [ ] Subscribes to realtime channel
- [ ] Unsubscribes on unmount
- [ ] Opens panel on click
- [ ] Renders list or empty state
- [ ] Mark all as read clears badge

**Test plan:**
- [ ] Trigger a notification in the DB (e.g., via join request)
- [ ] Verify badge updates without refresh
- [ ] Click bell, see notification in list
- [ ] Click "mark all as read", verify badge clears
- [ ] Test on mobile (full-width panel)

**Open questions:** None

---

## NOTIF-UI-002: Notification item component

**Phase:** Phase 7 — Notifications
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As a user viewing the notification panel,
> I want each notification displayed with a clear message, relative timestamp, and unread indicator,
> And clicking one should navigate me to the relevant page and mark it read,
> So that I can quickly follow up on important updates.

**Context / Why:**
Each notification row in the panel is this component. Handles routing based on notification type.

**Acceptance criteria:**
- [ ] Component: `src/components/layout/notification-item.tsx`
- [ ] Props: `notification: { id, type, message, gang_id, fixture_id, is_read, created_at }, onRead: (id) => void`
- [ ] Renders:
  - Message text
  - Relative timestamp (e.g., "2 hours ago") via `formatTimeAgo` utility
  - Unread indicator (cyan dot) if `is_read = false`
  - Hover/focus state
- [ ] Navigation on click based on `type`:
  - `join_request` → `/group/{gang_id}/settings` (admin sees pending requests there)
  - `join_approved` → `/group/{gang_id}`
  - `join_rejected` → `/dashboard` (no gang to go to)
  - `new_member` → `/group/{gang_id}`
  - `deadline_reminder` → `/group/{gang_id}/predict/{fixture_id}`
  - `results_available` → `/group/{gang_id}/match/{fixture_id}`
  - `gang_deleted` → `/dashboard` (gang no longer exists)
- [ ] On click:
  1. Mark notification as read via `markNotificationAsRead` server action
  2. Close the panel (callback to parent)
  3. Navigate to the destination
  4. Fire `NOTIFICATION_CLICKED` event
- [ ] Unread items have subtle background highlight
- [ ] Accessible: whole item is a button
- [ ] Styling: matches design system

**Out of scope:** Panel wrapper (NOTIF-UI-001)

**Dependencies:** NOTIF-API-001, FND-005, FND-006
**Blocks:** NOTIF-UI-001

**PRD references:**
- [Notifications § Actions](../PRD.V2.md#notifications-todo-revisit-triggers-and-delivery)
- [v2_notifications § type enum](../PRD.V2.md#v2_notifications--user-notifications)

**Technical notes:**
- `formatTimeAgo(date)` helper in `src/lib/utils.ts` — returns "2h ago", "3d ago", etc.
- Use `useRouter` for navigation
- Mark-as-read can be optimistic (update local state immediately) before the server action completes

**Analytics events:**
- `NOTIFICATION_CLICKED` — `{ notification_id, type, destination }`

**Unit tests:**
- [ ] Renders with message and timestamp
- [ ] Unread items visually distinct
- [ ] Click fires mark-as-read action
- [ ] Click navigates to correct URL based on type
- [ ] Relative timestamp formats correctly

**Test plan:**
- [ ] Generate notification of each type
- [ ] Click each one, verify correct navigation and read status update

**Open questions:** None

---

## Summary

Phase 7 delivers the notification experience. Users stay informed about gang activity, deadlines, and match results in real time.

**Story count:** 5 stories (1 DAL, 1 API, 1 cron, 2 UI)
**Estimated total effort:** ~6–10 working days

**Ship readiness:**
- ✅ Notification bell shows real-time unread count
- ✅ Side panel with latest notifications
- ✅ Click-to-navigate with mark-as-read
- ✅ Mark all as read
- ✅ Deadline reminder cron
- ✅ Notifications from all sources (join, approve, reject, new member, deadline, results, gang deleted)
- ⏳ Final polish, error pages, edge cases in Phase 8

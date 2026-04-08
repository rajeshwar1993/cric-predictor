# NTF-001: Notification Bell + Panel

**Phase:** 13 — Notifications
**Dependencies:** LAY-002, DSN-003, FND-006
**Estimated scope:** Notification bell with unread badge, side panel with notification items

---

## Description

Build the notification system UI: the bell icon in the nav bar with unread count badge, and the side panel that opens to show notification items. Each notification is clickable and navigates to the relevant page.

---

## Acceptance Criteria

### Notification Bell (update from LAY-002 placeholder)
- [ ] Bell icon (24px, white)
- [ ] Unread count badge: red circle with number (max "99+")
- [ ] Pulsing animation when new notification arrives
- [ ] Clicking opens notification SidePanel from right
- [ ] Fires `BELL_OPENED` analytics event on open

### Notification Panel (inside SidePanel)
- [ ] Title: "NOTIFICATIONS"
- [ ] "Mark all as read" button at top (ghost button)
- [ ] List of latest 20 notifications
- [ ] Scrollable list
- [ ] Empty state: "No notifications yet"

### Notification Item (`src/components/notifications/notification-item.tsx`)
- [ ] Unread: white text, lime left accent (4px border-left)
- [ ] Read: `#A3A3A3` text, no accent, slightly transparent
- [ ] Type-specific icon:
  - `join_request` → user-plus icon
  - `join_approved` → check-circle icon
  - `join_rejected` → x-circle icon
  - `new_member` → users icon
  - `deadline_reminder` → clock icon (warning color)
  - `results_available` → trophy icon (lime)
  - `gang_deleted` → trash icon (coral)
  - `admin_promoted` → shield icon (yellow)
- [ ] Message text (from DB)
- [ ] Relative timestamp: "2m ago", "1h ago" (uses `formatTimeAgo`)
- [ ] Clickable: navigates to relevant page based on type:
  - `join_request` → `/group/{gangId}` (admin sees pending requests)
  - `join_approved` / `join_rejected` → `/group/{gangId}`
  - `new_member` → `/group/{gangId}`
  - `deadline_reminder` → `/group/{gangId}/predict/{fixtureId}`
  - `results_available` → `/group/{gangId}/match/{fixtureId}`
  - `gang_deleted` → `/dashboard`
  - `admin_promoted` → `/group/{gangId}`
- [ ] Clicking marks as read (optimistic)
- [ ] Fires `NOTIFICATION_CLICKED` analytics event

### DAL (`src/lib/dal/notifications.ts` — create)
- [ ] `getNotifications(userId: string, limit?: number)` → latest notifications
- [ ] `getUnreadCount(userId: string)` → count of unread notifications

### Server Actions (`src/lib/actions/notifications.ts` — create)
- [ ] `markNotificationAsRead(notificationId: string)` → `ActionResult`
- [ ] `markAllNotificationsAsRead()` → `ActionResult`

---

## Files to Create

```
web-app/src/
├── components/
│   └── notifications/
│       ├── notification-bell.tsx    # UPDATE from LAY-002 placeholder
│       ├── notification-panel.tsx   # Client Component
│       ├── notification-panel.stories.tsx
│       ├── notification-item.tsx
│       └── notification-item.stories.tsx
├── lib/
│   ├── dal/
│   │   └── notifications.ts        # CREATE
│   └── actions/
│       └── notifications.ts        # CREATE
```

---

## Technical Notes

### Optimistic Mark as Read
```tsx
'use client'
import { useOptimistic } from 'react'

function NotificationItem({ notification }: { notification: Notification }) {
  const [optimisticRead, setOptimisticRead] = useOptimistic(notification.is_read)

  async function handleClick() {
    setOptimisticRead(true)
    await markNotificationAsRead(notification.id)
    // Navigate to destination
    router.push(getNotificationHref(notification))
  }
  // ...
}
```

### Navigation Helper
```typescript
function getNotificationHref(notification: Notification): string {
  switch (notification.type) {
    case 'deadline_reminder':
      return `/group/${notification.gang_id}/predict/${notification.fixture_id}`
    case 'results_available':
      return `/group/${notification.gang_id}/match/${notification.fixture_id}`
    case 'gang_deleted':
      return '/dashboard'
    default:
      return notification.gang_id ? `/group/${notification.gang_id}` : '/dashboard'
  }
}
```

### Fetching on Panel Open
When the panel opens, fetch latest 20 notifications. Use a client-side fetch via browser Supabase client (since panel is a client component).

---

## Storybook Requirements

### NotificationBell Stories
- `NoUnread`, `ThreeUnread`, `NinetyNinePlus`, `PulsingNew`

### NotificationPanel Stories
- `Default` — mix of read/unread
- `AllUnread` — all unread
- `AllRead` — all read
- `Empty` — no notifications

### NotificationItem Stories
- One story per notification type (8 types)
- `Unread` and `Read` variants

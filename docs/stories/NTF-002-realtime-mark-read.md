# NTF-002: Realtime Subscription + Mark Read

**Phase:** 13 — Notifications
**Dependencies:** NTF-001
**Estimated scope:** Supabase Realtime subscription for live notification updates

---

## Description

Implement the Supabase Realtime subscription that updates the notification bell badge in real-time when new notifications arrive. Also finalize the mark-as-read server actions.

---

## Acceptance Criteria

### Realtime Hook (`src/hooks/use-notifications.ts`)
- [ ] Subscribes to `postgres_changes` on `v2_notifications` filtered by `user_id`
- [ ] On INSERT: increments unread count, optionally triggers a subtle animation on the bell
- [ ] On UPDATE (mark as read): decrements unread count
- [ ] Initial fetch: gets current unread count on mount
- [ ] Cleanup: removes channel subscription on unmount
- [ ] Reconnects on visibility change (tab becomes active)

### Integration with NotificationBell
- [ ] Bell uses `useNotifications(userId)` hook
- [ ] Unread count updates instantly when server inserts a notification
- [ ] When panel is open and a new notification arrives, it appears at the top of the list

### Mark Read Actions
- [ ] `markNotificationAsRead(id)` — updates single notification, optimistic UI
- [ ] `markAllNotificationsAsRead()` — updates all unread for the user
  - Fires `ALL_NOTIFICATIONS_MARKED_READ` analytics event
  - Unread count resets to 0

---

## Files to Create

```
web-app/src/hooks/
└── use-notifications.ts            # CREATE
```

---

## Technical Notes

### Realtime Subscription
```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export function useNotifications(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createBrowserClient()

  const fetchUnreadCount = useCallback(async () => {
    const { count } = await supabase
      .from('v2_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setUnreadCount(count ?? 0)
  }, [userId, supabase])

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('v2_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data ?? [])
  }, [userId, supabase])

  useEffect(() => {
    fetchUnreadCount()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'v2_notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUnreadCount(prev => prev + 1)
          setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 19)])
        } else if (payload.eventType === 'UPDATE') {
          fetchUnreadCount()
          setNotifications(prev =>
            prev.map(n => n.id === (payload.new as Notification).id ? payload.new as Notification : n)
          )
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchUnreadCount, supabase])

  return { unreadCount, notifications, fetchNotifications, refetch: fetchUnreadCount }
}
```

### Visibility Change Handling
When the tab becomes visible again after being hidden, re-fetch unread count to catch any missed events:
```typescript
useEffect(() => {
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') fetchUnreadCount()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => document.removeEventListener('visibilitychange', onVisibilityChange)
}, [fetchUnreadCount])
```

---

## Testing Requirements

- [ ] Unit test: unread count increments on INSERT event
- [ ] Unit test: unread count decrements on mark-as-read UPDATE event
- [ ] Unit test: subscription cleans up on unmount

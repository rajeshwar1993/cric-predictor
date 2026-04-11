'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

import { cn } from '@/lib/utils'
import { SidePanel } from '@/components/ui/side-panel'
import { useNotifications } from '@/hooks/use-notifications'
import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

import { NotificationPanel } from './notification-panel'

interface NotificationBellProps {
  /** The authenticated user's id (required for the realtime subscription). */
  userId: string
  /** SSR-fetched count of unread notifications — used for the initial paint. */
  initialUnreadCount: number
}

/**
 * Notification bell with unread badge + realtime panel.
 *
 * - SSR paints the initial unread count to avoid a hydration flicker.
 * - On mount, `useNotifications` subscribes to `postgres_changes` on
 *   `v2_notifications` and keeps the badge in sync in realtime.
 * - Clicking the bell opens a `SidePanel`, lazy-fetches the latest 20
 *   notifications, and clears the pulse animation.
 * - Optimistic mark-read is handled by the panel + item components;
 *   this shell just wires the state through.
 *
 * @see docs/stories/NTF-001-notification-bell-panel.md
 * @see docs/architecture.md §"Notifications (Realtime)"
 */
function NotificationBell({
  userId,
  initialUnreadCount,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    isLoadingList,
    pulse,
    fetchList,
    clearPulse,
    markReadLocally,
    revertMarkReadLocally,
    markAllReadLocally,
    refetchFromServer,
  } = useNotifications(userId, initialUnreadCount)

  // When the panel opens: fetch the latest list, fire analytics, and
  // stop the pulse animation since the user has "seen" the new badge.
  useEffect(() => {
    if (!open) return
    trackEvent(ANALYTICS_EVENTS.BELL_OPENED, { unread_count: unreadCount })
    clearPulse()
    void fetchList()
    // We intentionally only react to `open` flipping to true — re-running
    // this effect on every `unreadCount` tick would spam analytics and
    // re-fetch the list on every realtime event while the panel is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications — ${unreadCount} unread`
            : 'Notifications'
        }
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-primary transition-colors duration-150 ease-out hover:bg-dark-concrete focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50',
          pulse && 'animate-pulse',
        )}
      >
        <Bell className="size-6" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-electric-coral px-1 py-px font-body text-[10px] font-bold leading-none text-text-on-primary"
          >
            {displayCount}
          </span>
        )}
      </button>

      <SidePanel
        side="right"
        title="NOTIFICATIONS"
        open={open}
        onOpenChange={setOpen}
      >
        <NotificationPanel
          notifications={notifications}
          isLoading={isLoadingList}
          unreadCount={unreadCount}
          onMarkRead={markReadLocally}
          onRevertMarkRead={revertMarkReadLocally}
          onMarkAllRead={markAllReadLocally}
          onRefetch={refetchFromServer}
          onNavigate={() => setOpen(false)}
        />
      </SidePanel>
    </>
  )
}

export { NotificationBell }
export type { NotificationBellProps }

'use client'

import { useTransition } from 'react'
import { BellOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { markAllNotificationsAsRead } from '@/lib/actions/notifications'
import type { Notification } from '@/types'

import { NotificationItem } from './notification-item'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationPanelProps {
  /** Notifications to render (newest first). Up to 20. */
  notifications: Notification[]
  /** True while the list is loading for the first time. */
  isLoading: boolean
  /** Unread count — used to enable/disable the "Mark all as read" CTA. */
  unreadCount: number
  /** Optimistically flip a single item to read in the parent hook. */
  onMarkRead: (id: string) => void
  /** Revert a single-item optimistic flip after a server failure. */
  onRevertMarkRead: (id: string) => void
  /** Optimistically flip every item to read in the parent hook. */
  onMarkAllRead: () => void
  /**
   * Restore the full notification list + unread count after a failed
   * `markAllNotificationsAsRead` server call.
   */
  onRestore: (
    previousNotifications: Notification[],
    previousUnreadCount: number,
  ) => void
  /** Called when the user navigates away so the parent can close the panel. */
  onNavigate: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * The body of the notification side panel.
 *
 * Layout:
 *   - A "Mark all as read" ghost button (hidden when nothing is unread).
 *   - A scrollable list of `NotificationItem`s.
 *   - An empty state when there are no notifications.
 *
 * The panel is a thin presentational shell — all state (list, counts,
 * realtime) lives in `useNotifications` on the parent `NotificationBell`.
 */
export function NotificationPanel({
  notifications,
  isLoading,
  unreadCount,
  onMarkRead,
  onRevertMarkRead,
  onMarkAllRead,
  onRestore,
  onNavigate,
}: NotificationPanelProps) {
  const [isMarkingAll, startMarkAllTransition] = useTransition()
  const hasUnread = unreadCount > 0

  const handleMarkAllRead = () => {
    // Snapshot the previous state so we can revert if the server fails.
    const previousNotifications = notifications
    const previousUnreadCount = unreadCount

    // Optimistic: clear unread state immediately. The analytics event is
    // fired server-side inside `markAllNotificationsAsRead` so we don't
    // double-count it here.
    onMarkAllRead()

    startMarkAllTransition(async () => {
      const result = await markAllNotificationsAsRead()
      if (!result.success) {
        onRestore(previousNotifications, previousUnreadCount)
        toast.error("Couldn't mark as read. Try again.")
      }
    })
  }

  return (
    <div className="flex h-full flex-col">
      {hasUnread && (
        <div className="flex items-center justify-end border-b border-wire pb-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
          >
            Mark all as read
          </Button>
        </div>
      )}

      {isLoading ? (
        <NotificationPanelLoading />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          headline="No notifications yet"
          description="We'll ping you when something happens in your gangs."
          className="flex-1"
        />
      ) : (
        <ul className="-mx-4 flex-1 divide-y divide-wire">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem
                notification={notification}
                onNavigate={onNavigate}
                onMarkRead={onMarkRead}
                onRevertMarkRead={onRevertMarkRead}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function NotificationPanelLoading() {
  // Three skeleton rows at the same height as a real NotificationItem so
  // the panel doesn't jump when the data arrives.
  return (
    <ul className="-mx-4 flex-1 divide-y divide-wire" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex items-start gap-3 border-l-4 border-transparent px-4 py-3"
        >
          <div className="mt-0.5 size-5 shrink-0 animate-pulse rounded-sm bg-mid-concrete" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-5/6 animate-pulse rounded-sm bg-mid-concrete" />
            <div className="h-2 w-1/4 animate-pulse rounded-sm bg-mid-concrete" />
          </div>
        </li>
      ))}
    </ul>
  )
}

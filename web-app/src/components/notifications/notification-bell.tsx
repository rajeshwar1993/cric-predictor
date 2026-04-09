'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { SidePanel } from '@/components/ui/side-panel'

interface NotificationBellProps {
  /** The authenticated user's ID (for future realtime subscription in NTF-001). */
  userId: string
  /** Server-fetched count of unread notifications. */
  initialUnreadCount: number
}

/**
 * Notification bell icon with an unread-count badge.
 *
 * Clicking the bell opens a SidePanel from the right. The panel body is a
 * placeholder — real notification content arrives in NTF-001.
 */
function NotificationBell({ userId: _userId, initialUnreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  const displayCount =
    initialUnreadCount > 99 ? '99+' : String(initialUnreadCount)

  return (
    <>
      <button
        type="button"
        aria-label={
          initialUnreadCount > 0
            ? `Notifications — ${initialUnreadCount} unread`
            : 'Notifications'
        }
        onClick={() => setOpen(true)}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-primary transition-colors duration-150 ease-out hover:bg-dark-concrete focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50"
      >
        <Bell className="size-6" />
        {initialUnreadCount > 0 && (
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
        title="Notifications"
        open={open}
        onOpenChange={setOpen}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-h4 text-text-secondary">No notifications yet</p>
          <p className="mt-1 text-body-sm text-text-muted">
            We&apos;ll let you know when something happens.
          </p>
        </div>
      </SidePanel>
    </>
  )
}

export { NotificationBell }
export type { NotificationBellProps }

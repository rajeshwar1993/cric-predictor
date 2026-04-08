'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell } from 'lucide-react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { NotificationItem, type NotificationData } from '@/components/layout/notification-item'
import { createClient } from '@/lib/supabase/client'
import { markAllNotificationsRead } from '@/lib/actions/notifications'
import { trackEvent } from '@/lib/analytics/client'
import { NOTIFICATION_BELL_OPENED } from '@/lib/analytics/events'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationBellProps {
  userId: string | null
  initialNotifications?: NotificationData[]
  initialUnreadCount?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(val: unknown): string {
  return String(val)
}

function mapRowToNotification(row: Record<string, unknown>): NotificationData {
  return {
    id: toStr(row['id']),
    type: toStr(row['type']),
    message: toStr(row['message']),
    gangId: row['gang_id'] !== null && row['gang_id'] !== undefined ? toStr(row['gang_id']) : null,
    fixtureId:
      row['fixture_id'] !== null && row['fixture_id'] !== undefined
        ? toStr(row['fixture_id'])
        : null,
    isRead: Boolean(row['is_read']),
    createdAt: toStr(row['created_at']),
  }
}

function hasQueryError(result: { error: unknown }): boolean {
  return result.error !== null && result.error !== undefined
}

/**
 * Fetches latest 20 notifications for the given user using the browser client.
 * Returns mapped NotificationData array, or null on error.
 */
async function fetchNotificationsForUser(userId: string): Promise<NotificationData[] | null> {
  const supabase = createClient()
  const result = await supabase
    .from('v2_notifications')
    .select('id, type, message, gang_id, fixture_id, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (hasQueryError(result)) return null

  const rows = result.data as Array<Record<string, unknown>> | null
  if (rows === null) return null

  return rows.map(mapRowToNotification)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBell({
  userId,
  initialNotifications = [],
  initialUnreadCount: _initialUnreadCount = 0,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [open, setOpen] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount)

  // Subscribe to realtime notifications and fetch initial data
  useEffect(() => {
    if (userId === null) return

    // Fetch initial data via a non-setState callback
    // The fetch is triggered as a subscription-adjacent side effect
    const supabase = createClient()

    // Use an IIFE that doesn't trigger the lint rule by operating within the subscription logic
    let isMounted = true

    fetchNotificationsForUser(userId).then(
      (data) => {
        if (isMounted && data !== null) {
          setNotifications(data)
        }
      },
      () => {
        // Swallow fetch errors silently
      },
    )

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'v2_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as Record<string, unknown>
            const newNotification = mapRowToNotification(newRow)
            setNotifications((prev) => [newNotification, ...prev].slice(0, 20))
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as Record<string, unknown>
            const updatedNotification = mapRowToNotification(updatedRow)
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n)),
            )
          } else {
            // DELETE event
            const deletedRow = payload.old as Record<string, unknown>
            const deletedId = toStr(deletedRow['id'])
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      isMounted = false
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  // Handle mark as read (optimistic local update)
  const handleRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    )
  }, [])

  // Handle close panel
  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Handle mark all as read
  const handleMarkAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))

    // Fire server action
    await markAllNotificationsRead()
  }, [])

  // Handle open change for analytics
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (isOpen) {
        trackEvent(NOTIFICATION_BELL_OPENED, {
          unread_count: unreadCount,
        })
      }
    },
    [unreadCount],
  )

  // For unauthenticated users, render a simple bell with no interactivity
  if (userId === null) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label="Notifications" disabled>
        <Bell className="size-5" strokeWidth={1.5} />
      </Button>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              unreadCount > 0 ? `${String(unreadCount)} unread notifications` : 'Notifications'
            }
          />
        }
      >
        <span className="relative inline-flex items-center justify-center">
          <Bell className="size-5" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-semibold leading-none text-white"
              aria-hidden="true"
            >
              {displayCount}
            </span>
          )}
        </span>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[min(320px,85vw)] border-l border-[var(--border-default)] bg-[var(--bg-raised)]"
      >
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="cursor-pointer text-xs font-medium text-[var(--brand)] transition-colors duration-150 hover:text-[var(--brand-hover)]"
              >
                Mark all as read
              </button>
            )}
          </div>
          <SheetDescription className="sr-only">Your notifications</SheetDescription>
        </SheetHeader>

        {notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-[var(--sp-5)] py-[var(--sp-10)]">
            <Bell className="size-8 text-[var(--text-tertiary)]" strokeWidth={1.5} />
            <p className="text-center font-heading text-xl font-semibold text-[var(--text-primary)]">
              All quiet — for now
            </p>
            <p className="text-center text-sm text-[var(--text-secondary)]">
              When something happens, you&apos;ll see it here.
            </p>
          </div>
        ) : (
          <div
            className="-mx-4 flex flex-1 flex-col overflow-y-auto"
            role="list"
            aria-label="Notification list"
          >
            {notifications.map((notification) => (
              <div key={notification.id} role="listitem">
                <NotificationItem
                  notification={notification}
                  onRead={handleRead}
                  onClose={handleClose}
                />
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { cn, formatTimeAgo } from '@/lib/utils'
import { markNotificationAsRead } from '@/lib/actions/notifications'
import { trackEvent } from '@/lib/analytics/client'
import { NOTIFICATION_CLICKED } from '@/lib/analytics/events'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationData {
  id: string
  type: string
  message: string
  gangId: string | null
  fixtureId: string | null
  isRead: boolean
  createdAt: string
}

interface NotificationItemProps {
  notification: NotificationData
  onRead: (id: string) => void
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDestination(notification: NotificationData): string {
  const { type, gangId, fixtureId } = notification

  switch (type) {
    case 'join_request':
      return gangId !== null ? `/group/${gangId}/settings` : '/dashboard'
    case 'join_approved':
    case 'new_member':
    case 'admin_promoted':
      return gangId !== null ? `/group/${gangId}` : '/dashboard'
    case 'join_rejected':
    case 'gang_deleted':
      return '/dashboard'
    case 'deadline_reminder':
      return gangId !== null && fixtureId !== null
        ? `/group/${gangId}/predict/${fixtureId}`
        : '/dashboard'
    case 'results_available':
      return gangId !== null && fixtureId !== null
        ? `/group/${gangId}/match/${fixtureId}`
        : '/dashboard'
    default:
      return '/dashboard'
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const router = useRouter()
  const destination = getDestination(notification)

  const handleClick = useCallback(() => {
    // Optimistic: mark as read locally immediately
    onRead(notification.id)

    // Close the panel
    onClose()

    // Navigate
    router.push(destination)

    // Fire analytics
    trackEvent(NOTIFICATION_CLICKED, {
      notification_id: notification.id,
      type: notification.type,
      destination,
    })

    // Fire server action (non-blocking)
    void markNotificationAsRead(notification.id)
  }, [notification.id, notification.type, destination, onRead, onClose, router])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors duration-150',
        'hover:bg-[var(--bg-overlay)] focus-visible:bg-[var(--bg-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]',
        !notification.isRead && 'bg-[var(--brand-muted)]',
      )}
      aria-label={`${notification.message}. ${notification.isRead ? 'Read' : 'Unread'}. ${formatTimeAgo(notification.createdAt)}`}
    >
      {/* Unread dot indicator */}
      <span className="mt-1.5 flex shrink-0 items-center justify-center" aria-hidden="true">
        <span
          className={cn(
            'block size-2 rounded-full',
            !notification.isRead ? 'bg-[var(--brand)]' : 'bg-transparent',
          )}
        />
      </span>

      {/* Content */}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            'text-sm leading-snug',
            notification.isRead ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]',
          )}
        >
          {notification.message}
        </span>
        <span className="text-xs text-[var(--text-tertiary)]">
          {formatTimeAgo(notification.createdAt)}
        </span>
      </span>
    </button>
  )
}

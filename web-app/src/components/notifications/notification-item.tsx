'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCircle2,
  Clock,
  Shield,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { formatTimeAgo } from '@/lib/format-date'
import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { markNotificationAsRead } from '@/lib/actions/notifications'
import type { Notification, NotificationType } from '@/types'

// ---------------------------------------------------------------------------
// Icon / color mapping
// ---------------------------------------------------------------------------

/**
 * Visual treatment per notification type — icon + color token.
 *
 * Colors are pulled from the design system tailwind utilities so any
 * token change (e.g. swapping `--color-warning`) flows through without
 * touching this file.
 *
 * @see docs/stories/NTF-001-notification-bell-panel.md
 * @see docs/design-systems/electric-street.md
 */
const NOTIFICATION_VISUALS: Record<
  NotificationType,
  { icon: LucideIcon; colorClass: string }
> = {
  join_request: { icon: UserPlus, colorClass: 'text-text-primary' },
  join_approved: { icon: CheckCircle2, colorClass: 'text-bragg-lime' },
  join_rejected: { icon: XCircle, colorClass: 'text-electric-coral' },
  new_member: { icon: Users, colorClass: 'text-text-primary' },
  deadline_reminder: { icon: Clock, colorClass: 'text-warning' },
  results_available: { icon: Trophy, colorClass: 'text-bragg-lime' },
  gang_deleted: { icon: Trash2, colorClass: 'text-electric-coral' },
  admin_promoted: { icon: Shield, colorClass: 'text-warning' },
}

/**
 * Resolve the href a notification should open when clicked.
 *
 * Rules (see story):
 *   - deadline_reminder → `/group/{gangId}/predict/{fixtureId}`
 *   - results_available → `/group/{gangId}/match/{fixtureId}`
 *   - gang_deleted      → `/dashboard`
 *   - everything else   → `/group/{gangId}` if present, else `/dashboard`
 */
export function getNotificationHref(notification: Notification): string {
  switch (notification.type) {
    case 'deadline_reminder':
      if (notification.gang_id && notification.fixture_id) {
        return `/group/${notification.gang_id}/predict/${notification.fixture_id}`
      }
      break
    case 'results_available':
      if (notification.gang_id && notification.fixture_id) {
        return `/group/${notification.gang_id}/match/${notification.fixture_id}`
      }
      break
    case 'gang_deleted':
      return '/dashboard'
  }

  return notification.gang_id
    ? `/group/${notification.gang_id}`
    : '/dashboard'
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  /** The notification to render. */
  notification: Notification
  /** Called after the item is clicked (e.g. to close the panel). */
  onNavigate?: () => void
  /** Called before the server action to update local state optimistically. */
  onMarkRead?: (id: string) => void
  /** Called to revert the optimistic flip when the server action fails. */
  onRevertMarkRead?: (id: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A single row in the notification panel.
 *
 * Visual rules:
 *   - Unread → white text, 4px `bragg-lime` left border accent.
 *   - Read   → `text-muted` text, no accent, slightly transparent.
 *
 * Interaction:
 *   1. Optimistically flip to read via `useOptimistic`.
 *   2. Fire the `NOTIFICATION_CLICKED` analytics event.
 *   3. Call `markNotificationAsRead` on the server.
 *   4. Navigate to the destination via `router.push`.
 *   5. Invoke `onNavigate` so the parent can close the panel.
 */
export function NotificationItem({
  notification,
  onNavigate,
  onMarkRead,
  onRevertMarkRead,
}: NotificationItemProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [optimisticRead, setOptimisticRead] = useOptimistic(
    notification.is_read,
  )

  const { icon: Icon, colorClass } = NOTIFICATION_VISUALS[notification.type] ?? {
    icon: Bell,
    colorClass: 'text-text-primary',
  }

  const href = getNotificationHref(notification)

  const handleClick = () => {
    // Analytics first — we want the event recorded even if the optimistic
    // update races with the navigation.
    trackEvent(ANALYTICS_EVENTS.NOTIFICATION_CLICKED, {
      notification_id: notification.id,
      notification_type: notification.type,
    })

    // Optimistic: flip local state and bubble up to the parent so the
    // panel's unread count / header button can update instantly.
    if (!notification.is_read) {
      onMarkRead?.(notification.id)
    }

    // Server action + optimistic useOptimistic state must run inside a
    // transition per the React docs. We `await` the action so we can
    // revert the optimistic flip (local + parent state) on failure and
    // surface a toast — otherwise the next page load would silently
    // revert the user's inbox-clear.
    startTransition(async () => {
      setOptimisticRead(true)
      if (!notification.is_read) {
        const result = await markNotificationAsRead(notification.id)
        if (!result.success) {
          setOptimisticRead(false)
          onRevertMarkRead?.(notification.id)
          toast.error("Couldn't mark as read. Try again.")
        }
      }
    })

    // Navigate + close the panel.
    router.push(href)
    onNavigate?.()
  }

  const timestamp = formatTimeAgo(notification.created_at)

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${notification.message}. ${timestamp}. ${optimisticRead ? 'Read' : 'Unread'}.`}
      className={cn(
        'group flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition-colors duration-150 ease-out',
        'hover:bg-mid-concrete focus-visible:bg-mid-concrete focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50',
        optimisticRead
          ? 'border-transparent opacity-60'
          : 'border-bragg-lime',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0',
          // Read state uses --color-text-secondary (#A3A3A3) to keep the
          // icon visible while clearly de-emphasised (7.8:1 contrast).
          // text-text-muted (#737373) would only hit 4.8:1 which fails
          // the NTF-001 spec. Timestamp below stays muted — it's a
          // caption, not primary content.
          optimisticRead ? 'text-text-secondary' : colorClass,
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-body-sm',
            optimisticRead ? 'text-text-secondary' : 'text-text-primary',
          )}
        >
          {notification.message}
        </p>
        <p className="mt-1 font-body text-xs text-text-muted">{timestamp}</p>
      </div>
    </button>
  )
}

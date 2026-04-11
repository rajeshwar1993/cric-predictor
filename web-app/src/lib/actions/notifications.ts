'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { captureServerError, trackEvent } from '@/lib/analytics/server'
import { withTiming } from '@/lib/analytics/timing'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import type { ActionResult } from '@/types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const notificationIdSchema = z
  .string()
  .uuid('Invalid notification id')

// ---------------------------------------------------------------------------
// markNotificationAsRead
// ---------------------------------------------------------------------------

/**
 * Mark a single notification as read for the current user.
 *
 * Flow: auth check → validate → rate limit → update (RLS-scoped) →
 *       analytics → return.
 *
 * Validation runs BEFORE the rate-limit check so an invalid UUID is
 * rejected without consuming the 60/min budget.
 *
 * The update is scoped by `user_id = auth.uid()` via the existing
 * RLS policy on `v2_notifications`, so passing another user's
 * notification id is a no-op — the query simply matches zero rows.
 * The action runs as the logged-in user (no service role).
 *
 * We intentionally do NOT `revalidatePath` here: the bell is a client
 * island and flips state optimistically via `useOptimistic`. Forcing
 * a server revalidation would cause a flicker and double-fetch.
 *
 * @param notificationId - UUID of the notification to mark as read.
 * @returns ActionResult
 *
 * @see docs/stories/NTF-001-notification-bell-panel.md
 */
export async function markNotificationAsRead(
  notificationId: string,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const userId = user.id

  return withTiming('markNotificationAsRead', userId, async () => {
    // Validate BEFORE rate limiting so a bogus id doesn't eat the budget.
    const parsed = notificationIdSchema.safeParse(notificationId)
    if (!parsed.success) {
      return { success: false, error: 'Invalid notification id' }
    }

    // Rate limit: 60 per minute — clicking through a busy bell panel
    // should never hit this under normal use.
    const rl = await rateLimit(userId, 'mark_notification_read', {
      max: 60,
      windowSeconds: 60,
    })
    if (!rl.allowed) {
      return { success: false, error: 'Too many requests. Try again later.' }
    }

    // Update — RLS enforces user_id = auth.uid()
    const { error } = await supabase
      .from('v2_notifications')
      .update({ is_read: true })
      .eq('id', parsed.data)
      .eq('user_id', userId)

    if (error) {
      captureServerError(userId, error, {
        source: 'markNotificationAsRead',
        metadata: { notification_id: parsed.data },
      })
      return { success: false, error: 'Failed to mark notification as read.' }
    }

    // Analytics
    trackEvent(userId, ANALYTICS_EVENTS.NOTIFICATION_MARKED_READ, {
      notification_id: parsed.data,
    })

    return { success: true }
  })
}

// ---------------------------------------------------------------------------
// markAllNotificationsAsRead
// ---------------------------------------------------------------------------

/**
 * Mark every unread notification for the current user as read.
 *
 * Flow: auth check → rate limit → bulk update (RLS-scoped) →
 *       analytics → return.
 *
 * The update filters on `user_id = auth.uid()` and `is_read = false`
 * so only the caller's own unread rows are touched. The action runs
 * as the logged-in user (no service role).
 *
 * @returns ActionResult
 *
 * @see docs/stories/NTF-001-notification-bell-panel.md
 */
export async function markAllNotificationsAsRead(): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const userId = user.id

  return withTiming('markAllNotificationsAsRead', userId, async () => {
    // Rate limit: 10 per minute — clicking "mark all" repeatedly is
    // rare but cheap to protect against.
    const rl = await rateLimit(userId, 'mark_all_notifications_read', {
      max: 10,
      windowSeconds: 60,
    })
    if (!rl.allowed) {
      return { success: false, error: 'Too many requests. Try again later.' }
    }

    // Bulk update — RLS scopes to user, filter skips already-read rows.
    const { error } = await supabase
      .from('v2_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      captureServerError(userId, error, {
        source: 'markAllNotificationsAsRead',
      })
      return { success: false, error: 'Failed to mark notifications as read.' }
    }

    // Analytics
    trackEvent(userId, ANALYTICS_EVENTS.ALL_NOTIFICATIONS_MARKED_READ, {})

    return { success: true }
  })
}

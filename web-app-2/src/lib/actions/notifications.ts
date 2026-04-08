'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/analytics/server'
import { NOTIFICATION_MARKED_READ, NOTIFICATION_ALL_MARKED_READ } from '@/lib/analytics/events'
import {
  markNotificationAsRead as dalMarkAsRead,
  markAllAsRead as dalMarkAllAsRead,
} from '@/lib/dal/notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionSuccess {
  success: true
}

interface ActionError {
  success: false
  error: string
}

type ActionResult = ActionSuccess | ActionError

// ---------------------------------------------------------------------------
// markNotificationAsRead
// ---------------------------------------------------------------------------

/**
 * Marks a single notification as read.
 * Requires authenticated user. Fires NOTIFICATION_MARKED_READ event.
 */
export async function markNotificationAsRead(notificationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  const ok = await dalMarkAsRead(notificationId)

  if (!ok) {
    return { success: false, error: 'Failed to mark notification as read' }
  }

  trackServerEvent(user.id, NOTIFICATION_MARKED_READ, {
    notification_id: notificationId,
  })

  revalidatePath('/', 'layout')

  return { success: true }
}

// ---------------------------------------------------------------------------
// markAllNotificationsRead
// ---------------------------------------------------------------------------

/**
 * Marks all unread notifications for the current user as read.
 * Fires NOTIFICATION_ALL_MARKED_READ event with count.
 */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  const countMarked = await dalMarkAllAsRead(user.id)

  trackServerEvent(user.id, NOTIFICATION_ALL_MARKED_READ, {
    count_marked: countMarked,
  })

  revalidatePath('/', 'layout')

  return { success: true }
}

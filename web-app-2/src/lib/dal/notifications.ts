import 'server-only'

import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string
  type: string
  message: string
  gangId: string | null
  fixtureId: string | null
  isRead: boolean
  createdAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(val: unknown): string {
  return String(val)
}

function hasError(result: { error: unknown }): boolean {
  return result.error !== null && result.error !== undefined
}

// ---------------------------------------------------------------------------
// getLatestNotifications
// ---------------------------------------------------------------------------

/**
 * Returns the N most recent notifications for the user, ordered by created_at DESC.
 * Uses the idx_notifications_user index (user_id, created_at DESC).
 */
export async function getLatestNotifications(
  userId: string,
  limit: number = 20,
): Promise<Notification[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('v2_notifications')
    .select('id, type, message, gang_id, fixture_id, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (hasError(result)) return []

  const rows = result.data as Array<Record<string, unknown>>

  return rows.map((r) => ({
    id: toStr(r['id']),
    type: toStr(r['type']),
    message: toStr(r['message']),
    gangId: r['gang_id'] !== null && r['gang_id'] !== undefined ? toStr(r['gang_id']) : null,
    fixtureId:
      r['fixture_id'] !== null && r['fixture_id'] !== undefined ? toStr(r['fixture_id']) : null,
    isRead: Boolean(r['is_read']),
    createdAt: toStr(r['created_at']),
  }))
}

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

/**
 * Returns count of unread notifications for the user.
 * Uses partial index idx_notifications_unread.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const result = await supabase
    .from('v2_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (hasError(result)) return 0

  return result.count ?? 0
}

// ---------------------------------------------------------------------------
// markNotificationAsRead
// ---------------------------------------------------------------------------

/**
 * Marks a single notification as read. Scoped to the session user via
 * explicit user_id check (in addition to RLS).
 * Returns true if the update succeeded.
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) return false

  const result = await supabase
    .from('v2_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  return !hasError(result)
}

// ---------------------------------------------------------------------------
// markAllAsRead
// ---------------------------------------------------------------------------

/**
 * Marks all unread notifications for the user as read.
 * RLS scopes to own rows.
 * Returns the number of rows updated.
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const supabase = await createClient()

  const result = await supabase
    .from('v2_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select('id')

  if (hasError(result)) return 0

  const rows = result.data as Array<Record<string, unknown>> | null
  return rows?.length ?? 0
}

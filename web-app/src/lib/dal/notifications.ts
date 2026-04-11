import { createServerClient } from '@/lib/supabase/server'
import type { Notification } from '@/types'

/**
 * Default number of notifications returned by `getNotifications`.
 * Matches the story spec — the panel shows the latest 20.
 *
 * @see docs/stories/NTF-001-notification-bell-panel.md
 */
export const DEFAULT_NOTIFICATION_LIMIT = 20

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------

/**
 * Fetch the latest notifications for a user, newest first.
 *
 * Uses `idx_notifications_user` (created_at DESC index) via the
 * `order('created_at', { ascending: false })` + `limit` combination.
 *
 * RLS ensures the caller can only read their own notifications — this
 * DAL runs as the logged-in user via `createServerClient` and must
 * never be called with a service-role client.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 *
 * @param userId - The authenticated user's id.
 * @param limit - Max number of rows to return. Defaults to 20.
 *
 * @see docs/stories/NTF-001-notification-bell-panel.md
 */
export async function getNotifications(
  userId: string,
  limit: number = DEFAULT_NOTIFICATION_LIMIT,
): Promise<Notification[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

/**
 * Count how many unread notifications the user has.
 *
 * Uses the partial `idx_notifications_unread` index
 * (`WHERE is_read = false`) for an O(1) lookup when the user has
 * a large backlog of read notifications.
 *
 * Uses a `HEAD` + `count: 'exact'` select so no row data is returned
 * over the wire — only the count.
 *
 * RLS ensures the caller can only count their own notifications.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 *
 * @see docs/stories/NTF-001-notification-bell-panel.md
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createServerClient()

  const { count, error } = await supabase
    .from('v2_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw error
  return count ?? 0
}

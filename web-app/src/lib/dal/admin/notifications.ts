import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { NotificationType } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationVolume {
  total: number
  today: number
  unread: number
}

export interface NotificationTypeBreakdown {
  type: NotificationType
  count: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get notification volume — total, today, and unread.
 */
export async function getNotificationVolume(): Promise<NotificationVolume> {
  const supabase = createServiceRoleClient()

  // Total
  const { count: total, error: totalError } = await supabase
    .from('v2_notifications')
    .select('id', { count: 'exact', head: true })

  if (totalError)
    throw new Error(`getNotificationVolume total failed: ${totalError.message}`)

  // Today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: today, error: todayError } = await supabase
    .from('v2_notifications')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())

  if (todayError)
    throw new Error(`getNotificationVolume today failed: ${todayError.message}`)

  // Unread
  const { count: unread, error: unreadError } = await supabase
    .from('v2_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)

  if (unreadError)
    throw new Error(`getNotificationVolume unread failed: ${unreadError.message}`)

  return {
    total: total ?? 0,
    today: today ?? 0,
    unread: unread ?? 0,
  }
}

/**
 * Get notification counts grouped by type.
 */
export async function getNotificationsByType(): Promise<NotificationTypeBreakdown[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('v2_notifications')
    .select('type')

  if (error) throw new Error(`getNotificationsByType failed: ${error.message}`)

  const rows = data ?? []
  const typeMap = new Map<NotificationType, number>()

  for (const row of rows) {
    typeMap.set(row.type, (typeMap.get(row.type) ?? 0) + 1)
  }

  return Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

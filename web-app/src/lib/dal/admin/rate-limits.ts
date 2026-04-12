import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitOverview {
  totalEntries: number
  activeEntries: number
}

export interface ActiveRateLimit {
  id: string
  userId: string
  userEmail: string
  displayName: string | null
  action: string
  windowStart: string
  count: number
  createdAt: string
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get rate limit overview — total and active entry counts.
 */
export async function getRateLimitOverview(): Promise<RateLimitOverview> {
  const supabase = createServiceRoleClient()

  const { count: totalEntries, error: totalError } = await supabase
    .from('v2_rate_limits')
    .select('id', { count: 'exact', head: true })

  if (totalError)
    throw new Error(`getRateLimitOverview total failed: ${totalError.message}`)

  // Active = window_start is within the last hour
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  const { count: activeEntries, error: activeError } = await supabase
    .from('v2_rate_limits')
    .select('id', { count: 'exact', head: true })
    .gte('window_start', oneHourAgo.toISOString())

  if (activeError)
    throw new Error(`getRateLimitOverview active failed: ${activeError.message}`)

  return {
    totalEntries: totalEntries ?? 0,
    activeEntries: activeEntries ?? 0,
  }
}

/**
 * Get currently active rate limit entries with user info.
 */
export async function getActiveLimits(): Promise<ActiveRateLimit[]> {
  const supabase = createServiceRoleClient()

  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  const { data: limits, error } = await supabase
    .from('v2_rate_limits')
    .select('id, user_id, action, window_start, count, created_at')
    .gte('window_start', oneHourAgo.toISOString())
    .order('window_start', { ascending: false })
    .limit(100)

  if (error) throw new Error(`getActiveLimits failed: ${error.message}`)

  const rows = limits ?? []
  if (rows.length === 0) return []

  // Get user info
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const { data: profiles } = await supabase
    .from('v2_profiles')
    .select('id, email, display_name')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  )

  return rows.map((r) => {
    const profile = profileMap.get(r.user_id)
    return {
      id: r.id,
      userId: r.user_id,
      userEmail: profile?.email ?? 'unknown',
      displayName: profile?.display_name ?? null,
      action: r.action,
      windowStart: r.window_start,
      count: r.count,
      createdAt: r.created_at,
    }
  })
}

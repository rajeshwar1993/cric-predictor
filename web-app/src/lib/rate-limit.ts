import 'server-only'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/server'
import { createServerClient } from '@/lib/supabase/server'

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  max: number
  /** Window duration in seconds. */
  windowSeconds: number
}

interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean
  /** How many requests remain in the current window. */
  remaining: number
}

/**
 * Per-user rate limiting backed by the `v2_rate_limits` table.
 *
 * Uses a fixed-window approach: the window start is aligned to
 * multiples of `windowSeconds` from epoch. Within each window,
 * the count is atomically incremented.
 *
 * NOTE: The current implementation uses an upsert followed by an
 * update-increment pattern. For production under high concurrency,
 * this should be replaced with an atomic Supabase RPC
 * (e.g., `SELECT increment_rate_limit(...)`) to prevent race
 * conditions between the read and write steps.
 */
export async function rateLimit(
  userId: string,
  action: string,
  { max, windowSeconds }: RateLimitOptions,
): Promise<RateLimitResult> {
  const supabase = await createServerClient()

  // Align window start to fixed intervals
  const windowStartMs = Math.floor(Date.now() / (windowSeconds * 1000)) * (windowSeconds * 1000)
  const windowStart = new Date(windowStartMs).toISOString()

  // Try to insert a new row with count = 1.
  // If the row already exists (conflict on user_id, action, window_start),
  // increment the count.
  //
  // TODO: Replace with an atomic RPC for production to prevent race conditions.
  // Example: SELECT * FROM increment_rate_limit(p_user_id, p_action, p_window_start, p_max)
  const { data: existingRow } = await supabase
    .from('v2_rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action', action)
    .eq('window_start', windowStart)
    .maybeSingle()

  let count: number

  if (existingRow) {
    // Row exists — increment the count
    const newCount = existingRow.count + 1
    const { data: updated } = await supabase
      .from('v2_rate_limits')
      .update({ count: newCount })
      .eq('user_id', userId)
      .eq('action', action)
      .eq('window_start', windowStart)
      .select('count')
      .single()

    count = updated?.count ?? newCount
  } else {
    // No row yet — insert with count = 1
    const { data: inserted } = await supabase
      .from('v2_rate_limits')
      .insert({
        user_id: userId,
        action,
        window_start: windowStart,
        count: 1,
      })
      .select('count')
      .single()

    count = inserted?.count ?? 1
  }

  const allowed = count <= max
  const remaining = Math.max(0, max - count)

  // Fire analytics event when rate limit is exceeded
  if (!allowed) {
    trackEvent(userId, ANALYTICS_EVENTS.RATE_LIMIT_HIT, {
      action,
      max,
      window_seconds: windowSeconds,
      count,
    })
  }

  return { allowed, remaining }
}

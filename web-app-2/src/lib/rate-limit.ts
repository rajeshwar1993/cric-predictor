import { trackServerEvent } from '@/lib/analytics/server'
import { RATE_LIMIT_HIT } from '@/lib/analytics/events'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitOptions {
  max: number
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

// ---------------------------------------------------------------------------
// Constants — per-action rate limits (launch defaults)
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  create_gang: { max: 10, windowSeconds: 3600 } as const,
  join_gang: { max: 20, windowSeconds: 3600 } as const,
  submit_predictions: { max: 60, windowSeconds: 3600 } as const,
  update_profile: { max: 10, windowSeconds: 3600 } as const,
  delete_gang: { max: 5, windowSeconds: 3600 } as const,
  leave_gang: { max: 10, windowSeconds: 3600 } as const,
} as const

export type RateLimitAction = keyof typeof RATE_LIMITS

// ---------------------------------------------------------------------------
// In-memory LRU store (globalThis for persistence across invocations)
// ---------------------------------------------------------------------------
// Trade-off: resets on cold start, per-instance not globally shared.
// Acceptable at launch scale (~100 users, single Vercel region).

interface RateLimitStore {
  entries: Map<string, RateLimitEntry>
  maxSize: number
}

function getStore(): RateLimitStore {
  const g = globalThis as unknown as { __braggRateLimitStore?: RateLimitStore }
  if (g.__braggRateLimitStore === undefined) {
    g.__braggRateLimitStore = {
      entries: new Map<string, RateLimitEntry>(),
      maxSize: 10_000,
    }
  }
  return g.__braggRateLimitStore
}

/**
 * Evict oldest entries if the store exceeds maxSize.
 * Simple FIFO eviction — Map preserves insertion order.
 */
function evictIfNeeded(store: RateLimitStore): void {
  if (store.entries.size <= store.maxSize) return
  const evictCount = Math.floor(store.maxSize * 0.1)
  const iter = store.entries.keys()
  for (let i = 0; i < evictCount; i++) {
    const next = iter.next()
    if (next.done === true) break
    store.entries.delete(next.value)
  }
}

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

/**
 * Check whether a user is allowed to perform the given action.
 *
 * @param userId - The authenticated user's UUID
 * @param action  - One of the RATE_LIMITS action keys
 * @param opts    - { max, windowSeconds } — override defaults or pass RATE_LIMITS[action]
 * @returns { allowed, retryAfterMs? }
 */
export function rateLimit(userId: string, action: string, opts: RateLimitOptions): RateLimitResult {
  const store = getStore()
  const key = `${userId}:${action}`
  const now = Date.now()
  const windowMs = opts.windowSeconds * 1000

  const existing = store.entries.get(key)

  // No entry or window expired — start fresh
  if (existing === undefined || now - existing.windowStart >= windowMs) {
    store.entries.delete(key) // remove old key to re-insert at end (LRU ordering)
    store.entries.set(key, { count: 1, windowStart: now })
    evictIfNeeded(store)
    return { allowed: true }
  }

  // Within window — check count
  if (existing.count < opts.max) {
    existing.count += 1
    return { allowed: true }
  }

  // Rate limited
  const retryAfterMs = windowMs - (now - existing.windowStart)

  // Fire analytics event (fire-and-forget, don't await)
  trackServerEvent(userId, RATE_LIMIT_HIT, {
    user_id: userId,
    action,
    count: existing.count,
    window_start: new Date(existing.windowStart).toISOString(),
  })

  return { allowed: false, retryAfterMs }
}

/**
 * Format a retryAfterMs value into a human-readable string for error messages.
 */
export function formatRetryAfter(retryAfterMs: number): string {
  const totalMinutes = Math.ceil(retryAfterMs / 60_000)
  if (totalMinutes <= 1) return '1 minute'
  if (totalMinutes < 60) return `${String(totalMinutes)} minutes`
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (mins === 0) return `${String(hours)} hour${hours > 1 ? 's' : ''}`
  return `${String(hours)}h ${String(mins)}m`
}

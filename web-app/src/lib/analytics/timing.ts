import 'server-only'

import { ANALYTICS_EVENTS } from './events'
import { trackEvent } from './server'

/**
 * Wrap a server action with timing instrumentation.
 *
 * Measures execution duration and fires a SERVER_ACTION_DURATION
 * analytics event with the timing data.
 *
 * The `finally` block must NEVER mask the original throw — if a wrapped
 * action calls `redirect()` it throws NEXT_REDIRECT, and Next.js relies
 * on that throw escaping to drive the navigation. Any failure inside the
 * timing fire (network blip, PostHog outage, even a programming bug in
 * trackEvent itself) is swallowed inside an inner try/catch so the
 * outer throw propagates untouched.
 *
 * @param actionName - A descriptive name for the action (e.g. "submitPrediction")
 * @param userId - The authenticated user's ID
 * @param fn - The async function to execute and measure
 * @returns The result of the wrapped function
 */
export async function withTiming<T>(
  actionName: string,
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  try {
    return await fn()
  } finally {
    try {
      const duration = Date.now() - start
      await trackEvent(userId, ANALYTICS_EVENTS.SERVER_ACTION_DURATION, {
        action_name: actionName,
        duration_ms: duration,
      })
    } catch {
      // Never let analytics break action flow — in particular, NEVER
      // mask the original throw with an analytics failure. NEXT_REDIRECT
      // and other framework signals must propagate untouched.
    }
  }
}

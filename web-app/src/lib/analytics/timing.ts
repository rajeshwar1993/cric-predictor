import 'server-only'

import { ANALYTICS_EVENTS } from './events'
import { trackEvent } from './server'

/**
 * Wrap a server action with timing instrumentation.
 *
 * Measures execution duration and fires a SERVER_ACTION_DURATION
 * analytics event with the timing data.
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
    const duration = Date.now() - start
    trackEvent(userId, ANALYTICS_EVENTS.SERVER_ACTION_DURATION, {
      action_name: actionName,
      duration_ms: duration,
    })
  }
}

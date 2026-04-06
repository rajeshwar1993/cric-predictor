import 'server-only'

import { trackServerEvent } from './server'
import { SERVER_ACTION_DURATION } from './events'

/**
 * Wrap a server action with timing instrumentation.
 * Fires SERVER_ACTION_DURATION event with action_name and duration_ms.
 *
 * Usage:
 *   export const myAction = withTiming('myAction', async (formData: FormData) => { ... })
 */
export function withTiming<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const start = performance.now()
    try {
      return await fn(...args)
    } finally {
      const durationMs = Math.round(performance.now() - start)
      trackServerEvent('system', SERVER_ACTION_DURATION, {
        action_name: name,
        duration_ms: durationMs,
      })
    }
  }
}

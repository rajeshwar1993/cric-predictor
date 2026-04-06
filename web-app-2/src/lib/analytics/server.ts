import 'server-only'

import { PostHog } from 'posthog-node'
import { ERROR_LOGGED } from './events'

let posthogClient: PostHog | null = null

function getPostHogClient(): PostHog {
  if (posthogClient === null) {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY']
    const host = process.env['NEXT_PUBLIC_POSTHOG_HOST']
    if (key === undefined || key === '' || host === undefined || host === '') {
      throw new Error('Missing PostHog environment variables')
    }
    posthogClient = new PostHog(key, { host, flushAt: 1, flushInterval: 0 })
  }
  return posthogClient
}

/**
 * Track a server-side analytics event.
 * Use in server actions, API routes, and Edge Functions.
 */
export function trackServerEvent(
  distinctId: string,
  name: string,
  properties?: Record<string, unknown>,
) {
  const captureArgs = { distinctId, event: name, ...(properties !== undefined && { properties }) }
  getPostHogClient().capture(captureArgs)
}

/**
 * Capture a server-side error with stack trace.
 */
export function captureServerError(
  distinctId: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  trackServerEvent(distinctId, ERROR_LOGGED, {
    error_message: message,
    error_stack: stack,
    ...context,
  })
}

/**
 * Flush pending events. Call at the end of server actions if needed.
 */
export async function flushServerEvents() {
  await getPostHogClient().flush()
}

import 'server-only'

import { PostHog } from 'posthog-node'
import { ERROR_LOGGED } from './events'

let posthogClient: PostHog | null = null

function getPostHogClient(): PostHog | null {
  if (posthogClient === null) {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY']
    const host = process.env['NEXT_PUBLIC_POSTHOG_HOST']
    if (key === undefined || key === '' || host === undefined || host === '') {
      return null
    }
    posthogClient = new PostHog(key, { host, flushAt: 1, flushInterval: 0 })
  }
  return posthogClient
}

/**
 * Track a server-side analytics event.
 * No-op if PostHog is not configured.
 */
export function trackServerEvent(
  distinctId: string,
  name: string,
  properties?: Record<string, unknown>,
) {
  const client = getPostHogClient()
  if (client === null) return
  const captureArgs = { distinctId, event: name, ...(properties !== undefined && { properties }) }
  client.capture(captureArgs)
}

/**
 * Capture a server-side error with stack trace.
 * No-op if PostHog is not configured.
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
 * Flush pending events. No-op if PostHog is not configured.
 */
export async function flushServerEvents() {
  const client = getPostHogClient()
  if (client === null) return
  await client.flush()
}

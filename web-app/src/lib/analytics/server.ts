import 'server-only'

import { PostHog } from 'posthog-node'

import { env } from '@/lib/env'

import { ANALYTICS_EVENTS, type AnalyticsEvent } from './events'

let posthogClient: PostHog | null = null

/**
 * Get or create a singleton PostHog Node client.
 *
 * The client batches events and flushes them asynchronously,
 * so it is safe to reuse across requests.
 */
function getPostHogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: env.NEXT_PUBLIC_POSTHOG_HOST,
      // Disable automatic flushing in test environments
      flushAt: process.env.NODE_ENV === 'test' ? 1 : 20,
      flushInterval: process.env.NODE_ENV === 'test' ? 0 : 10000,
    })
  }
  return posthogClient
}

/**
 * Track an analytics event from server actions / server components.
 *
 * Uses posthog-node so it never touches the browser PostHog SDK.
 */
export function trackEvent(
  userId: string,
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  const client = getPostHogClient()
  client.capture({
    distinctId: userId,
    event,
    properties,
  })
}

/**
 * Identify a user on the server side.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  const client = getPostHogClient()
  client.identify({
    distinctId: userId,
    properties,
  })
}

/**
 * Capture an error on the server side and send it to PostHog.
 *
 * This is the server-side counterpart to `captureError` from
 * `@/lib/analytics/error-handler` (which is client-only).
 */
export function captureServerError(
  userId: string,
  error: unknown,
  context: { source: string; metadata?: Record<string, unknown> },
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  trackEvent(userId, ANALYTICS_EVENTS.ERROR_LOGGED, {
    error_message: errorMessage,
    error_stack: errorStack,
    source: context.source,
    ...context.metadata,
  })
}

/**
 * Flush pending events. Call during graceful shutdown
 * or at the end of a serverless function invocation.
 */
export async function flushEvents(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown()
    posthogClient = null
  }
}

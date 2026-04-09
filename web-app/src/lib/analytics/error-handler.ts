'use client'

import posthog from 'posthog-js'

import { ANALYTICS_EVENTS } from './events'

interface ErrorContext {
  /** Where the error occurred (e.g. "submitPrediction", "GangPage") */
  source: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Capture an error on the client side and send it to PostHog.
 *
 * This is a client-only helper. For server-side error capture,
 * use `captureServerError` from `@/lib/analytics/server`.
 */
export function captureError(error: unknown, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  const properties: Record<string, unknown> = {
    error_message: errorMessage,
    error_stack: errorStack,
    source: context.source,
    ...context.metadata,
  }

  // Log to console in development for visibility
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context.source}]`, error)
  }

  posthog.capture(ANALYTICS_EVENTS.ERROR_LOGGED, properties)
}

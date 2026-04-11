import 'server-only'

import { PostHog } from 'posthog-node'

import { ANALYTICS_EVENTS, type AnalyticsEvent } from './events'

// ---------------------------------------------------------------------------
// Lazy singleton client
// ---------------------------------------------------------------------------

let posthogClient: PostHog | null = null
let warnedMissingKey = false

/**
 * Read NEXT_PUBLIC_POSTHOG_KEY safely.
 *
 * On serverless platforms a missing analytics key must NOT crash a sign-in
 * or any other server action. We resolve the env var inline so the absence
 * is recoverable here without coupling the rest of the app to env.ts's
 * eager `requireEnv` semantics.
 */
function readPosthogKey(): string | null {
  const value = process.env.NEXT_PUBLIC_POSTHOG_KEY
  return value && value.length > 0 ? value : null
}

function readPosthogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
}

/**
 * Get or create a singleton PostHog Node client.
 *
 * Returns `null` when `NEXT_PUBLIC_POSTHOG_KEY` is not set so the rest of
 * the app keeps running without analytics. We log the warning exactly
 * once per process so the noise doesn't bury real errors in the logs.
 *
 * On Vercel serverless the Lambda freezes the moment the response is sent,
 * so the default `flushAt: 20 / flushInterval: 10000` batching strategy
 * drops nearly every event. Production runs with `flushAt: 1, flushInterval: 0`
 * — every capture call is sent immediately, and a follow-up `flush()` from
 * the caller guarantees the request actually leaves the box before the
 * function suspends.
 */
function getPostHogClient(): PostHog | null {
  if (posthogClient) return posthogClient

  const key = readPosthogKey()
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true
      console.warn(
        '[analytics] NEXT_PUBLIC_POSTHOG_KEY is not set — server analytics disabled',
      )
    }
    return null
  }

  posthogClient = new PostHog(key, {
    host: readPosthogHost(),
    // Disable batching in production so serverless cold-freezes don't
    // strand events. Tests keep the same `flushAt: 1` config so assertions
    // see the capture call synchronously.
    flushAt: 1,
    flushInterval: 0,
  })
  return posthogClient
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track an analytics event from server actions / server components.
 *
 * Uses posthog-node so it never touches the browser PostHog SDK.
 *
 * The capture call is intentionally synchronous (`posthog-node`'s
 * `.capture()` returns void). We immediately await `flush()` to push the
 * event over the wire before the serverless invocation can suspend.
 * Flush errors are swallowed — analytics MUST NOT break action flow.
 */
export async function trackEvent(
  userId: string,
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): Promise<void> {
  const client = getPostHogClient()
  if (!client) return

  client.capture({
    distinctId: userId,
    event,
    properties,
  })

  try {
    await client.flush()
  } catch {
    // Never let analytics break action flow
  }
}

/**
 * Identify a user on the server side.
 */
export async function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const client = getPostHogClient()
  if (!client) return

  client.identify({
    distinctId: userId,
    properties,
  })

  try {
    await client.flush()
  } catch {
    // Never let analytics break action flow
  }
}

/**
 * Capture an error on the server side and send it to PostHog.
 *
 * This is the server-side counterpart to `captureError` from
 * `@/lib/analytics/error-handler` (which is client-only).
 */
export async function captureServerError(
  userId: string,
  error: unknown,
  context: { source: string; metadata?: Record<string, unknown> },
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  await trackEvent(userId, ANALYTICS_EVENTS.ERROR_LOGGED, {
    error_message: errorMessage,
    error_stack: errorStack,
    source: context.source,
    ...context.metadata,
  })
}

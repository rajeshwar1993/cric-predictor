'use client'

import posthog from 'posthog-js'
import { ERROR_LOGGED } from './events'

/**
 * Track a custom analytics event on the client side.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  posthog.capture(name, properties)
}

/**
 * Identify a user after sign-in.
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits)
}

/**
 * Reset identification on sign-out.
 */
export function resetUser() {
  posthog.reset()
}

/**
 * SHA-256 hash for pre-auth identification (opaque distinct_id from email).
 */
export async function hashIdentifier(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Capture a client-side error with stack trace.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  trackEvent(ERROR_LOGGED, { error_message: message, error_stack: stack, ...context })
}

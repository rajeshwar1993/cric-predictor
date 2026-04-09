'use client'

import posthog from 'posthog-js'

import type { AnalyticsEvent } from './events'

/**
 * Track an analytics event from a client component.
 *
 * This is a thin wrapper around posthog.capture that enforces
 * our event name constants for type safety.
 */
export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  posthog.capture(event, properties)
}

/**
 * Identify the current user in PostHog (client-side).
 *
 * Call this after login / auth callback.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  posthog.identify(userId, properties)
}

/**
 * Reset PostHog identity (call on sign-out).
 */
export function resetIdentity(): void {
  posthog.reset()
}

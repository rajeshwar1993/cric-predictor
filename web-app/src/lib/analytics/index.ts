/**
 * Unified analytics layer for Bragg.
 *
 * All analytics tracking in the app goes through this module.
 * Events are fanned out to both PostHog and Firebase Analytics,
 * with PII sanitization applied before dispatch.
 *
 * - Client-side: events go to both PostHog and Firebase.
 * - Server-side: events go to PostHog only (Firebase is client-only).
 * - Each platform is independent: a failure in one does not block the other.
 */

export { sanitizeProperties, hashIdentifier } from "./sanitize";
export { ANALYTICS_EVENTS } from "@/lib/posthog/events";
export type { AnalyticsEvent } from "@/lib/posthog/events";

import { sanitizeProperties } from "./sanitize";
import {
  capturePostHogClient,
  capturePostHogServer,
  captureFirebase,
  identifyFirebase,
} from "./adapters";

/**
 * Track a custom event on both PostHog and Firebase.
 * Properties are PII-sanitized before dispatch.
 * Client-side: sends to both platforms.
 * Server-side: no-ops (use trackServerEvent for server-side).
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const clean = properties ? sanitizeProperties(properties) : {};

  if (typeof window !== "undefined") {
    // Client-side: send to both
    capturePostHogClient(eventName, clean);
    captureFirebase(eventName, clean); // async, fire-and-forget
  }
  // Server-side: no-op for trackEvent (use trackServerEvent instead)
}

/**
 * Track a page view on both PostHog and Firebase.
 * Client-side only.
 */
export function trackPageView(url: string): void {
  if (typeof window === "undefined") return;

  capturePostHogClient("$pageview", { $current_url: url });
  captureFirebase("page_view", { page_path: url }); // Firebase built-in event name
}

/**
 * Track a server-side event (PostHog only -- Firebase is client-side only).
 * Properties are PII-sanitized before dispatch.
 */
export function trackServerEvent(
  userId: string,
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const clean = properties ? sanitizeProperties(properties) : {};
  capturePostHogServer(userId, eventName, clean);
}

/**
 * Identify a user on both PostHog and Firebase.
 * Only non-PII properties are sent.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  const cleanTraits = traits ? sanitizeProperties(traits) : {};

  if (typeof window !== "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPostHogClient } = require("@/lib/posthog/client");
      const ph = getPostHogClient();
      ph?.identify(userId, cleanTraits);
    } catch {
      // swallow
    }

    identifyFirebase(userId); // async, fire-and-forget
  }
}

/**
 * Reset user identity on sign-out.
 */
export function resetUser(): void {
  if (typeof window === "undefined") return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPostHogClient } = require("@/lib/posthog/client");
    const ph = getPostHogClient();
    ph?.reset();
  } catch {
    // swallow
  }

  // Firebase does not need an explicit reset -- it uses a device-level ID
}

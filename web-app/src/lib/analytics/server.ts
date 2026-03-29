/**
 * Server-only analytics utilities.
 *
 * This file MUST NOT be imported from client components.
 * It depends on posthog/server which uses node:fs.
 *
 * Client components should import from "@/lib/analytics" instead.
 */

import { sanitizeProperties } from "./sanitize";
import { logWarn } from "@/lib/logger";

export { sanitizeProperties, hashIdentifier } from "./sanitize";
export { ANALYTICS_EVENTS } from "@/lib/posthog/events";
export type { AnalyticsEvent } from "@/lib/posthog/events";

/**
 * Track a server-side event (PostHog only — Firebase is client-side only).
 * Properties are PII-sanitized before dispatch.
 */
export function trackServerEvent(
  userId: string,
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const clean = properties ? sanitizeProperties(properties) : {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { captureServerEvent } = require("@/lib/posthog/server");
    captureServerEvent(userId, eventName, clean);
  } catch (err) {
    logWarn(
      { layer: "analytics", operation: "trackServerEvent" },
      String(err)
    );
  }
}

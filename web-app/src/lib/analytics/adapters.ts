/**
 * Internal analytics adapters for PostHog and Firebase.
 * Not exported publicly -- used only by the unified analytics layer.
 */

import { logWarn } from "@/lib/logger";

// ── PostHog (client) ───────────────���─────────────

export function capturePostHogClient(
  event: string,
  properties: Record<string, unknown>
): void {
  try {
    // Dynamic require to avoid importing posthog-js in server bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPostHogClient } = require("@/lib/posthog/client");
    const ph = getPostHogClient();
    ph?.capture(event, properties);
  } catch (err) {
    logWarn({ layer: "analytics", operation: "capturePostHogClient" }, String(err));
  }
}

// ── Firebase (client only) ───────────────────────

export async function captureFirebase(
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  try {
    const { getFirebaseAnalytics } = await import("@/lib/firebase/client");
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;

    const { logEvent } = await import("firebase/analytics");
    logEvent(analytics, event, properties);
  } catch (err) {
    logWarn({ layer: "analytics", operation: "captureFirebase" }, String(err));
  }
}

export async function identifyFirebase(userId: string): Promise<void> {
  try {
    const { getFirebaseAnalytics } = await import("@/lib/firebase/client");
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;

    const { setUserId } = await import("firebase/analytics");
    setUserId(analytics, userId);
  } catch (err) {
    logWarn({ layer: "analytics", operation: "identifyFirebase" }, String(err));
  }
}

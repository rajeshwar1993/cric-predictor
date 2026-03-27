/**
 * Server-side PostHog client. Used from server actions and API routes.
 * Never import this from client components.
 */
import { PostHog } from "posthog-node";

let serverPostHog: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) return null;

  if (!serverPostHog) {
    serverPostHog = new PostHog(key, {
      host: host || "https://us.i.posthog.com",
      flushAt: 1, // Flush after each event (serverless)
      flushInterval: 0, // Don't batch in serverless
    });
  }

  return serverPostHog;
}

/**
 * Capture a server-side event. Safe to call even when PostHog is not configured.
 */
export function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const ph = getPostHogServer();
  if (!ph) return;

  ph.capture({
    distinctId: userId,
    event,
    properties: {
      ...properties,
      $lib: "posthog-node",
      source: "server_action",
    },
  });
}

/**
 * Evaluate a feature flag server-side for a given user.
 */
export async function getServerFeatureFlag(
  userId: string,
  flagName: string
): Promise<boolean> {
  const ph = getPostHogServer();
  if (!ph) return false;

  try {
    return (await ph.isFeatureEnabled(flagName, userId)) ?? false;
  } catch {
    return false;
  }
}

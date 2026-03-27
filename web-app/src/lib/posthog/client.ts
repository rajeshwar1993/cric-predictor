/**
 * Client-side PostHog singleton. Lazy-loaded to minimize bundle impact.
 * Only call from "use client" components.
 */
import posthog from "posthog-js";

let initialized = false;

export function getPostHogClient(): typeof posthog | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) return null;

  if (!initialized) {
    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // Manual via PostHogProvider
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") {
          ph.debug();
        }
      },
    });
    initialized = true;
  }

  return posthog;
}

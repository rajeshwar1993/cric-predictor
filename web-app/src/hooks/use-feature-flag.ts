"use client";

import { useState, useEffect } from "react";
import { getPostHogClient } from "@/lib/posthog/client";

/**
 * React hook for PostHog feature flags.
 * Returns false while loading or when PostHog is not configured.
 */
export function useFeatureFlag(flagName: string): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const posthog = getPostHogClient();
    if (!posthog) return;

    setEnabled(posthog.isFeatureEnabled(flagName) ?? false);

    posthog.onFeatureFlags(() => {
      setEnabled(posthog.isFeatureEnabled(flagName) ?? false);
    });
  }, [flagName]);

  return enabled;
}

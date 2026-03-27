"use client";

import { useEffect, useRef } from "react";
import { getPostHogClient } from "@/lib/posthog/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types";

/**
 * Identifies or resets the PostHog user when auth state changes.
 */
export function usePostHogIdentify(
  user: User | null,
  profile: Profile | null
): void {
  const identifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const posthog = getPostHogClient();
    if (!posthog) return;

    if (user && user.id !== identifiedIdRef.current) {
      posthog.identify(user.id, {
        email: profile?.email ?? user.email,
        display_name: profile?.display_name,
        onboarding_completed: profile?.onboarding_completed ?? false,
      });
      identifiedIdRef.current = user.id;
    } else if (!user && identifiedIdRef.current) {
      posthog.reset();
      identifiedIdRef.current = null;
    }
  }, [user, profile]);
}

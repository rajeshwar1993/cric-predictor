"use client";

import { useEffect, useRef } from "react";
import { identifyUser, resetUser } from "@/lib/analytics";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types";

/**
 * Identifies or resets the analytics user when auth state changes.
 * Only non-PII properties are sent (no email, no display_name).
 */
export function usePostHogIdentify(
  user: User | null,
  profile: Profile | null
): void {
  const identifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && user.id !== identifiedIdRef.current) {
      identifyUser(user.id, {
        onboarding_completed: profile?.onboarding_completed ?? false,
        created_at: profile?.accepted_terms_at ?? undefined,
      });
      identifiedIdRef.current = user.id;
    } else if (!user && identifiedIdRef.current) {
      resetUser();
      identifiedIdRef.current = null;
    }
  }, [user, profile]);
}

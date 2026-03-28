"use client";

import { useEffect } from "react";

const STORAGE_KEY = "bragg_pending_invite";

interface StoreInviteCodeProps {
  code: string;
  groupName: string;
}

/**
 * Invisible component that stores the invite code in localStorage.
 * Rendered on /join/[code] for unauthenticated users so the code
 * survives through the login + onboarding flow.
 */
export function StoreInviteCode({ code, groupName }: StoreInviteCodeProps) {
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ code, groupName, storedAt: Date.now() })
      );
    } catch {
      // localStorage unavailable (private browsing, storage full) — graceful no-op
    }
  }, [code, groupName]);

  return null;
}

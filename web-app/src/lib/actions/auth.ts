"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { APP_URL } from "@/lib/constants";
import type { ActionResponse } from "@/types";

/**
 * Validate that redirectTo is a safe relative path.
 * Prevents open redirect attacks.
 */
function sanitizeRedirect(redirectTo?: string): string | undefined {
  if (!redirectTo) return undefined;
  // Must start with / and not start with // (protocol-relative URL)
  if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    return redirectTo;
  }
  return undefined;
}

const KNOWN_ERRORS: Record<string, string> = {
  "Email rate limit exceeded": "Too many requests. Please wait a moment and try again.",
  "For security purposes, you can only request this once every 60 seconds":
    "Please wait 60 seconds before requesting another link.",
};

export async function signInWithMagicLink(
  email: string,
  displayName: string,
  redirectTo?: string
): Promise<ActionResponse> {
  // Server-side validation
  if (!email || !email.includes("@") || email.length > 254) {
    return { success: false, error: "Please enter a valid email address" };
  }

  const trimmedName = (displayName || email.split("@")[0]).slice(0, 30);
  const safeRedirect = sanitizeRedirect(redirectTo);

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: { display_name: trimmedName },
      emailRedirectTo: `${APP_URL}/auth/callback${
        safeRedirect ? `?redirectTo=${encodeURIComponent(safeRedirect)}` : ""
      }`,
    },
  });

  if (error) {
    const userMessage = KNOWN_ERRORS[error.message] || "Unable to send magic link. Please try again.";
    return { success: false, error: userMessage };
  }

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

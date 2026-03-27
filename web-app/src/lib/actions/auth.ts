"use server";

import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { captureServerEvent, ANALYTICS_EVENTS } from "@/lib/posthog";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { APP_URL } from "@/lib/constants";
import type { ActionResponse } from "@/types";

/**
 * Validate that redirectTo is a safe relative path.
 * Prevents open redirect attacks.
 */
function sanitizeRedirect(redirectTo?: string): string | undefined {
  if (!redirectTo) return undefined;
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
  redirectTo?: string
): Promise<ActionResponse> {
  if (!email || !email.includes("@") || email.length > 254) {
    return { success: false, error: "Please enter a valid email address" };
  }

  const safeRedirect = sanitizeRedirect(redirectTo);
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${APP_URL}/auth/callback${
        safeRedirect ? `?redirectTo=${encodeURIComponent(safeRedirect)}` : ""
      }`,
    },
  });

  if (error) {
    logError({ layer: "action", operation: "signInWithMagicLink", metadata: { email } }, error);
    const userMessage = KNOWN_ERRORS[error.message] || "Unable to send magic link. Please try again.";
    return { success: false, error: userMessage };
  }

  captureServerEvent(email, ANALYTICS_EVENTS.AUTH_MAGIC_LINK_REQUESTED, { has_redirect: !!safeRedirect });
  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) captureServerEvent(user.id, ANALYTICS_EVENTS.AUTH_SIGNED_OUT);
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete("bragg_onboarded");
  cookieStore.delete("bragg_post_onboard_redirect");

  redirect("/");
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { logError, logInfo } from "@/lib/logger";
import { trackServerEvent, ANALYTICS_EVENTS } from "@/lib/analytics/server";
import { onboardingSchema } from "@/lib/validators";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResponse } from "@/types";

export async function completeOnboarding(
  displayName: string,
  dateOfBirth: string,
  acceptedTerms: boolean
): Promise<ActionResponse> {
  logInfo({ layer: "action", operation: "completeOnboarding" });

  const parsed = onboardingSchema.safeParse({
    displayName,
    dateOfBirth,
    acceptedTerms,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Server-side age re-check (defense in depth, independent of Zod)
  const dob = new Date(parsed.data.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (age < 18) {
    return { success: false, error: "You must be 18 or older to use Bragg" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName.trim(),
      date_of_birth: parsed.data.dateOfBirth,
      accepted_terms_at: new Date().toISOString(),
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) {
    logError(
      { layer: "action", operation: "completeOnboarding", metadata: { userId: user.id } },
      error
    );
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // No PII: display_name removed from event properties
  trackServerEvent(user.id, ANALYTICS_EVENTS.AUTH_ONBOARDING_COMPLETED);

  // Set the onboarded cookie
  const cookieStore = await cookies();
  cookieStore.set("bragg_onboarded", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  // Redirect to stored post-onboarding destination or dashboard
  const postRedirect = cookieStore.get("bragg_post_onboard_redirect")?.value || "/dashboard";
  cookieStore.delete("bragg_post_onboard_redirect");

  redirect(postRedirect);
}

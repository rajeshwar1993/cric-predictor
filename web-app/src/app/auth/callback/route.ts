import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackServerEvent, hashIdentifier, ANALYTICS_EVENTS } from "@/lib/analytics/server";

/**
 * Validate that redirectTo is a safe relative path.
 * Prevents open redirect attacks.
 */
function sanitizeRedirect(redirectTo?: string | null): string {
  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    return redirectTo;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = sanitizeRedirect(searchParams.get("redirectTo"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check onboarding status
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        trackServerEvent(user.id, ANALYTICS_EVENTS.AUTH_CALLBACK_SUCCESS, { is_new_user: !profile?.onboarding_completed });

        if (!profile?.onboarding_completed) {
          // Not onboarded — clear any stale cookie from a previous user, redirect to onboarding
          const response = NextResponse.redirect(`${origin}/onboarding`);
          response.cookies.delete("bragg_onboarded");
          response.cookies.set("bragg_post_onboard_redirect", redirectTo, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 3600,
            path: "/",
          });
          return response;
        }
      }

      // Already onboarded — set cookie and proceed
      const response = NextResponse.redirect(`${origin}${redirectTo}`);
      response.cookies.set("bragg_onboarded", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
      return response;
    }
  }

  // Hash the request URL to create a unique but opaque distinctId for this
  // failed callback. Avoids grouping all anonymous failures under one user.
  const anonId = await hashIdentifier(`auth-callback-fail:${request.url}:${Date.now()}`);
  trackServerEvent(anonId, ANALYTICS_EVENTS.AUTH_CALLBACK_FAILED);
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

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

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

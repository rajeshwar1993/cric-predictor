import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/group"];
const AUTH_ROUTES = ["/login"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT call supabase.auth.getSession() here.
  // getUser() actually verifies the session with Supabase Auth,
  // while getSession() only reads from cookie and can be spoofed.
  //
  // Wrapped in try-catch: if Supabase Auth is down or the cookie is
  // corrupted, treat the user as unauthenticated (fail closed).
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Auth service unavailable or malformed cookie — fail closed.
    // User will be redirected to /login by the checks below.
  }

  const { pathname } = request.nextUrl;

  const isOnboarded = !!request.cookies.get("bragg_onboarded")?.value;

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users away from onboarding
  if (!user && pathname === "/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated but not onboarded — gate protected routes
  if (
    user &&
    !isOnboarded &&
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // Already onboarded — redirect away from onboarding page
  if (user && isOnboarded && pathname === "/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = isOnboarded ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from landing page
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = isOnboarded ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

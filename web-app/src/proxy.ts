import { type NextRequest, NextResponse } from 'next/server'

import { COOKIE_NAMES, CURRENT_TERMS_VERSION, getMajorVersion } from '@/lib/constants'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { sanitizeRedirect } from '@/lib/url'

// ---------------------------------------------------------------------------
// Public route prefixes that bypass all proxy gates.
// The landing page `/` is handled explicitly in the proxy function
// because the matcher regex cannot exclude bare `/`.
// ---------------------------------------------------------------------------
const PUBLIC_PATH_PREFIXES = ['/login', '/auth', '/join', '/privacy', '/terms', '/api'] as const

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ---------------------------------------------------------------------------
// Proxy (Next.js 16 replacement for the deprecated `middleware` convention)
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Gate 0: Skip public routes ──────────────────────────────────────
  if (isPublicRoute(pathname)) {
    // Still refresh the Supabase session for public routes so cookies stay fresh
    const { supabase, response } = createMiddlewareClient(request)
    // Fire-and-forget session refresh (no auth gate)
    await supabase.auth.getUser()
    return response
  }

  // ── Create Supabase middleware client (refreshes session) ───────────
  const { supabase, response } = createMiddlewareClient(request)

  // ── Gate 1: Auth ────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const redirectTo = sanitizeRedirect(pathname + request.nextUrl.search)
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirectTo', redirectTo)
    return NextResponse.redirect(loginUrl)
  }

  // ── Gate 2: Onboarding ──────────────────────────────────────────────
  // Skip if already on /onboarding OR /accept-terms to avoid infinite redirect loops
  if (pathname !== '/onboarding' && pathname !== '/accept-terms') {
    const onboardedCookie = request.cookies.get(COOKIE_NAMES.ONBOARDED)
    if (!onboardedCookie) {
      const onboardingUrl = request.nextUrl.clone()
      onboardingUrl.pathname = '/onboarding'
      onboardingUrl.search = ''
      const redirectTo = sanitizeRedirect(pathname + request.nextUrl.search)
      onboardingUrl.searchParams.set('redirectTo', redirectTo)
      return NextResponse.redirect(onboardingUrl)
    }
  }

  // ── Gate 3: Terms version ───────────────────────────────────────────
  // Skip if already on /accept-terms OR /onboarding to avoid infinite redirect loops
  if (pathname !== '/accept-terms' && pathname !== '/onboarding') {
    const termsCookie = request.cookies.get(COOKIE_NAMES.TERMS_VERSION)
    const requiredMajor = getMajorVersion(CURRENT_TERMS_VERSION)
    const userMajor = termsCookie ? getMajorVersion(termsCookie.value) : 0

    if (isNaN(userMajor) || userMajor < requiredMajor) {
      const termsUrl = request.nextUrl.clone()
      termsUrl.pathname = '/accept-terms'
      termsUrl.search = ''
      return NextResponse.redirect(termsUrl)
    }
  }

  // ── All gates passed ────────────────────────────────────────────────
  return response
}

// ---------------------------------------------------------------------------
// Route matcher — excludes static assets. Public routes are handled above.
// ---------------------------------------------------------------------------
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}

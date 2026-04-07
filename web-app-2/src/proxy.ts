import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { COOKIES, CURRENT_TERMS_VERSION } from '@/lib/constants'

/**
 * Parse the major version number from a terms version string.
 * e.g., "2.1" → 2, "1.0" → 1
 */
function getMajorVersion(version: string): number {
  const dotIndex = version.indexOf('.')
  const majorStr = dotIndex >= 0 ? version.slice(0, dotIndex) : version
  return parseInt(majorStr, 10)
}

/**
 * Check if the user's terms version cookie matches the current major version.
 * Minor version differences (e.g., 2.0 → 2.1) are allowed through.
 */
function isTermsCurrent(cookieVersion: string | undefined): boolean {
  if (cookieVersion === undefined || cookieVersion === '') return false
  const cookieMajor = getMajorVersion(cookieVersion)
  const currentMajor = getMajorVersion(CURRENT_TERMS_VERSION)
  return cookieMajor === currentMajor
}

export async function proxy(request: NextRequest) {
  // Refresh Supabase session cookie
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Check authentication — look for Supabase auth cookies
  // The session refresh in updateSession already validated the session.
  // We check for the presence of any sb-* auth cookie as a fast indicator.
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))

  if (!hasAuthCookie) {
    // Not authenticated — redirect to login with return path
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check onboarding — cookie-only check (no DB query)
  const onboardedCookie = request.cookies.get(COOKIES.ONBOARDED)?.value
  if (onboardedCookie === undefined || onboardedCookie === '') {
    // Not onboarded — redirect to onboarding
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Check terms version — major version must match
  const termsCookie = request.cookies.get(COOKIES.TERMS_VERSION)?.value
  if (!isTermsCurrent(termsCookie)) {
    return NextResponse.redirect(new URL('/accept-terms', request.url))
  }

  // All checks passed — continue
  return response
}

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - / (landing page)
     * - /login
     * - /auth/callback
     * - /join/[code] (pre-auth join flow)
     * - /privacy
     * - /terms
     * - /onboarding (handled by its own page, not middleware-gated)
     * - /accept-terms (handled by its own page)
     * - _next/static, _next/image, favicon.ico, public assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|login|auth|join|privacy|terms|onboarding|accept-terms|api|$).*)',
  ],
}

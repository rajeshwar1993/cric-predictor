import { NextRequest, NextResponse } from 'next/server'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/server'
import { COOKIE_NAMES, CURRENT_TERMS_VERSION } from '@/lib/constants'
import { createServerClient } from '@/lib/supabase/server'
import { sanitizeRedirect } from '@/lib/url'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawRedirect = searchParams.get('redirectTo') || '/dashboard'
  const redirectTo = sanitizeRedirect(rawRedirect)

  // ── Missing code param ──────────────────────────────────────────────
  if (!code) {
    trackEvent('anonymous', ANALYTICS_EVENTS.AUTH_CALLBACK_FAILURE, {
      reason: 'missing_code',
    })
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  // ── Exchange code for session ───────────────────────────────────────
  const supabase = await createServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    trackEvent('anonymous', ANALYTICS_EVENTS.AUTH_CALLBACK_FAILURE, {
      reason: 'exchange_failed',
      error_message: error.message,
    })
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
  }

  // ── Get authenticated user ──────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    trackEvent('anonymous', ANALYTICS_EVENTS.AUTH_CALLBACK_FAILURE, {
      reason: 'no_user',
    })
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
  }

  // ── Fetch profile ───────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('onboarding_completed, terms_version, is_deleted')
    .eq('id', user.id)
    .single()

  // ── Handle deleted account restoration ──────────────────────────────
  if (profile?.is_deleted) {
    await supabase
      .from('v2_profiles')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', user.id)
  }

  // ── Determine redirect path ─────────────────────────────────────────
  const isOnboarded = profile?.onboarding_completed === true
  const destination = isOnboarded
    ? redirectTo
    : `/onboarding?redirectTo=${encodeURIComponent(redirectTo)}`

  const response = NextResponse.redirect(new URL(destination, request.url))

  // ── Set or clear cookies ────────────────────────────────────────────
  if (isOnboarded) {
    response.cookies.set(COOKIE_NAMES.ONBOARDED, 'true', {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
    })

    const termsVersion = profile?.terms_version ?? CURRENT_TERMS_VERSION
    response.cookies.set(COOKIE_NAMES.TERMS_VERSION, termsVersion, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
    })
  } else {
    // Clear stale cookie from previous user
    response.cookies.delete(COOKIE_NAMES.ONBOARDED)
  }

  // ── Analytics ───────────────────────────────────────────────────────
  trackEvent(user.id, ANALYTICS_EVENTS.AUTH_CALLBACK_SUCCESS, {
    is_onboarded: isOnboarded,
    is_restored: profile?.is_deleted === true,
  })

  return response
}

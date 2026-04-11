import { NextRequest, NextResponse } from 'next/server'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { captureServerError, trackEvent } from '@/lib/analytics/server'
import { AUTH_COOKIE_OPTIONS, COOKIE_NAMES, CURRENT_TERMS_VERSION, getMajorVersion } from '@/lib/constants'
import { createServerClient } from '@/lib/supabase/server'
import { sanitizeRedirect } from '@/lib/url'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawRedirect = searchParams.get('redirectTo') || '/dashboard'
  const redirectTo = sanitizeRedirect(rawRedirect)

  // ── Missing code param ──────────────────────────────────────────────
  if (!code) {
    // The `reason` field already categorises the failure (missing_code,
    // exchange_failed, no_user). Never include `error.message` — it can
    // contain user-supplied fragments like an email or token.
    await trackEvent('anonymous', ANALYTICS_EVENTS.AUTH_CALLBACK_FAILURE, {
      reason: 'missing_code',
    })
    await captureServerError('anonymous', new Error('auth_callback: missing code'), {
      source: 'authCallback',
      metadata: { reason: 'missing_code', route: '/auth/callback' },
    })
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  // ── Exchange code for session ───────────────────────────────────────
  const supabase = await createServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    await trackEvent('anonymous', ANALYTICS_EVENTS.AUTH_CALLBACK_FAILURE, {
      reason: 'exchange_failed',
    })
    await captureServerError('anonymous', error, {
      source: 'authCallback',
      metadata: { reason: 'exchange_failed', route: '/auth/callback' },
    })
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
  }

  // ── Get authenticated user ──────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    await trackEvent('anonymous', ANALYTICS_EVENTS.AUTH_CALLBACK_FAILURE, {
      reason: 'no_user',
    })
    await captureServerError('anonymous', new Error('auth_callback: no user after exchange'), {
      source: 'authCallback',
      metadata: { reason: 'no_user', route: '/auth/callback' },
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
  const termsVersion = profile?.terms_version ?? null
  const termsUpToDate = termsVersion !== null &&
    getMajorVersion(termsVersion) >= getMajorVersion(CURRENT_TERMS_VERSION)

  let destination: string
  if (!isOnboarded) {
    destination = `/onboarding?redirectTo=${encodeURIComponent(redirectTo)}`
  } else if (!termsUpToDate) {
    destination = '/accept-terms'
  } else {
    destination = redirectTo
  }

  const response = NextResponse.redirect(new URL(destination, request.url))

  // ── Set or clear cookies ────────────────────────────────────────────
  if (isOnboarded) {
    response.cookies.set(COOKIE_NAMES.ONBOARDED, 'true', AUTH_COOKIE_OPTIONS)

    // Only set terms cookie if it's current — avoids stale cookie triggering extra redirect
    if (termsUpToDate && termsVersion) {
      response.cookies.set(COOKIE_NAMES.TERMS_VERSION, termsVersion, AUTH_COOKIE_OPTIONS)
    }
  } else {
    // Clear stale cookie from previous user
    response.cookies.delete(COOKIE_NAMES.ONBOARDED)
  }

  // ── Analytics ───────────────────────────────────────────────────────
  await trackEvent(user.id, ANALYTICS_EVENTS.AUTH_CALLBACK_SUCCESS, {
    is_onboarded: isOnboarded,
    is_restored: profile?.is_deleted === true,
  })

  return response
}

import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createHash } from 'crypto'
import { trackServerEvent } from '@/lib/analytics/server'
import { AUTH_CALLBACK_FAILED, AUTH_CALLBACK_SUCCESS } from '@/lib/analytics/events'
import {
  COOKIES,
  CURRENT_TERMS_VERSION,
  LONG_COOKIE_OPTIONS,
  SHORT_COOKIE_OPTIONS,
} from '@/lib/constants'
import { env } from '@/lib/env'

/**
 * Sanitize a redirect path — only allow relative paths starting with `/`.
 */
function sanitizeRedirect(path?: string | null): string {
  if (
    path !== undefined &&
    path !== null &&
    path !== '' &&
    path.startsWith('/') &&
    !path.startsWith('//')
  ) {
    return path
  }
  return '/dashboard'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const redirectTo = sanitizeRedirect(searchParams.get('redirectTo'))

  if (code === null || code === '') {
    const hashedUrl = createHash('sha256')
      .update(`${request.url}:${Date.now().toString()}`)
      .digest('hex')
    trackServerEvent(hashedUrl, AUTH_CALLBACK_FAILED, { reason: 'missing_code' })
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
  }

  const cookieStore = await cookies()

  // Create Supabase client for this route handler
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    },
  )

  // Exchange code for session
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error !== null) {
    const hashedUrl = createHash('sha256')
      .update(`${request.url}:${Date.now().toString()}`)
      .digest('hex')
    trackServerEvent(hashedUrl, AUTH_CALLBACK_FAILED, {
      reason: 'exchange_failed',
      error_message: error.message,
    })
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('onboarding_completed, is_deleted')
    .eq('id', user.id)
    .single()

  // Restore deleted profile on re-sign-in
  if (profile?.is_deleted === true) {
    await supabase
      .from('v2_profiles')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', user.id)
  }

  const isOnboarded = profile?.onboarding_completed === true

  // Fire analytics
  trackServerEvent(user.id, AUTH_CALLBACK_SUCCESS, {
    is_new_user: profile === null,
  })

  if (!isOnboarded) {
    // Store intended redirect for after onboarding
    if (redirectTo !== '/dashboard') {
      cookieStore.set(COOKIES.POST_ONBOARD_REDIRECT, redirectTo, SHORT_COOKIE_OPTIONS)
    }
    return NextResponse.redirect(new URL('/onboarding', origin))
  }

  // Fully onboarded — set cookies and redirect
  cookieStore.set(COOKIES.ONBOARDED, '1', LONG_COOKIE_OPTIONS)
  cookieStore.set(COOKIES.TERMS_VERSION, CURRENT_TERMS_VERSION, LONG_COOKIE_OPTIONS)
  return NextResponse.redirect(new URL(redirectTo, origin))
}

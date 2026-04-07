'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/analytics/server'
import { AUTH_MAGIC_LINK_REQUESTED, AUTH_SIGNED_OUT } from '@/lib/analytics/events'
import { COOKIES } from '@/lib/constants'
import { env } from '@/lib/env'
import { createHash } from 'crypto'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize a redirect path — only allow relative paths starting with `/`.
 * Prevents open redirect attacks (protocol-relative `//evil.com`, absolute URLs).
 */
function sanitizeRedirect(path?: string | null): string | undefined {
  if (path === undefined || path === null || path === '') return undefined
  if (path.startsWith('/') && !path.startsWith('//')) return path
  return undefined
}

/**
 * Core sign-out logic shared between signOut and deleteAccount actions.
 * Clears Supabase session + app cookies.
 */
export async function performSignOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete(COOKIES.ONBOARDED)
  cookieStore.delete(COOKIES.TERMS_VERSION)
  cookieStore.delete(COOKIES.POST_ONBOARD_REDIRECT)
}

// ---------------------------------------------------------------------------
// AUTH-API-001: signInWithMagicLink
// ---------------------------------------------------------------------------

interface ActionResult {
  success: boolean
  error?: string
}

export async function signInWithMagicLink(
  email: string,
  redirectTo?: string,
): Promise<ActionResult> {
  // Validate email format
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail.includes('@') || trimmedEmail.length > 254 || trimmedEmail.length < 3) {
    return { success: false, error: 'Please enter a valid email address' }
  }

  // Sanitize redirect
  const sanitizedRedirect = sanitizeRedirect(redirectTo)
  const callbackUrl = new URL('/auth/callback', env.NEXT_PUBLIC_APP_URL)
  if (sanitizedRedirect !== undefined) {
    callbackUrl.searchParams.set('redirectTo', sanitizedRedirect)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  })

  if (error !== null) {
    // Map Supabase errors to user-friendly messages
    if (error.message.includes('rate') || error.status === 429) {
      return { success: false, error: 'Please wait a moment and try again' }
    }
    if (error.message.includes('60 seconds') || error.message.includes('cooldown')) {
      return { success: false, error: 'Please wait 60 seconds before requesting another link' }
    }
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  // Fire analytics event with hashed email as distinct_id
  const hashedEmail = createHash('sha256').update(trimmedEmail).digest('hex')
  trackServerEvent(hashedEmail, AUTH_MAGIC_LINK_REQUESTED, {
    has_redirect: sanitizedRedirect !== undefined,
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// AUTH-API-003: signOut
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user !== null) {
    trackServerEvent(user.id, AUTH_SIGNED_OUT, {})
  }

  await performSignOut()
  redirect('/')
}

// AUTH-API-005: acceptUpdatedTerms is exported from ./onboarding.ts

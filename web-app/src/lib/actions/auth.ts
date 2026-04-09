'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { COOKIE_NAMES } from '@/lib/constants'
import { env } from '@/lib/env'
import { sanitizeRedirect } from '@/lib/url'
import { trackEvent } from '@/lib/analytics/server'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import type { ActionResult } from '@/types'

const emailSchema = z.string().min(1, 'Email is required').email('Please enter a valid email address')

/**
 * Hash an email address to create a pseudo-userId for pre-auth analytics.
 * Uses a simple hash — not cryptographic, just consistent.
 */
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Send a magic link to the given email address via Supabase OTP.
 *
 * @param email - The user's email address
 * @param redirectTo - Optional post-auth redirect path (e.g. "/dashboard")
 */
export async function sendMagicLink(
  email: string,
  redirectTo?: string,
): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Please enter a valid email address' }
  }

  const supabase = await createServerClient()

  const callbackUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/callback`
  const params = new URLSearchParams()
  if (redirectTo) {
    const safeRedirect = sanitizeRedirect(redirectTo)
    params.set('redirectTo', safeRedirect)
  }
  const emailRedirectTo = params.toString()
    ? `${callbackUrl}?${params.toString()}`
    : callbackUrl

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo,
    },
  })

  if (error) {
    if (error.status === 429) {
      return { success: false, error: 'Too many attempts. Please try again later.' }
    }
    return { success: false, error: 'Failed to send magic link. Please try again.' }
  }

  // Fire analytics event with hashed email as pseudo-userId
  const pseudoUserId = await hashEmail(parsed.data)
  trackEvent(pseudoUserId, ANALYTICS_EVENTS.MAGIC_LINK_REQUESTED, {
    email_hash: pseudoUserId,
  })

  return { success: true }
}

/**
 * Sign the current user out of Supabase, clear onboarding/terms cookies,
 * and redirect to the landing page.
 */
export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: error.message }
    }

    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAMES.ONBOARDED)
    cookieStore.delete(COOKIE_NAMES.TERMS_VERSION)
  } catch {
    return { success: false, error: 'Failed to sign out. Please try again.' }
  }

  redirect('/')
}

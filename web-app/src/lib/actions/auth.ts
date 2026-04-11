'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { AUTH_COOKIE_OPTIONS, COOKIE_NAMES, CURRENT_TERMS_VERSION, isAtLeast18 } from '@/lib/constants'
import { env } from '@/lib/env'
import { sanitizeRedirect } from '@/lib/url'
import { captureServerError, trackEvent } from '@/lib/analytics/server'
import { withTiming } from '@/lib/analytics/timing'
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
  // Pre-auth — there's no user.id yet, so we hash the email up-front and use
  // it as the pseudo-userId for both the timing wrapper and the success
  // event. Validation runs first so an invalid email doesn't burn a hash.
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Please enter a valid email address' }
  }

  const pseudoUserId = await hashEmail(parsed.data)

  return withTiming('sendMagicLink', pseudoUserId, async () => {
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
      captureServerError(pseudoUserId, error, {
        source: 'sendMagicLink',
        metadata: {
          status: error.status,
          email_hash: pseudoUserId,
        },
      })
      if (error.status === 429) {
        return { success: false, error: 'Too many attempts. Please try again later.' }
      }
      return { success: false, error: 'Failed to send magic link. Please try again.' }
    }

    // Fire analytics event with hashed email as pseudo-userId
    trackEvent(pseudoUserId, ANALYTICS_EVENTS.MAGIC_LINK_REQUESTED, {
      email_hash: pseudoUserId,
    })

    return { success: true }
  })
}

const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(30, 'Display name must be at most 30 characters')
    .regex(/^[a-zA-Z0-9 _\-.']+$/, 'Display name can only contain letters, numbers, spaces, hyphens, underscores, periods, and apostrophes'),
  dateOfBirth: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date')
    .refine((val) => isAtLeast18(new Date(val)), 'You must be 18 or older to use Bragg'),
  termsAccepted: z
    .boolean()
    .refine((val) => val === true, 'You must accept the Terms of Service and Privacy Policy'),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>

/**
 * Complete onboarding for a first-time user.
 *
 * Updates the user's profile with display name, date of birth,
 * terms acceptance, and marks onboarding as complete.
 * Sets auth cookies and redirects to dashboard (or a provided redirectTo path).
 */
export async function completeOnboarding(
  data: OnboardingInput,
  redirectTo?: string,
): Promise<ActionResult> {
  // Auth check needs to run before withTiming so we have a userId for the
  // duration event. The auth check itself is cheap and the timing window we
  // care about is the profile update.
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'You must be logged in to complete onboarding.' }
  }

  const userId = user.id

  // `withTiming` lets the redirect throw propagate naturally — the finally
  // block runs before the throw escapes, so SERVER_ACTION_DURATION still fires.
  const result = await withTiming<ActionResult>(
    'completeOnboarding',
    userId,
    async () => {
      // Guard: prevent already-onboarded users from overwriting their profile
      const { data: existingProfile } = await supabase
        .from('v2_profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single()
      if (existingProfile?.onboarding_completed) {
        return { success: false, error: 'Onboarding already completed.' }
      }

      // Validate input
      const parsed = onboardingSchema.safeParse(data)
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
        return { success: false, error: firstError }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('v2_profiles')
        .update({
          display_name: parsed.data.displayName,
          date_of_birth: parsed.data.dateOfBirth,
          terms_version: CURRENT_TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
          onboarding_completed: true,
        })
        .eq('id', userId)

      if (updateError) {
        captureServerError(userId, updateError, {
          source: 'completeOnboarding',
          metadata: { stage: 'profile_update' },
        })
        return { success: false, error: 'Failed to save your profile. Please try again.' }
      }

      // Set cookies
      const cookieStore = await cookies()
      cookieStore.set(COOKIE_NAMES.ONBOARDED, 'true', AUTH_COOKIE_OPTIONS)
      cookieStore.set(COOKIE_NAMES.TERMS_VERSION, CURRENT_TERMS_VERSION, AUTH_COOKIE_OPTIONS)

      // Analytics
      trackEvent(userId, ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
        display_name: parsed.data.displayName,
      })

      return { success: true }
    },
  )

  // Only redirect on success — early-return errors must propagate to the caller.
  if (!result.success) {
    return result
  }

  const safeRedirect = redirectTo ? sanitizeRedirect(redirectTo) : '/dashboard'
  redirect(safeRedirect)
}

/**
 * Accept updated terms of service.
 *
 * Updates the user's profile with the current terms version and acceptance timestamp,
 * sets the terms version cookie, fires an analytics event, and redirects to /dashboard.
 */
export async function acceptTerms(): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'You must be logged in to accept terms.' }
  }

  const userId = user.id

  const result = await withTiming<ActionResult>(
    'acceptTerms',
    userId,
    async () => {
      // Update profile
      const { error: updateError } = await supabase
        .from('v2_profiles')
        .update({
          terms_version: CURRENT_TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        captureServerError(userId, updateError, {
          source: 'acceptTerms',
          metadata: { stage: 'profile_update' },
        })
        return { success: false, error: 'Failed to accept terms. Please try again.' }
      }

      // Set cookie
      const cookieStore = await cookies()
      cookieStore.set(COOKIE_NAMES.TERMS_VERSION, CURRENT_TERMS_VERSION, AUTH_COOKIE_OPTIONS)

      // Analytics
      trackEvent(userId, ANALYTICS_EVENTS.TERMS_ACCEPTED)

      return { success: true }
    },
  )

  if (!result.success) {
    return result
  }

  redirect('/dashboard')
}

/**
 * Sign the current user out of Supabase, clear onboarding/terms cookies,
 * fire analytics, and redirect to the landing page.
 */
export async function signOut(): Promise<ActionResult> {
  // Resolve userId BEFORE wrapping in withTiming so the duration event has a
  // valid distinctId. The Supabase session is destroyed inside withTiming.
  let userId = 'anonymous'
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {
    // Best-effort — fall through to the wrapped block; signOut still runs.
  }

  const result = await withTiming<ActionResult>('signOut', userId, async () => {
    try {
      const supabase = await createServerClient()

      const { error } = await supabase.auth.signOut()

      if (error) {
        captureServerError(userId, error, {
          source: 'signOut',
          metadata: { stage: 'auth_sign_out' },
        })
        return { success: false, error: error.message }
      }

      const cookieStore = await cookies()
      cookieStore.delete(COOKIE_NAMES.ONBOARDED)
      cookieStore.delete(COOKIE_NAMES.TERMS_VERSION)

      // Fire analytics event if we had a user
      if (userId !== 'anonymous') {
        trackEvent(userId, ANALYTICS_EVENTS.SIGNED_OUT)
      }

      return { success: true }
    } catch (error) {
      captureServerError(userId, error, {
        source: 'signOut',
        metadata: { stage: 'unexpected' },
      })
      return { success: false, error: 'Failed to sign out. Please try again.' }
    }
  })

  if (!result.success) {
    return result
  }

  redirect('/')
}

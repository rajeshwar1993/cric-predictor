'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/analytics/server'
import { AUTH_ONBOARDING_COMPLETED } from '@/lib/analytics/events'
import { COOKIES, CURRENT_TERMS_VERSION, LONG_COOKIE_OPTIONS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ActionResult {
  success: boolean
  error?: string
}

function calculateAge(dob: Date, today: Date): number {
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

// ---------------------------------------------------------------------------
// AUTH-API-004: completeOnboarding
// ---------------------------------------------------------------------------

export async function completeOnboarding(
  displayName: string,
  dateOfBirth: string,
  acceptedTerms: boolean,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/login')
  }

  // Validate display name
  const trimmedName = displayName.trim()
  if (trimmedName.length < 2 || trimmedName.length > 30) {
    return { success: false, error: 'Display name must be 2–30 characters' }
  }

  // Validate date of birth
  const dob = new Date(dateOfBirth)
  if (isNaN(dob.getTime())) {
    return { success: false, error: 'Please enter a valid date of birth' }
  }

  const age = calculateAge(dob, new Date())
  if (age < 18) {
    return { success: false, error: 'You must be at least 18 years old to use Bragg' }
  }

  // Validate terms acceptance
  if (!acceptedTerms) {
    return { success: false, error: 'You must accept the terms to continue' }
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('v2_profiles')
    .update({
      display_name: trimmedName,
      date_of_birth: dateOfBirth,
      terms_version: CURRENT_TERMS_VERSION,
      terms_accepted_at: new Date().toISOString(),
      onboarding_completed: true,
    })
    .eq('id', user.id)

  if (updateError !== null) {
    return { success: false, error: 'Failed to save profile. Please try again.' }
  }

  // Set cookies
  const cookieStore = await cookies()
  cookieStore.set(COOKIES.ONBOARDED, '1', LONG_COOKIE_OPTIONS)
  cookieStore.set(COOKIES.TERMS_VERSION, CURRENT_TERMS_VERSION, LONG_COOKIE_OPTIONS)

  // Fire analytics
  trackServerEvent(user.id, AUTH_ONBOARDING_COMPLETED, {})

  // Check for post-onboard redirect
  const postRedirect = cookieStore.get(COOKIES.POST_ONBOARD_REDIRECT)?.value
  if (postRedirect !== undefined && postRedirect !== '') {
    cookieStore.delete(COOKIES.POST_ONBOARD_REDIRECT)
    redirect(postRedirect)
  }

  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// AUTH-API-005: acceptUpdatedTerms
// ---------------------------------------------------------------------------

export async function acceptUpdatedTerms(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  const { error: updateError } = await supabase
    .from('v2_profiles')
    .update({
      terms_version: CURRENT_TERMS_VERSION,
      terms_accepted_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError !== null) {
    return { success: false, error: 'Failed to update terms. Please try again.' }
  }

  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set(COOKIES.TERMS_VERSION, CURRENT_TERMS_VERSION, LONG_COOKIE_OPTIONS)

  redirect('/dashboard')
}

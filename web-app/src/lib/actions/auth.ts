'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { COOKIE_NAMES } from '@/lib/constants'

type ActionResult = { success: true } | { success: false; error: string }

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

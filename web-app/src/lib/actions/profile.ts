'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { trackEvent } from '@/lib/analytics/server'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import type { ActionResult } from '@/types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Display name must be at least 2 characters')
  .max(30, 'Display name must be at most 30 characters')

// ---------------------------------------------------------------------------
// updateDisplayName
// ---------------------------------------------------------------------------

/**
 * Update the current user's display name.
 *
 * Flow: auth check → fetch current profile → no-op short-circuit →
 *       rate limit → validate → cross-gang uniqueness check → update →
 *       revalidate → analytics → return.
 *
 * The no-op short-circuit runs before rate limiting so a user double-clicking
 * Save with the same name never burns their hourly budget.
 *
 * Cross-gang uniqueness: queries every gang the user is an approved member
 * of and rejects the new name if any other approved member in any of those
 * gangs already uses it (case-sensitive). The error message includes the
 * offending gang name(s) so the user can resolve the conflict.
 *
 * @param newName - The desired display name (2–30 characters after trim)
 * @returns ActionResult
 *
 * @see docs/stories/PRF-001-profile-page.md
 */
export async function updateDisplayName(
  newName: string,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Fetch the current profile FIRST so we can short-circuit no-op saves
  // before touching the rate limiter. A user double-clicking Save with the
  // same name should never burn their hourly budget.
  const { data: currentProfile, error: profileError } = await supabase
    .from('v2_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return {
      success: false,
      error: 'Failed to update display name. Please try again.',
    }
  }

  // No-op short-circuit: if the trimmed incoming name equals the stored name
  // we return success without hitting the rate limiter, running validation,
  // updating the DB, revalidating caches, or firing analytics.
  const trimmedIncoming = typeof newName === 'string' ? newName.trim() : ''
  if (
    trimmedIncoming.length > 0 &&
    currentProfile?.display_name === trimmedIncoming
  ) {
    return { success: true }
  }

  // Rate limit: 10 per hour
  const rl = await rateLimit(user.id, 'update_display_name', {
    max: 10,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate
  const parsed = displayNameSchema.safeParse(newName)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid display name'
    return { success: false, error: firstError }
  }
  const trimmedName = parsed.data

  // Find every gang the user is an approved member of
  const { data: memberships, error: membershipsError } = await supabase
    .from('v2_gang_members')
    .select('gang_id')
    .eq('user_id', user.id)
    .eq('status', 'approved')

  if (membershipsError) {
    return { success: false, error: 'Failed to update display name. Please try again.' }
  }

  const gangIds = (memberships ?? []).map((m) => m.gang_id)

  // Cross-gang uniqueness check — only run if the user belongs to at least
  // one gang. The query joins to v2_profiles via inner-join so PostgREST
  // can filter on display_name, and to v2_gangs!inner so the response
  // includes the offending gang name for each collision row.
  if (gangIds.length > 0) {
    const { data: collisions, error: collisionsError } = await supabase
      .from('v2_gang_members')
      .select('gang_id, v2_gangs!inner(name), v2_profiles!inner(display_name)')
      .in('gang_id', gangIds)
      .eq('status', 'approved')
      .eq('v2_profiles.display_name', trimmedName)
      .neq('user_id', user.id)

    if (collisionsError) {
      return {
        success: false,
        error: 'Failed to update display name. Please try again.',
      }
    }

    if (collisions && collisions.length > 0) {
      // Deduplicate gang names — a single gang shouldn't appear twice, but
      // a defensive `Set` keeps the error message tidy.
      const offendingGangNames = Array.from(
        new Set(
          collisions.map((row) => {
            // PostgREST returns the joined relation as an object, but the
            // generated types may model it as an array. Cast through unknown
            // to extract the gang name.
            const gang = row.v2_gangs as unknown as { name: string } | null
            return gang?.name ?? 'another gang'
          }),
        ),
      )

      const gangList = offendingGangNames.map((n) => `'${n}'`).join(', ')
      const verb = offendingGangNames.length === 1 ? 'has' : 'have'

      return {
        success: false,
        error: `A member in ${gangList} already ${verb} this name. Pick something different.`,
      }
    }
  }

  // Update the profile
  const { error: updateError } = await supabase
    .from('v2_profiles')
    .update({ display_name: trimmedName })
    .eq('id', user.id)

  if (updateError) {
    return {
      success: false,
      error: 'Failed to update display name. Please try again.',
    }
  }

  // Revalidate the profile page and every gang page the user belongs to.
  // We revalidate at the 'layout' level so the (app) layout — which renders
  // NavBar and the user menu — re-renders with the new display name. A
  // page-level revalidation would leave the NavBar showing the old name.
  revalidatePath('/profile', 'layout')
  for (const gangId of gangIds) {
    revalidatePath(`/group/${gangId}`, 'layout')
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.DISPLAY_NAME_UPDATED, {
    new_display_name: trimmedName,
  })

  return { success: true }
}

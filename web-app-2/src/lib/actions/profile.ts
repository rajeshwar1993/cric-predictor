'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { trackServerEvent } from '@/lib/analytics/server'
import { PROFILE_UPDATED } from '@/lib/analytics/events'
import { rateLimit, formatRetryAfter, RATE_LIMITS } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpdateProfileResult = { success: true } | { success: false; error: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(val: unknown): string {
  return String(val)
}

function hasError(result: { error: unknown }): boolean {
  return result.error !== null && result.error !== undefined
}

function hasNoData(result: { data: unknown }): boolean {
  return result.data === null || result.data === undefined
}

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

/**
 * LB-API-001: Update the current user's profile.
 *
 * - Validates displayName is 2-30 chars after trim
 * - Checks for name collision within user's approved gangs
 * - Updates v2_profiles.display_name
 * - Fires PROFILE_UPDATED event
 * - Revalidates /profile and /dashboard
 */
export async function updateProfile(updates: {
  displayName?: string
}): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  // Rate limit check
  const rl = rateLimit(user.id, 'update_profile', RATE_LIMITS.update_profile)
  if (!rl.allowed) {
    return {
      success: false,
      error: `Too many requests. Please try again in ${formatRetryAfter(rl.retryAfterMs ?? 0)}.`,
    }
  }

  const changedFields: string[] = []

  // Validate display name
  if (updates.displayName !== undefined) {
    const trimmed = updates.displayName.trim()

    if (trimmed.length < 2 || trimmed.length > 30) {
      return { success: false, error: 'Display name must be 2-30 characters' }
    }

    const serviceClient = createServiceRoleClient()

    // Check current name — if same, no-op
    const currentProfileResult = await serviceClient
      .from('v2_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (hasError(currentProfileResult) || hasNoData(currentProfileResult)) {
      return { success: false, error: 'Profile not found' }
    }

    const currentName = toStr((currentProfileResult.data as { display_name: unknown }).display_name)

    if (currentName === trimmed) {
      // No change — success no-op
      return { success: true }
    }

    // Get all gangs where user is an approved member
    const gangMemberResult = await serviceClient
      .from('v2_gang_members')
      .select('gang_id')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    if (!hasNoData(gangMemberResult)) {
      const gangRows = gangMemberResult.data as Array<{ gang_id: unknown }>
      const gangIds = gangRows.map((g) => toStr(g.gang_id))

      if (gangIds.length > 0) {
        // For each gang, check if another approved member has the same name
        // Get all approved members in those gangs (excluding current user)
        const otherMembersResult = await serviceClient
          .from('v2_gang_members')
          .select('gang_id, user_id')
          .in('gang_id', gangIds)
          .eq('status', 'approved')
          .neq('user_id', user.id)

        if (!hasNoData(otherMembersResult)) {
          const otherMembers = otherMembersResult.data as Array<{
            gang_id: unknown
            user_id: unknown
          }>
          const otherUserIds = [...new Set(otherMembers.map((m) => toStr(m.user_id)))]

          if (otherUserIds.length > 0) {
            // Get profiles of other members
            const otherProfilesResult = await serviceClient
              .from('v2_profiles')
              .select('id, display_name')
              .in('id', otherUserIds)

            if (!hasNoData(otherProfilesResult)) {
              const otherProfiles = otherProfilesResult.data as Array<{
                id: unknown
                display_name: unknown
              }>

              // Build a map of userId → displayName
              const nameMap = new Map<string, string>()
              for (const p of otherProfiles) {
                nameMap.set(toStr(p.id), toStr(p.display_name ?? ''))
              }

              // Check collision per gang
              for (const member of otherMembers) {
                const memberName = nameMap.get(toStr(member.user_id))
                if (
                  memberName !== undefined &&
                  memberName.toLowerCase() === trimmed.toLowerCase()
                ) {
                  // Get gang name for error message
                  const gangNameResult = await serviceClient
                    .from('v2_gangs')
                    .select('name')
                    .eq('id', toStr(member.gang_id))
                    .single()

                  const gangName = !hasNoData(gangNameResult)
                    ? toStr((gangNameResult.data as { name: unknown }).name)
                    : 'one of your gangs'

                  return {
                    success: false,
                    error: `Display name already taken in one of your gangs: ${gangName}`,
                  }
                }
              }
            }
          }
        }
      }
    }

    // Update profile
    const updateResult = await serviceClient
      .from('v2_profiles')
      .update({ display_name: trimmed })
      .eq('id', user.id)

    if (hasError(updateResult)) {
      return { success: false, error: "Couldn't save changes. Try again." }
    }

    changedFields.push('display_name')
  }

  // If nothing changed, no-op
  if (changedFields.length === 0) {
    return { success: true }
  }

  // Analytics
  trackServerEvent(user.id, PROFILE_UPDATED, {
    fields_changed: changedFields,
  })

  // Revalidate
  revalidatePath('/profile')
  revalidatePath('/dashboard')

  return { success: true }
}

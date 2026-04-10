'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { trackEvent } from '@/lib/analytics/server'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { COOKIE_NAMES } from '@/lib/constants'
import type { ActionResult } from '@/types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Display name must be at least 2 characters')
  .max(30, 'Display name must be at most 30 characters')

/**
 * Escape PostgREST `ilike` wildcards so a user-supplied display name cannot
 * accidentally match unrelated rows. Without this, a user typing "100%" would
 * collide with every name starting with "100" because `%` and `_` are LIKE
 * wildcards. Backslashes are also escaped so the pattern is applied literally.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

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
 * gangs already uses it (case-insensitive — "Virat" and "virat" collide).
 * LIKE wildcards (`%`, `_`, `\`) in the user input are escaped so a name
 * like "100%" cannot accidentally match "100abc". The error message includes
 * the offending gang name(s) so the user can resolve the conflict.
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

  // Find every gang the user is an approved member of. Soft-deleted gangs
  // are excluded via an inner join on `v2_gangs.is_deleted = false` so we
  // don't fire `revalidatePath` for ghost paths after the update.
  const { data: memberships, error: membershipsError } = await supabase
    .from('v2_gang_members')
    .select('gang_id, v2_gangs!inner(is_deleted)')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .eq('v2_gangs.is_deleted', false)

  if (membershipsError) {
    return { success: false, error: 'Failed to update display name. Please try again.' }
  }

  const gangIds = (memberships ?? []).map(
    (m: { gang_id: string }) => m.gang_id,
  )

  // Cross-gang uniqueness check — only run if the user belongs to at least
  // one gang. The query joins to v2_profiles via inner-join so PostgREST
  // can filter on display_name, and to v2_gangs!inner so the response
  // includes the offending gang name for each collision row.
  if (gangIds.length > 0) {
    // Case-insensitive collision check. PostgREST's `ilike` is ILIKE under
    // the hood so "Virat" matches "virat". The user-supplied name is
    // escaped via `escapeLikePattern` so LIKE wildcards (`%`, `_`, `\`)
    // typed by the user do not fan out to unrelated rows.
    const escapedName = escapeLikePattern(trimmedName)
    const { data: collisions, error: collisionsError } = await supabase
      .from('v2_gang_members')
      .select('gang_id, v2_gangs!inner(name), v2_profiles!inner(display_name)')
      .in('gang_id', gangIds)
      .eq('status', 'approved')
      .ilike('v2_profiles.display_name', escapedName)
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

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

/**
 * Permanently delete the current user's account.
 *
 * Flow: auth check → `delete_account` RPC (atomic admin succession + gang
 * cleanup + profile soft-delete) → analytics → sign out (best effort) →
 * clear cookies (best effort) → redirect to `/`.
 *
 * The RPC runs in a single transaction and is the source of truth for
 * admin auto-promotion, gang soft-deletion when the admin is the only
 * member left, and the notifications those events generate. If the RPC
 * fails the user is NOT signed out — their account is still intact and
 * they should be able to retry.
 *
 * **Post-RPC failure handling (R-001 + R-002).** Once the RPC succeeds
 * the account is durably soft-deleted in the database. From that point
 * on, signOut and cookie deletion are recoverable cleanup steps — a
 * failure there must NOT roll the user-facing action back into an error
 * state, because:
 *   - The account is already gone, so "please try again" is misleading
 *     and a retry would hit USER_NOT_FOUND from the RPC.
 *   - The `account_deleted` analytics event represents the RPC
 *     succeeding, not the signOut, and skewing deletion metrics on
 *     signOut flake is worse than firing slightly before the session
 *     tear-down completes.
 * Analytics therefore fires immediately after a successful RPC, and
 * signOut/cookie deletion are each isolated in their own try/catch so
 * the happy-path redirect always runs.
 *
 * Structured like `signOut` in `@/lib/actions/auth` so the `redirect()`
 * throw (NEXT_REDIRECT) sits OUTSIDE the try/catch and propagates to
 * Next.js untouched.
 *
 * @see docs/stories/PRF-002-delete-account.md
 * @see supabase/supabase/migrations/20260406000012_delete_account_rpc.sql
 */
export async function deleteAccount(): Promise<ActionResult> {
  try {
    const supabase = await createServerClient()

    // Auth check — capture the user id BEFORE signOut destroys the session
    // so we can fire analytics with the correct distinctId.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    const userId = user.id

    // Call the atomic delete_account RPC. On failure, return an error
    // WITHOUT signing the user out — their account is still intact.
    const { error: rpcError } = await supabase.rpc('delete_account', {
      p_user_id: userId,
    })

    if (rpcError) {
      return {
        success: false,
        error: 'Failed to delete account. Please try again.',
      }
    }

    // The RPC has succeeded — the account is durably soft-deleted. From
    // here on, every remaining step is best-effort cleanup. Analytics
    // fires FIRST so a flaky signOut cannot skew deletion metrics (the
    // "account deleted" event represents the RPC succeeding, not the
    // session tear-down).
    trackEvent(userId, ANALYTICS_EVENTS.ACCOUNT_DELETED)

    // Sign out (best effort). The profile is already soft-deleted, so a
    // failure here leaves the user in a half-authenticated state but does
    // NOT mean the action failed. Log and continue to cookie cleanup.
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.error(
          '[deleteAccount] signOut failed after successful RPC:',
          signOutError.message,
        )
      }
    } catch (signOutException) {
      console.error(
        '[deleteAccount] signOut threw after successful RPC:',
        signOutException,
      )
    }

    // Clear onboarding/terms cookies (mirrors signOut in auth.ts). The
    // auth cookies may be partially invalid after a best-effort signOut,
    // so each deletion is isolated — one failure must not prevent the
    // other cookie from being cleared or the redirect from firing.
    try {
      const cookieStore = await cookies()
      try {
        cookieStore.delete(COOKIE_NAMES.ONBOARDED)
      } catch (cookieError) {
        console.error(
          '[deleteAccount] failed to delete onboarded cookie:',
          cookieError,
        )
      }
      try {
        cookieStore.delete(COOKIE_NAMES.TERMS_VERSION)
      } catch (cookieError) {
        console.error(
          '[deleteAccount] failed to delete terms_version cookie:',
          cookieError,
        )
      }
    } catch (cookieStoreError) {
      console.error(
        '[deleteAccount] failed to access cookie store:',
        cookieStoreError,
      )
    }
  } catch (error) {
    // Forensic trail for the most irreversible action in the app. Matches
    // the `[deleteAccount]` log prefix used by the best-effort cleanup
    // steps above so failures across the whole action are easy to grep.
    console.error('[deleteAccount] unexpected failure:', error)
    return {
      success: false,
      error: 'Failed to delete account. Please try again.',
    }
  }

  // `redirect()` throws NEXT_REDIRECT which MUST propagate to Next.js,
  // so it sits outside the try/catch above.
  redirect('/')
}

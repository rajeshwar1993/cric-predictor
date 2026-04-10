'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { trackEvent } from '@/lib/analytics/server'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import type { ActionResult } from '@/types'

const gangNameSchema = z.string().trim().min(3).max(50)

/**
 * Create a new gang via the `create_gang` Postgres RPC.
 *
 * Flow: auth check → rate limit → validate → RPC → analytics → revalidate → return gangId.
 *
 * @param gangName - The desired gang name (3–50 characters after trim)
 * @returns ActionResult with gangId and inviteCode on success
 *
 * @see docs/stories/DASH-002-create-gang.md
 */
export async function createGang(
  gangName: string,
): Promise<ActionResult<{ gangId: string; inviteCode: string }>> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 10 per hour
  const rl = await rateLimit(user.id, 'create_gang', {
    max: 10,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate gang name
  const parsed = gangNameSchema.safeParse(gangName)
  if (!parsed.success) {
    return { success: false, error: 'Gang name must be 3\u201350 characters' }
  }

  // Call RPC
  const { data, error } = await supabase.rpc('create_gang', {
    p_gang_name: parsed.data,
    p_creator_id: user.id,
  })

  if (error) {
    if (error.message.includes('MAX_GANGS_REACHED')) {
      return {
        success: false,
        error: "You've reached the maximum of 40 gangs.",
      }
    }
    if (error.message.includes('INVITE_CODE_GENERATION_FAILED')) {
      return {
        success: false,
        error: 'Unable to generate invite code. Please try again.',
      }
    }
    return { success: false, error: 'Failed to create gang. Please try again.' }
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.GANG_CREATED, {
    gang_name: parsed.data,
  })

  // Revalidate dashboard to reflect new gang
  revalidatePath('/dashboard')

  // data is the new gang_id returned by the RPC.
  // inviteCode is empty here because the RPC only returns the gang_id.
  // The invite code is fetched separately on the gang detail page via the gangs DAL.
  return { success: true, data: { gangId: data as string, inviteCode: '' } }
}

// ---------------------------------------------------------------------------
// joinGangByCode
// ---------------------------------------------------------------------------

const inviteCodeSchema = z
  .string()
  .length(6, 'Invite code must be exactly 6 characters')
  .regex(/^[A-Z0-9]+$/, 'Invite code must be uppercase alphanumeric')

/**
 * Join a gang by its 6-character invite code.
 *
 * Flow: auth check → rate limit → validate → RPC lookup → membership checks →
 *       insert/upsert member → notify admin → analytics → revalidate → return.
 *
 * @param inviteCode - The 6-character uppercase alphanumeric invite code
 * @returns ActionResult with gangId and status ('approved' | 'pending')
 *
 * @see docs/stories/DASH-003-join-gang.md
 */
export async function joinGangByCode(
  inviteCode: string,
): Promise<ActionResult<{ gangId: string; status: 'approved' | 'pending' }>> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 20 per hour
  const rl = await rateLimit(user.id, 'join_gang', {
    max: 20,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate invite code
  const parsed = inviteCodeSchema.safeParse(inviteCode)
  if (!parsed.success) {
    return { success: false, error: 'Invalid invite code' }
  }

  // Look up gang by invite code via RPC (SECURITY DEFINER — bypasses RLS)
  const { data: gangRows, error: rpcError } = await supabase.rpc(
    'get_gang_by_invite_code',
    { p_invite_code: parsed.data },
  )

  const gang = !rpcError && gangRows && gangRows.length > 0 ? gangRows[0] : null

  if (!gang) {
    return { success: false, error: 'Invalid invite code' }
  }

  // Check gang is not deleted
  if (gang.is_deleted) {
    return { success: false, error: 'This gang no longer exists' }
  }

  // Check existing membership
  const { data: existingMember } = await supabase
    .from('v2_gang_members')
    .select('status, is_blocked')
    .eq('gang_id', gang.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMember) {
    // Blocked — always reject
    if (existingMember.is_blocked) {
      return { success: false, error: 'You are not able to join this gang' }
    }

    switch (existingMember.status) {
      case 'approved':
        return {
          success: false,
          error: `already_a_member:${gang.id}`,
        }
      case 'pending':
        return {
          success: false,
          error: 'Your request is pending admin approval',
        }
      case 'rejected':
      case 'left':
      case 'removed':
        // Allow rejoin — will upsert below
        break
    }
  }

  // Check gang member count (< 20 approved)
  const { count: approvedCount } = await supabase
    .from('v2_gang_members')
    .select('*', { count: 'exact', head: true })
    .eq('gang_id', gang.id)
    .eq('status', 'approved')

  if ((approvedCount ?? 0) >= 20) {
    return {
      success: false,
      error: 'This gang has reached its maximum of 20 members',
    }
  }

  // Check user's total gang count (< 40)
  const { count: userGangCount } = await supabase
    .from('v2_gang_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'approved')

  if ((userGangCount ?? 0) >= 40) {
    return {
      success: false,
      error: "You've reached the maximum of 40 gangs.",
    }
  }

  // Display name uniqueness check
  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (profile?.display_name) {
    const { data: duplicateName } = await supabase
      .from('v2_gang_members')
      .select('user_id, v2_profiles!inner(display_name)')
      .eq('gang_id', gang.id)
      .eq('status', 'approved')
      .eq('v2_profiles.display_name', profile.display_name)
      .neq('user_id', user.id)
      .limit(1)

    if (duplicateName && duplicateName.length > 0) {
      return {
        success: false,
        error: 'A member with your display name already exists in this gang. Please update your display name first.',
      }
    }
  }

  // Determine status based on gang's auto_accept setting
  const newStatus: 'approved' | 'pending' = gang.auto_accept
    ? 'approved'
    : 'pending'

  const now = new Date().toISOString()

  // Upsert the membership (handles both new inserts and rejoins)
  if (existingMember) {
    // Update existing row — clear departed_at on rejoin, always update requested_at
    const { error: updateError } = await supabase
      .from('v2_gang_members')
      .update({
        status: newStatus,
        departed_at: null,
        requested_at: now,
        ...(newStatus === 'approved' ? { approved_at: now } : {}),
      })
      .eq('gang_id', gang.id)
      .eq('user_id', user.id)

    if (updateError) {
      return { success: false, error: 'Failed to join gang. Please try again.' }
    }
  } else {
    // Insert new row
    const { error: insertError } = await supabase
      .from('v2_gang_members')
      .insert({
        gang_id: gang.id,
        user_id: user.id,
        role: 'member' as const,
        status: newStatus,
        is_blocked: false,
        ...(newStatus === 'approved' ? { approved_at: now } : {}),
      })

    if (insertError) {
      return { success: false, error: 'Failed to join gang. Please try again.' }
    }
  }

  // Send notification to admin
  const { data: adminMember } = await supabase
    .from('v2_gang_members')
    .select('user_id')
    .eq('gang_id', gang.id)
    .eq('role', 'admin')
    .eq('status', 'approved')
    .limit(1)
    .single()

  if (adminMember) {
    const notificationType = newStatus === 'approved' ? 'new_member' : 'join_request'
    const displayName = profile?.display_name ?? 'Someone'
    const notificationTitle =
      newStatus === 'approved'
        ? 'New member joined'
        : 'New join request'
    const notificationBody =
      newStatus === 'approved'
        ? `${displayName} has joined your gang.`
        : `${displayName} wants to join your gang.`

    // TODO: Notification schema in database.ts uses title/body/data (placeholder).
    // The PRD defines message/gang_id/fixture_id/is_read. Align when writing
    // the notification migration (Phase 13 — NTF stories).
    await supabase.from('v2_notifications').insert({
      user_id: adminMember.user_id,
      type: notificationType,
      title: notificationTitle,
      body: notificationBody,
      data: { gang_id: gang.id, user_id: user.id },
    })
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.JOIN_REQUESTED, {
    gang_id: gang.id,
    status: newStatus,
    invite_code: parsed.data,
  })

  // Revalidate pages
  revalidatePath('/dashboard')
  revalidatePath(`/group/${gang.id}`)

  return { success: true, data: { gangId: gang.id, status: newStatus } }
}

// ---------------------------------------------------------------------------
// approveJoinRequest
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid()

/**
 * Approve a pending join request.
 *
 * Flow: auth check → rate limit → validate UUIDs → admin verification →
 *       member count check → display name uniqueness → update status →
 *       notification → analytics → revalidate → return.
 *
 * @param gangId - The gang UUID
 * @param userId - The requesting user's UUID
 * @returns ActionResult
 *
 * @see docs/stories/GANG-002-pending-requests.md
 */
export async function approveJoinRequest(
  gangId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 60 per hour
  const rl = await rateLimit(user.id, 'approve_join_request', {
    max: 60,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate UUIDs
  const gangIdParsed = uuidSchema.safeParse(gangId)
  const userIdParsed = uuidSchema.safeParse(userId)
  if (!gangIdParsed.success || !userIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Admin verification
  const { data: adminMember } = await supabase
    .from('v2_gang_members')
    .select('role, status')
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminMember || adminMember.role !== 'admin' || adminMember.status !== 'approved') {
    return { success: false, error: 'Only gang admins can approve requests' }
  }

  // Check gang member count (< 20 approved)
  const { count: approvedCount } = await supabase
    .from('v2_gang_members')
    .select('*', { count: 'exact', head: true })
    .eq('gang_id', gangId)
    .eq('status', 'approved')

  if ((approvedCount ?? 0) >= 20) {
    return {
      success: false,
      error: 'This gang has reached its maximum of 20 members',
    }
  }

  // Check display name uniqueness
  const { data: requesterProfile } = await supabase
    .from('v2_profiles')
    .select('display_name')
    .eq('id', userId)
    .single()

  if (requesterProfile?.display_name) {
    const { data: duplicateName } = await supabase
      .from('v2_gang_members')
      .select('user_id, v2_profiles!inner(display_name)')
      .eq('gang_id', gangId)
      .eq('status', 'approved')
      .eq('v2_profiles.display_name', requesterProfile.display_name)
      .neq('user_id', userId)
      .limit(1)

    if (duplicateName && duplicateName.length > 0) {
      return {
        success: false,
        error: 'A member with the same display name already exists in this gang.',
      }
    }
  }

  // Update status to approved — use .select() to detect race conditions
  const now = new Date().toISOString()
  const { data: updatedRows, error: updateError } = await supabase
    .from('v2_gang_members')
    .update({
      status: 'approved' as const,
      approved_at: now,
    })
    .eq('gang_id', gangId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select()

  if (updateError) {
    return { success: false, error: 'Failed to approve request. Please try again.' }
  }

  // If no rows were updated, the request was already processed (race condition)
  if (!updatedRows || updatedRows.length === 0) {
    return { success: false, error: 'This request has already been processed.' }
  }

  // Fetch gang name for notification
  const { data: gangData } = await supabase
    .from('v2_gangs')
    .select('name')
    .eq('id', gangId)
    .single()

  const gangName = gangData?.name ?? 'the gang'

  // Send notification to the requester
  await supabase.from('v2_notifications').insert({
    user_id: userId,
    type: 'join_approved' as const,
    title: 'Request approved',
    body: `Your request to join ${gangName} has been approved!`,
    data: { gang_id: gangId },
  })

  // Revalidate paths
  revalidatePath(`/group/${gangId}`)
  revalidatePath(`/group/${gangId}/settings`)

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.MEMBER_APPROVED, {
    gang_id: gangId,
    approved_user_id: userId,
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// rejectJoinRequest
// ---------------------------------------------------------------------------

/**
 * Reject a pending join request.
 *
 * Flow: auth check → rate limit → validate UUIDs → admin verification →
 *       update status → notification → analytics → revalidate → return.
 *
 * @param gangId - The gang UUID
 * @param userId - The requesting user's UUID
 * @returns ActionResult
 *
 * @see docs/stories/GANG-002-pending-requests.md
 */
export async function rejectJoinRequest(
  gangId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 60 per hour
  const rl = await rateLimit(user.id, 'reject_join_request', {
    max: 60,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate UUIDs
  const gangIdParsed = uuidSchema.safeParse(gangId)
  const userIdParsed = uuidSchema.safeParse(userId)
  if (!gangIdParsed.success || !userIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Admin verification
  const { data: adminMember } = await supabase
    .from('v2_gang_members')
    .select('role, status')
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminMember || adminMember.role !== 'admin' || adminMember.status !== 'approved') {
    return { success: false, error: 'Only gang admins can reject requests' }
  }

  // Update status to rejected — use .select() to detect race conditions
  const { data: updatedRows, error: updateError } = await supabase
    .from('v2_gang_members')
    .update({
      status: 'rejected' as const,
    })
    .eq('gang_id', gangId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select()

  if (updateError) {
    return { success: false, error: 'Failed to reject request. Please try again.' }
  }

  // If no rows were updated, the request was already processed (race condition)
  if (!updatedRows || updatedRows.length === 0) {
    return { success: false, error: 'This request has already been processed.' }
  }

  // Fetch gang name for notification
  const { data: gangData } = await supabase
    .from('v2_gangs')
    .select('name')
    .eq('id', gangId)
    .single()

  const gangName = gangData?.name ?? 'the gang'

  // Send notification to the requester
  await supabase.from('v2_notifications').insert({
    user_id: userId,
    type: 'join_rejected' as const,
    title: 'Request declined',
    body: `Your request to join ${gangName} was declined.`,
    data: { gang_id: gangId },
  })

  // Revalidate paths
  revalidatePath(`/group/${gangId}`)
  revalidatePath(`/group/${gangId}/settings`)

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.MEMBER_REJECTED, {
    gang_id: gangId,
    rejected_user_id: userId,
  })

  return { success: true }
}

// ---------------------------------------------------------------------------
// leaveGang
// ---------------------------------------------------------------------------

/**
 * Leave a gang. Sets the member's status to `left` and records `departed_at`.
 *
 * Flow: auth check → rate limit → validate gangId → verify approved member
 *       with role='member' (not admin) → update status → analytics →
 *       revalidate → return.
 *
 * Admin guard: admins cannot leave — they must delete the gang instead.
 * Race condition guard: `.select()` after `.update()` to check row count.
 *
 * @param gangId - The gang UUID to leave
 * @returns ActionResult
 *
 * @see docs/stories/GANG-004-leave-gang.md
 */
export async function leaveGang(gangId: string): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 10 per hour
  const rl = await rateLimit(user.id, 'leave_gang', {
    max: 10,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate gangId
  const gangIdParsed = uuidSchema.safeParse(gangId)
  if (!gangIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Verify user is an approved member with role='member' (not admin)
  const { data: membership } = await supabase
    .from('v2_gang_members')
    .select('role, status')
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || membership.status !== 'approved') {
    return { success: false, error: 'You are not a member of this gang' }
  }

  if (membership.role === 'admin') {
    return {
      success: false,
      error: 'Admins cannot leave. Delete the gang instead.',
    }
  }

  // Update status to 'left' with departed_at — use .select() for race condition guard
  const now = new Date().toISOString()
  const { data: updatedRows, error: updateError } = await supabase
    .from('v2_gang_members')
    .update({
      status: 'left' as const,
      departed_at: now,
    })
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .select()

  if (updateError) {
    return { success: false, error: 'Failed to leave gang. Please try again.' }
  }

  // Race condition: if no rows updated, the status was already changed
  if (!updatedRows || updatedRows.length === 0) {
    return { success: false, error: 'You are not a member of this gang' }
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.MEMBER_LEFT, {
    gang_id: gangIdParsed.data,
  })

  // Revalidate paths
  revalidatePath('/dashboard')
  revalidatePath(`/group/${gangIdParsed.data}`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// updateGangName
// ---------------------------------------------------------------------------

/**
 * Narrow typed shape for the Supabase client where `delete_gang` is not yet
 * present in the generated `Database['public']['Functions']` types. Cast only
 * at the `deleteGang` call site, not across the whole client.
 *
 * The RPC signature is `delete_gang(p_gang_id UUID)` — the caller is resolved
 * via `auth.uid()` inside the function so the client must not pass a caller
 * id. See migration 20260409000016_delete_gang_rpc_auth_uid.sql.
 *
 * TODO: regenerate src/types/database.ts via `npx supabase gen types
 * typescript` so the new `delete_gang(p_gang_id)` signature is auto-included
 * and this shim can be removed.
 */
interface DeleteGangRpcClient {
  rpc(
    fn: 'delete_gang',
    args: { p_gang_id: string },
  ): Promise<{ data: null; error: { message: string; code?: string } | null }>
}

/**
 * Verify that the given user is an approved admin of a non-deleted gang.
 *
 * Returns `true` when BOTH:
 *   1. The gang exists with `is_deleted = false`.
 *   2. A matching membership row exists with `role='admin' AND status='approved'`.
 *
 * Returning `false` for a soft-deleted gang (instead of a distinct error)
 * avoids information leakage — the caller surfaces a generic "not found or
 * no permission" message so a non-admin can't probe gang existence.
 *
 * Shared helper for all gang-admin mutations (update name, auto-accept,
 * deadline, delete).
 */
async function isApprovedGangAdmin(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  gangId: string,
  userId: string,
): Promise<boolean> {
  // Single round-trip: inner-join v2_gang_members on the gang so a
  // non-admin caller (or a soft-deleted gang) resolves to `data: null`.
  // Returning `false` for both cases avoids information leakage — the
  // caller surfaces a generic "not found or no permission" message so a
  // non-admin can't probe gang existence.
  const { data, error } = await supabase
    .from('v2_gangs')
    .select('id, members:v2_gang_members!inner(role, status)')
    .eq('id', gangId)
    .eq('is_deleted', false)
    .eq('members.user_id', userId)
    .eq('members.role', 'admin')
    .eq('members.status', 'approved')
    .maybeSingle()

  return Boolean(data) && !error
}

/**
 * Update a gang's display name (admin only).
 *
 * Flow: auth → rate limit → validate → admin verification → update →
 *       revalidate → return.
 *
 * @param gangId - The gang UUID
 * @param newName - The new gang name (3–50 chars after trim)
 * @returns ActionResult
 *
 * @see docs/stories/SET-001-gang-settings.md
 */
export async function updateGangName(
  gangId: string,
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

  // Rate limit: 30 per hour
  const rl = await rateLimit(user.id, 'update_gang_name', {
    max: 30,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate gangId
  const gangIdParsed = uuidSchema.safeParse(gangId)
  if (!gangIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Validate name
  const nameParsed = gangNameSchema.safeParse(newName)
  if (!nameParsed.success) {
    return { success: false, error: 'Gang name must be 3\u201350 characters' }
  }

  // Admin verification (also guards against soft-deleted gangs)
  const isAdmin = await isApprovedGangAdmin(
    supabase,
    gangIdParsed.data,
    user.id,
  )
  if (!isAdmin) {
    return {
      success: false,
      error: "Gang not found or you don't have permission",
    }
  }

  // Update — defense-in-depth soft-delete filter. `.select('id')` lets us
  // detect the zero-rows case (e.g. the gang was soft-deleted between the
  // admin check and the update) so we don't silently report success.
  const { data: updatedRows, error: updateError } = await supabase
    .from('v2_gangs')
    .update({ name: nameParsed.data })
    .eq('id', gangIdParsed.data)
    .eq('is_deleted', false)
    .select('id')

  if (updateError) {
    return { success: false, error: 'Failed to update gang name. Please try again.' }
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      error: "Gang not found or you don't have permission",
    }
  }

  // Revalidate
  revalidatePath('/dashboard')
  revalidatePath(`/group/${gangIdParsed.data}`)
  revalidatePath(`/group/${gangIdParsed.data}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// updateAutoAccept
// ---------------------------------------------------------------------------

/**
 * Toggle a gang's auto-accept join requests setting (admin only).
 *
 * Flow: auth → rate limit → validate → admin verification → update →
 *       revalidate → return.
 *
 * @param gangId - The gang UUID
 * @param autoAccept - New auto-accept value
 * @returns ActionResult
 *
 * @see docs/stories/SET-001-gang-settings.md
 */
export async function updateAutoAccept(
  gangId: string,
  autoAccept: boolean,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 30 per hour
  const rl = await rateLimit(user.id, 'update_auto_accept', {
    max: 30,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate gangId
  const gangIdParsed = uuidSchema.safeParse(gangId)
  if (!gangIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Validate payload
  if (typeof autoAccept !== 'boolean') {
    return { success: false, error: 'Invalid request' }
  }

  // Admin verification (also guards against soft-deleted gangs)
  const isAdmin = await isApprovedGangAdmin(
    supabase,
    gangIdParsed.data,
    user.id,
  )
  if (!isAdmin) {
    return {
      success: false,
      error: "Gang not found or you don't have permission",
    }
  }

  // Update — defense-in-depth soft-delete filter. `.select('id')` lets us
  // detect the zero-rows case (e.g. the gang was soft-deleted between the
  // admin check and the update) so we don't silently report success.
  const { data: updatedRows, error: updateError } = await supabase
    .from('v2_gangs')
    .update({ auto_accept: autoAccept })
    .eq('id', gangIdParsed.data)
    .eq('is_deleted', false)
    .select('id')

  if (updateError) {
    return { success: false, error: 'Failed to update setting. Please try again.' }
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      error: "Gang not found or you don't have permission",
    }
  }

  // Revalidate
  revalidatePath(`/group/${gangIdParsed.data}`)
  revalidatePath(`/group/${gangIdParsed.data}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// updatePredictionDeadline
// ---------------------------------------------------------------------------

const predictionDeadlineSchema = z
  .number({ error: 'Deadline must be a number' })
  .int('Deadline must be a whole number of minutes')
  .min(15, 'Deadline must be at least 15 minutes')
  .max(720, 'Deadline must be at most 720 minutes (12 hours)')

/**
 * Update a gang's custom prediction deadline (minutes before match start).
 *
 * Writes to `v2_gang_league_seasons.prediction_deadline_mins` for the
 * currently active season row (`is_active = true`).
 *
 * Flow: auth → rate limit → validate → admin verification → update →
 *       revalidate → return.
 *
 * @param gangId - The gang UUID
 * @param minutes - New deadline in minutes (15–720, integer)
 * @returns ActionResult
 *
 * @see docs/stories/SET-001-gang-settings.md
 */
export async function updatePredictionDeadline(
  gangId: string,
  minutes: number,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 30 per hour
  const rl = await rateLimit(user.id, 'update_prediction_deadline', {
    max: 30,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate gangId
  const gangIdParsed = uuidSchema.safeParse(gangId)
  if (!gangIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Validate minutes
  const minutesParsed = predictionDeadlineSchema.safeParse(minutes)
  if (!minutesParsed.success) {
    const issue = minutesParsed.error.issues[0]
    return {
      success: false,
      error: issue?.message ?? 'Deadline must be between 15 and 720 minutes',
    }
  }

  // Admin verification (also guards against soft-deleted gangs)
  const isAdmin = await isApprovedGangAdmin(
    supabase,
    gangIdParsed.data,
    user.id,
  )
  if (!isAdmin) {
    return {
      success: false,
      error: "Gang not found or you don't have permission",
    }
  }

  // Update active season row. Use .select() to detect the zero- and
  // multi-row cases — a strict assertion of "exactly one active season
  // updated" so the admin never sees silent success when the row set is
  // unexpected.
  const { data: updatedRows, error: updateError } = await supabase
    .from('v2_gang_league_seasons')
    .update({ prediction_deadline_mins: minutesParsed.data })
    .eq('gang_id', gangIdParsed.data)
    .eq('is_active', true)
    .select('gang_id')

  if (updateError) {
    return { success: false, error: 'Failed to update deadline. Please try again.' }
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      error:
        'This gang is not yet enrolled in an active season. Try again after the next season starts.',
    }
  }

  if (updatedRows.length > 1) {
    // Data-integrity drift: there should be at most one active season row
    // per gang. A DB unique partial index is the real fix, but log + bail
    // so we notice the drift and don't silently update multiple rows.
    console.warn(
      `[updatePredictionDeadline] unexpected multi-row update: gang_id=${gangIdParsed.data} rows=${updatedRows.length}`,
    )
    return {
      success: false,
      error: 'Unexpected number of active seasons. Please contact support.',
    }
  }

  // Revalidate
  revalidatePath(`/group/${gangIdParsed.data}`)
  revalidatePath(`/group/${gangIdParsed.data}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// deleteGang
// ---------------------------------------------------------------------------

/**
 * Delete a gang (admin only). Soft-deletes via the `delete_gang` RPC which
 * atomically verifies admin, soft-deletes the gang, and inserts
 * `gang_deleted` notifications for all approved members.
 *
 * Flow: auth → rate limit → validate → RPC → error mapping → analytics →
 *       revalidate → return.
 *
 * @param gangId - The gang UUID
 * @returns ActionResult
 *
 * @see docs/stories/SET-001-gang-settings.md
 * @see supabase/migrations/20260407000009_delete_gang_rpc.sql
 */
export async function deleteGang(gangId: string): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 5 per hour (conservative — deletion is destructive)
  const rl = await rateLimit(user.id, 'delete_gang', {
    max: 5,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate gangId
  const gangIdParsed = uuidSchema.safeParse(gangId)
  if (!gangIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Call the delete_gang RPC. The generated Supabase Functions type does not
  // yet include this RPC (migration 20260409000016 has not been picked up by
  // db:types), so we cast the client to a narrow typed shim.
  //
  // Since the RPC resolves the caller via `auth.uid()` we MUST NOT pass
  // `p_caller_id` — the old signature was vulnerable to caller-id spoofing.
  // TODO: remove cast once `db:types` is regenerated.
  const rpcClient = supabase as unknown as DeleteGangRpcClient
  const { error } = await rpcClient.rpc('delete_gang', {
    p_gang_id: gangIdParsed.data,
  })

  if (error) {
    // Auth failure (defensive — should not trigger because the action
    // already calls supabase.auth.getUser() above).
    if (error.message.includes('NOT_AUTHENTICATED')) {
      return { success: false, error: 'You must be signed in' }
    }
    // Admin check failure — raised by the RPC with SQLSTATE 42501 and
    // message 'NOT_GANG_ADMIN'. Match on the message first so the
    // NOT_AUTHENTICATED branch above isn't shadowed by the shared errcode.
    if (
      error.message.includes('NOT_GANG_ADMIN') ||
      error.code === '42501'
    ) {
      return {
        success: false,
        error: 'Only gang admins can delete the gang',
      }
    }
    // Not-found / already-deleted (custom SQLSTATE P0001)
    if (
      error.message.includes('GANG_NOT_FOUND') ||
      error.message.includes('GANG_ALREADY_DELETED')
    ) {
      return { success: false, error: 'This gang no longer exists' }
    }
    return { success: false, error: 'Failed to delete gang. Please try again.' }
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.GANG_DELETED, {
    gang_id: gangIdParsed.data,
  })

  // Revalidate
  revalidatePath('/dashboard')
  revalidatePath(`/group/${gangIdParsed.data}`)
  revalidatePath(`/group/${gangIdParsed.data}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

/**
 * Remove a member from a gang (admin only). Sets the target member row's
 * status to `removed` and records `departed_at`. The member can rejoin
 * with an invite code unless they are also blocked.
 *
 * Flow: auth → rate limit → validate UUIDs → admin verification →
 *       guard self → guard admin target → update (race-guarded) →
 *       analytics → revalidate → return.
 *
 * @param gangId - The gang UUID
 * @param userId - The UUID of the member to remove
 * @returns ActionResult
 *
 * @see docs/stories/SET-002-member-management.md
 */
export async function removeMember(
  gangId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 30 per hour
  const rl = await rateLimit(user.id, 'remove_member', {
    max: 30,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate UUIDs
  const gangIdParsed = uuidSchema.safeParse(gangId)
  const userIdParsed = uuidSchema.safeParse(userId)
  if (!gangIdParsed.success || !userIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Admin verification (also guards against soft-deleted gangs)
  const isAdmin = await isApprovedGangAdmin(
    supabase,
    gangIdParsed.data,
    user.id,
  )
  if (!isAdmin) {
    return {
      success: false,
      error: "Gang not found or you don't have permission",
    }
  }

  // Self-guard: admins cannot remove themselves via this action. Match the
  // leaveGang copy so the admin sees a single consistent recovery hint
  // across the product ("Delete the gang instead.").
  if (userIdParsed.data === user.id) {
    return {
      success: false,
      error: 'Admins cannot leave. Delete the gang instead.',
    }
  }

  // Admin target guard: cannot remove another admin.
  const { data: targetMember } = await supabase
    .from('v2_gang_members')
    .select('role')
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', userIdParsed.data)
    .maybeSingle()

  if (targetMember?.role === 'admin') {
    return {
      success: false,
      error: 'Admins cannot be removed or blocked',
    }
  }

  // Update — race-guarded by status='approved'. `.neq('role', 'admin')` is
  // belt-and-braces defense at the DB level in case a future role-change
  // race flips the target to admin between the guard above and the update.
  const now = new Date().toISOString()
  const { data: updatedRows, error: updateError } = await supabase
    .from('v2_gang_members')
    .update({
      status: 'removed' as const,
      departed_at: now,
    })
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', userIdParsed.data)
    .eq('status', 'approved')
    .neq('role', 'admin')
    .select()

  if (updateError) {
    return {
      success: false,
      error: 'Failed to remove member. Please try again.',
    }
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      error: 'This member is no longer active in the gang.',
    }
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.MEMBER_REMOVED, {
    gang_id: gangIdParsed.data,
    removed_user_id: userIdParsed.data,
  })

  // Revalidate
  revalidatePath(`/group/${gangIdParsed.data}`)
  revalidatePath(`/group/${gangIdParsed.data}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// blockMember
// ---------------------------------------------------------------------------

/**
 * Block a member from a gang (admin only). Sets `is_blocked = true` on the
 * target member row. If the member is currently `approved`, also attempts
 * to transition their status to `removed` with `departed_at = now()` in the
 * same update — race-guarded by `status='approved'` so a concurrent
 * leave/remove is not clobbered. If the race is lost, a fallback update sets
 * only `is_blocked=true` and leaves the new status intact. Blocked members
 * cannot rejoin — even if the gang has auto-accept enabled — until they are
 * unblocked.
 *
 * Flow: auth → rate limit → validate UUIDs → admin verification →
 *       guard self → guard admin target → read current status →
 *       race-guarded update (+ fallback) → analytics → revalidate → return.
 *
 * @param gangId - The gang UUID
 * @param userId - The UUID of the member to block
 * @returns ActionResult
 *
 * @see docs/stories/SET-002-member-management.md
 */
export async function blockMember(
  gangId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 30 per hour
  const rl = await rateLimit(user.id, 'block_member', {
    max: 30,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate UUIDs
  const gangIdParsed = uuidSchema.safeParse(gangId)
  const userIdParsed = uuidSchema.safeParse(userId)
  if (!gangIdParsed.success || !userIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Admin verification (also guards against soft-deleted gangs)
  const isAdmin = await isApprovedGangAdmin(
    supabase,
    gangIdParsed.data,
    user.id,
  )
  if (!isAdmin) {
    return {
      success: false,
      error: "Gang not found or you don't have permission",
    }
  }

  // Self-guard: match the leaveGang copy so the admin always sees a
  // consistent recovery hint ("Delete the gang instead.").
  if (userIdParsed.data === user.id) {
    return {
      success: false,
      error: 'Admins cannot leave. Delete the gang instead.',
    }
  }

  // Admin target guard + read current status so we can decide whether
  // the block update should also transition status→'removed'.
  const { data: targetMember } = await supabase
    .from('v2_gang_members')
    .select('role, status')
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', userIdParsed.data)
    .maybeSingle()

  if (!targetMember) {
    return {
      success: false,
      error: 'Member not found in this gang',
    }
  }

  if (targetMember.role === 'admin') {
    return {
      success: false,
      error: 'Admins cannot be removed or blocked',
    }
  }

  // Update strategy:
  //   - If the target is currently `approved`, attempt a race-guarded update
  //     that also transitions status→'removed' with `departed_at=now()` so the
  //     member loses access immediately.
  //   - If the race-guarded update affects zero rows, the status changed
  //     between the read and the write (e.g. the user left or another admin
  //     removed them). In that case fall through to a plain `is_blocked=true`
  //     update so we don't clobber the new status / departed_at.
  //   - If the target is not currently `approved`, a plain `is_blocked=true`
  //     update is enough.
  if (targetMember.status === 'approved') {
    const now = new Date().toISOString()
    // `.neq('role', 'admin')` is belt-and-braces defense at the DB level
    // against a future role-change race between the guard above and the
    // update.
    const { data: guardedRows, error: guardedError } = await supabase
      .from('v2_gang_members')
      .update({
        is_blocked: true,
        status: 'removed' as const,
        departed_at: now,
      })
      .eq('gang_id', gangIdParsed.data)
      .eq('user_id', userIdParsed.data)
      .eq('status', 'approved')
      .neq('role', 'admin')
      .select()

    if (guardedError) {
      return {
        success: false,
        error: 'Failed to block member. Please try again.',
      }
    }

    if (!guardedRows || guardedRows.length === 0) {
      // Race lost — status is no longer 'approved'. Apply block without
      // touching status or departed_at so we preserve whatever transition
      // happened between the read and the write. Keep the admin filter.
      const { error: fallbackError } = await supabase
        .from('v2_gang_members')
        .update({ is_blocked: true })
        .eq('gang_id', gangIdParsed.data)
        .eq('user_id', userIdParsed.data)
        .neq('role', 'admin')

      if (fallbackError) {
        return {
          success: false,
          error: 'Failed to block member. Please try again.',
        }
      }
    }
  } else {
    const { error: updateError } = await supabase
      .from('v2_gang_members')
      .update({ is_blocked: true })
      .eq('gang_id', gangIdParsed.data)
      .eq('user_id', userIdParsed.data)
      .neq('role', 'admin')

    if (updateError) {
      return {
        success: false,
        error: 'Failed to block member. Please try again.',
      }
    }
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.MEMBER_BLOCKED, {
    gang_id: gangIdParsed.data,
    blocked_user_id: userIdParsed.data,
  })

  // Revalidate
  revalidatePath(`/group/${gangIdParsed.data}`)
  revalidatePath(`/group/${gangIdParsed.data}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// unblockMember
// ---------------------------------------------------------------------------

/**
 * Unblock a previously blocked member (admin only). Sets `is_blocked = false`
 * on the target member row. Does NOT automatically reinstate the member —
 * they must request to join again (or use an invite code if auto-accept is
 * enabled). Returns an error if the target row does not exist in the gang.
 *
 * Flow: auth → rate limit → validate UUIDs → admin verification →
 *       update (with row count) → analytics → revalidate → return.
 *
 * @param gangId - The gang UUID
 * @param userId - The UUID of the member to unblock
 * @returns ActionResult
 *
 * @see docs/stories/SET-002-member-management.md
 */
export async function unblockMember(
  gangId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 30 per hour
  const rl = await rateLimit(user.id, 'unblock_member', {
    max: 30,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate UUIDs
  const gangIdParsed = uuidSchema.safeParse(gangId)
  const userIdParsed = uuidSchema.safeParse(userId)
  if (!gangIdParsed.success || !userIdParsed.success) {
    return { success: false, error: 'Invalid request' }
  }

  // Admin verification (also guards against soft-deleted gangs)
  const isAdmin = await isApprovedGangAdmin(
    supabase,
    gangIdParsed.data,
    user.id,
  )
  if (!isAdmin) {
    return {
      success: false,
      error: "Gang not found or you don't have permission",
    }
  }

  // Target lookup — surface a distinct error for missing rows and block
  // admins from being unblocked via this action (parity with blockMember).
  const { data: targetMember } = await supabase
    .from('v2_gang_members')
    .select('role')
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', userIdParsed.data)
    .maybeSingle()

  if (!targetMember) {
    return {
      success: false,
      error: 'Member not found in this gang',
    }
  }

  if (targetMember.role === 'admin') {
    return {
      success: false,
      error: 'Admins cannot be blocked or unblocked',
    }
  }

  // Update + count affected rows so we can distinguish "member not found"
  // from "update succeeded". Without `.select()` Supabase returns an empty
  // response on an update that matches zero rows, which would silently fire
  // analytics for a non-existent row.
  const { data: updatedRows, error: updateError } = await supabase
    .from('v2_gang_members')
    .update({ is_blocked: false })
    .eq('gang_id', gangIdParsed.data)
    .eq('user_id', userIdParsed.data)
    .select()

  if (updateError) {
    return {
      success: false,
      error: 'Failed to unblock member. Please try again.',
    }
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      error: 'Member not found in this gang',
    }
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.MEMBER_UNBLOCKED, {
    gang_id: gangIdParsed.data,
    unblocked_user_id: userIdParsed.data,
  })

  // Revalidate
  revalidatePath(`/group/${gangIdParsed.data}`)
  revalidatePath(`/group/${gangIdParsed.data}/settings`)

  return { success: true }
}

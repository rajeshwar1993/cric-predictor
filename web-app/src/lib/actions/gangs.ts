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
 * Flow: auth check → admin verification → rate limit → validate UUIDs →
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

  // Admin verification
  const { data: adminMember } = await supabase
    .from('v2_gang_members')
    .select('role, status')
    .eq('gang_id', gangId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminMember || adminMember.role !== 'admin' || adminMember.status !== 'approved') {
    return { success: false, error: 'Only gang admins can approve requests' }
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
 * Flow: auth check → admin verification → rate limit → validate UUIDs →
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

  // Admin verification
  const { data: adminMember } = await supabase
    .from('v2_gang_members')
    .select('role, status')
    .eq('gang_id', gangId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminMember || adminMember.role !== 'admin' || adminMember.status !== 'approved') {
    return { success: false, error: 'Only gang admins can reject requests' }
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

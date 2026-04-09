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
    // Update existing row
    const { error: updateError } = await supabase
      .from('v2_gang_members')
      .update({
        status: newStatus,
        is_blocked: false,
        ...(newStatus === 'approved'
          ? { approved_at: now }
          : { requested_at: now }),
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
    const notificationType = newStatus === 'approved' ? 'join_approved' : 'join_request'
    const displayName = profile?.display_name ?? 'Someone'
    const notificationTitle =
      newStatus === 'approved'
        ? 'New member joined'
        : 'New join request'
    const notificationBody =
      newStatus === 'approved'
        ? `${displayName} has joined your gang.`
        : `${displayName} wants to join your gang.`

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

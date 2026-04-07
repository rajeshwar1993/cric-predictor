'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { trackServerEvent } from '@/lib/analytics/server'
import {
  GANG_CREATED,
  GANG_JOIN_REQUESTED,
  GANG_MEMBER_APPROVED,
  GANG_DELETED,
  GANG_SETTINGS_UPDATED,
} from '@/lib/analytics/events'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateGangSuccess {
  success: true
  gangId: string
}

interface ActionError {
  success: false
  error: string
}

type CreateGangResult = CreateGangSuccess | ActionError

type JoinGangResult =
  | { success: true; status: 'approved' | 'pending'; gangId: string }
  | {
      success: false
      error:
        | 'invalid_code'
        | 'already_member'
        | 'gang_full'
        | 'blocked'
        | 'gang_deleted'
        | 'not_authenticated'
        | 'max_gangs'
        | 'name_collision'
        | 'server_error'
      message: string
    }

interface UpdateGangSettingsInput {
  name?: string
  autoAccept?: boolean
  predictionDeadlineMins?: number
}

type ActionResult = { success: true } | ActionError

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

// ---------------------------------------------------------------------------
// GANG-API-001: createGang
// ---------------------------------------------------------------------------

export async function createGang(name: string): Promise<CreateGangResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  // Validate name
  const trimmedName = name.trim()
  if (trimmedName.length < 3 || trimmedName.length > 50) {
    return { success: false, error: 'Gang name must be 3–50 characters' }
  }

  // Call RPC
  const rpcResult = await supabase.rpc('create_gang', {
    p_gang_name: trimmedName,
    p_creator_id: user.id,
  })

  if (rpcResult.error !== null) {
    const msg = rpcResult.error.message
    if (msg.includes('MAX_GANGS_REACHED')) {
      return {
        success: false,
        error: "You've reached the maximum number of gangs (40)",
      }
    }
    if (msg.includes('INVALID_GANG_NAME')) {
      return { success: false, error: 'Gang name must be 3–50 characters' }
    }
    if (msg.includes('invite_code') || msg.includes('collision')) {
      return {
        success: false,
        error: "Couldn't create your gang — please try again",
      }
    }
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  const gangId = String(rpcResult.data)

  trackServerEvent(user.id, GANG_CREATED, {
    gang_id: gangId,
    name_length: trimmedName.length,
  })

  revalidatePath('/dashboard')

  return { success: true, gangId }
}

// ---------------------------------------------------------------------------
// GANG-API-002: joinGang
// ---------------------------------------------------------------------------

export async function joinGang(inviteCode: string): Promise<JoinGangResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return {
      success: false,
      error: 'not_authenticated',
      message: 'You must be signed in',
    }
  }

  // Normalize invite code
  const code = inviteCode.trim().toUpperCase()
  if (code.length === 0) {
    return {
      success: false,
      error: 'invalid_code',
      message: 'Please enter an invite code',
    }
  }

  // Service-role client for notification inserts and queries that bypass RLS
  const serviceClient = createServiceRoleClient()

  // Step 1: Look up gang by invite code
  const { data: gang, error: gangError } = await serviceClient
    .from('v2_gangs')
    .select('id, name, auto_accept, is_deleted, created_by')
    .eq('invite_code', code)
    .maybeSingle()

  if (gangError !== null) {
    return {
      success: false,
      error: 'server_error',
      message: 'Something went wrong. Please try again.',
    }
  }

  if (gang === null) {
    return {
      success: false,
      error: 'invalid_code',
      message: 'Invalid invite code. Check the code and try again.',
    }
  }

  if (gang.is_deleted === true) {
    return {
      success: false,
      error: 'gang_deleted',
      message: 'This gang has been deleted.',
    }
  }

  const gangId = String(gang.id)
  const gangAdminId = String(gang.created_by)
  const autoAccept = Boolean(gang.auto_accept)

  // Step 2: Check existing membership
  const { data: existingMember, error: memberError } = await serviceClient
    .from('v2_gang_members')
    .select('status, is_blocked')
    .eq('gang_id', gangId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError !== null) {
    return {
      success: false,
      error: 'server_error',
      message: 'Something went wrong. Please try again.',
    }
  }

  let wasRejoin = false

  if (existingMember !== null) {
    const status = String(existingMember.status)
    const isBlocked = Boolean(existingMember.is_blocked)

    if (status === 'approved') {
      return {
        success: false,
        error: 'already_member',
        message: "You're already a member of this gang.",
      }
    }

    if (isBlocked) {
      return {
        success: false,
        error: 'blocked',
        message: 'You have been blocked from this gang.',
      }
    }

    if (status === 'pending') {
      // Idempotent — already pending
      revalidatePath('/dashboard')
      return { success: true, status: 'pending', gangId }
    }

    // Rejoin path: status is rejected, left, or removed
    wasRejoin = true
    const { error: rejoinError } = await serviceClient
      .from('v2_gang_members')
      .update({
        status: 'pending',
        departed_at: null,
        requested_at: new Date().toISOString(),
      })
      .eq('gang_id', gangId)
      .eq('user_id', user.id)
      .eq('is_blocked', false)

    if (rejoinError !== null) {
      const msg = rejoinError.message
      if (msg.includes('MAX_GANGS_REACHED')) {
        return {
          success: false,
          error: 'max_gangs',
          message: "You've reached the maximum number of gangs.",
        }
      }
      return {
        success: false,
        error: 'server_error',
        message: 'Something went wrong. Please try again.',
      }
    }
  } else {
    // Step 3: Check display name uniqueness within gang
    const { data: userProfile } = await serviceClient
      .from('v2_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (userProfile !== null) {
      const displayName = String(userProfile.display_name)

      // Get approved member user IDs, then check if any have the same display name
      const { data: approvedMembers } = await serviceClient
        .from('v2_gang_members')
        .select('user_id')
        .eq('gang_id', gangId)
        .eq('status', 'approved')

      if (approvedMembers !== null && approvedMembers.length > 0) {
        const memberIds = approvedMembers.map((m: { user_id: unknown }) => String(m.user_id))
        const { data: matchingProfiles } = await serviceClient
          .from('v2_profiles')
          .select('id')
          .in('id', memberIds)
          .eq('display_name', displayName)

        if (matchingProfiles !== null && matchingProfiles.length > 0) {
          return {
            success: false,
            error: 'name_collision',
            message:
              'Someone in this gang already has the same display name. Update your name on the Profile page and try again.',
          }
        }
      }
    }

    // No existing row — insert new pending member
    const { error: insertError } = await serviceClient.from('v2_gang_members').insert({
      gang_id: gangId,
      user_id: user.id,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })

    if (insertError !== null) {
      const msg = insertError.message
      if (msg.includes('MAX_GANGS_REACHED')) {
        return {
          success: false,
          error: 'max_gangs',
          message: "You've reached the maximum number of gangs.",
        }
      }
      if (msg.includes('MAX_MEMBERS_REACHED')) {
        return {
          success: false,
          error: 'gang_full',
          message: 'This gang is full (20 members max).',
        }
      }
      return {
        success: false,
        error: 'server_error',
        message: 'Something went wrong. Please try again.',
      }
    }
  }

  // Step 4: Handle auto-accept
  if (autoAccept) {
    try {
      const { error: approveError } = await serviceClient
        .from('v2_gang_members')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('gang_id', gangId)
        .eq('user_id', user.id)

      if (approveError !== null) {
        const msg = approveError.message
        if (msg.includes('MAX_MEMBERS_REACHED')) {
          return {
            success: false,
            error: 'gang_full',
            message: 'This gang is full (20 members max).',
          }
        }
        // If auto-approve fails for another reason, stay pending
        trackServerEvent(user.id, GANG_JOIN_REQUESTED, {
          gang_id: gangId,
          auto_accept: true,
          was_rejoin: wasRejoin,
        })
        revalidatePath('/dashboard')
        return { success: true, status: 'pending', gangId }
      }

      // Create new_member notification for the admin
      await serviceClient.from('v2_notifications').insert({
        user_id: gangAdminId,
        type: 'new_member',
        gang_id: gangId,
        message: 'A new member joined your gang.',
        is_read: false,
      })

      trackServerEvent(user.id, GANG_JOIN_REQUESTED, {
        gang_id: gangId,
        auto_accept: true,
        was_rejoin: wasRejoin,
      })
      trackServerEvent(user.id, GANG_MEMBER_APPROVED, {
        gang_id: gangId,
        target_user_id: user.id,
      })

      revalidatePath('/dashboard')
      return { success: true, status: 'approved', gangId }
    } catch (err) {
      const msg = extractErrorMessage(err)
      if (msg.includes('MAX_MEMBERS_REACHED')) {
        return {
          success: false,
          error: 'gang_full',
          message: 'This gang is full (20 members max).',
        }
      }
      return {
        success: false,
        error: 'server_error',
        message: 'Something went wrong. Please try again.',
      }
    }
  }

  // Manual approval path — create join_request notification for admin
  await serviceClient.from('v2_notifications').insert({
    user_id: gangAdminId,
    type: 'join_request',
    gang_id: gangId,
    message: 'Someone requested to join your gang.',
    is_read: false,
  })

  trackServerEvent(user.id, GANG_JOIN_REQUESTED, {
    gang_id: gangId,
    auto_accept: false,
    was_rejoin: wasRejoin,
  })

  revalidatePath('/dashboard')
  return { success: true, status: 'pending', gangId }
}

// ---------------------------------------------------------------------------
// GANG-API-005: deleteGang
// ---------------------------------------------------------------------------

export async function deleteGang(gangId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  const { error: rpcError } = await supabase.rpc('delete_gang', {
    p_gang_id: gangId,
    p_caller_id: user.id,
  })

  if (rpcError !== null) {
    const msg = rpcError.message
    if (msg.includes('NOT_GANG_ADMIN')) {
      return { success: false, error: 'Only the admin can delete this gang' }
    }
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  trackServerEvent(user.id, GANG_DELETED, {
    gang_id: gangId,
  })

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// GANG-API-006: updateGangSettings
// ---------------------------------------------------------------------------

export async function updateGangSettings(
  gangId: string,
  updates: UpdateGangSettingsInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  // Verify admin status
  const adminCheckResult = await supabase.rpc('is_gang_admin', {
    p_gang_id: gangId,
    p_user_id: user.id,
  })

  if (adminCheckResult.error !== null || adminCheckResult.data !== true) {
    return { success: false, error: 'Only the admin can update gang settings' }
  }

  // Validate inputs
  let validatedName: string | undefined
  if (updates.name !== undefined) {
    validatedName = updates.name.trim()
    if (validatedName.length < 3 || validatedName.length > 50) {
      return { success: false, error: 'Gang name must be 3–50 characters' }
    }
  }

  if (updates.predictionDeadlineMins !== undefined) {
    const mins = updates.predictionDeadlineMins
    if (!Number.isInteger(mins) || mins < 1 || mins > 1440) {
      return {
        success: false,
        error: 'Prediction deadline must be between 1 and 1440 minutes',
      }
    }
  }

  const changedFields: string[] = []

  // Update v2_gangs if name or autoAccept changed
  const gangUpdates: Record<string, unknown> = {}
  if (validatedName !== undefined) {
    gangUpdates['name'] = validatedName
    changedFields.push('name')
  }
  if (updates.autoAccept !== undefined) {
    gangUpdates['auto_accept'] = updates.autoAccept
    changedFields.push('auto_accept')
  }

  if (Object.keys(gangUpdates).length > 0) {
    const { error: gangUpdateError } = await supabase
      .from('v2_gangs')
      .update(gangUpdates)
      .eq('id', gangId)

    if (gangUpdateError !== null) {
      return {
        success: false,
        error: 'Failed to update gang settings. Please try again.',
      }
    }
  }

  // Update v2_gang_league_seasons if predictionDeadlineMins changed
  if (updates.predictionDeadlineMins !== undefined) {
    changedFields.push('prediction_deadline_mins')

    // Get active season
    const seasonResult = await supabase
      .from('v2_seasons')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (seasonResult.error !== null) {
      return {
        success: false,
        error: 'No active season found. Please try again later.',
      }
    }

    const { error: deadlineError } = await supabase
      .from('v2_gang_league_seasons')
      .update({
        prediction_deadline_mins: updates.predictionDeadlineMins,
      })
      .eq('gang_id', gangId)
      .eq('season_id', String(seasonResult.data.id))

    if (deadlineError !== null) {
      return {
        success: false,
        error: 'Failed to update prediction deadline. Please try again.',
      }
    }
  }

  trackServerEvent(user.id, GANG_SETTINGS_UPDATED, {
    gang_id: gangId,
    changed_fields: changedFields,
  })

  revalidatePath(`/group/${gangId}`)
  revalidatePath(`/group/${gangId}/settings`)

  return { success: true }
}

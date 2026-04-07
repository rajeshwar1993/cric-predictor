'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { trackServerEvent } from '@/lib/analytics/server'
import {
  GANG_MEMBER_APPROVED,
  GANG_MEMBER_REJECTED,
  GANG_MEMBER_REMOVED,
  GANG_MEMBER_BLOCKED,
  GANG_MEMBER_UNBLOCKED,
  GANG_MEMBER_LEFT,
} from '@/lib/analytics/events'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionSuccess {
  success: true
}

interface ActionError {
  success: false
  error: string
}

type ActionResult = ActionSuccess | ActionError

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Require the current user to be an authenticated admin of the given gang.
 * Returns the authenticated user id, or an ActionError if the check fails.
 */
async function requireGangAdmin(gangId: string): Promise<{ userId: string } | ActionError> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  const adminCheckResult = await supabase.rpc('is_gang_admin', {
    p_gang_id: gangId,
    p_user_id: user.id,
  })

  if (adminCheckResult.error !== null || adminCheckResult.data !== true) {
    return { success: false, error: 'Only the gang admin can perform this action' }
  }

  return { userId: user.id }
}

function isActionError(result: { userId: string } | ActionError): result is ActionError {
  return 'success' in result
}

// ---------------------------------------------------------------------------
// GANG-API-003: approveMember
// ---------------------------------------------------------------------------

export async function approveMember(gangId: string, targetUserId: string): Promise<ActionResult> {
  const adminResult = await requireGangAdmin(gangId)
  if (isActionError(adminResult)) return adminResult
  const { userId: adminId } = adminResult

  if (targetUserId === adminId) {
    return { success: false, error: 'You cannot approve yourself' }
  }

  const serviceClient = createServiceRoleClient()

  const { error: updateError } = await serviceClient
    .from('v2_gang_members')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('gang_id', gangId)
    .eq('user_id', targetUserId)
    .eq('status', 'pending')

  if (updateError !== null) {
    const msg = updateError.message
    if (msg.includes('MAX_MEMBERS_REACHED')) {
      return { success: false, error: 'Gang is full (20 members max)' }
    }
    return { success: false, error: 'Failed to approve member. Please try again.' }
  }

  // Create join_approved notification for the member
  await serviceClient.from('v2_notifications').insert({
    user_id: targetUserId,
    type: 'join_approved',
    gang_id: gangId,
    triggered_by: adminId,
  })

  trackServerEvent(adminId, GANG_MEMBER_APPROVED, {
    gang_id: gangId,
    target_user_id: targetUserId,
  })

  revalidatePath(`/group/${gangId}`)
  revalidatePath(`/group/${gangId}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// GANG-API-003: rejectMember
// ---------------------------------------------------------------------------

export async function rejectMember(gangId: string, targetUserId: string): Promise<ActionResult> {
  const adminResult = await requireGangAdmin(gangId)
  if (isActionError(adminResult)) return adminResult
  const { userId: adminId } = adminResult

  if (targetUserId === adminId) {
    return { success: false, error: 'You cannot reject yourself' }
  }

  const serviceClient = createServiceRoleClient()

  const { error: updateError } = await serviceClient
    .from('v2_gang_members')
    .update({ status: 'rejected' })
    .eq('gang_id', gangId)
    .eq('user_id', targetUserId)
    .eq('status', 'pending')

  if (updateError !== null) {
    return { success: false, error: 'Failed to reject member. Please try again.' }
  }

  // Create join_rejected notification for the member
  await serviceClient.from('v2_notifications').insert({
    user_id: targetUserId,
    type: 'join_rejected',
    gang_id: gangId,
    triggered_by: adminId,
  })

  trackServerEvent(adminId, GANG_MEMBER_REJECTED, {
    gang_id: gangId,
    target_user_id: targetUserId,
  })

  revalidatePath(`/group/${gangId}`)
  revalidatePath(`/group/${gangId}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// GANG-API-003: removeMember
// ---------------------------------------------------------------------------

export async function removeMember(gangId: string, targetUserId: string): Promise<ActionResult> {
  const adminResult = await requireGangAdmin(gangId)
  if (isActionError(adminResult)) return adminResult
  const { userId: adminId } = adminResult

  if (targetUserId === adminId) {
    return { success: false, error: 'You cannot remove yourself' }
  }

  const serviceClient = createServiceRoleClient()

  const { error: updateError } = await serviceClient
    .from('v2_gang_members')
    .update({
      status: 'removed',
      departed_at: new Date().toISOString(),
    })
    .eq('gang_id', gangId)
    .eq('user_id', targetUserId)
    .eq('status', 'approved')

  if (updateError !== null) {
    return { success: false, error: 'Failed to remove member. Please try again.' }
  }

  trackServerEvent(adminId, GANG_MEMBER_REMOVED, {
    gang_id: gangId,
    target_user_id: targetUserId,
  })

  revalidatePath(`/group/${gangId}`)
  revalidatePath(`/group/${gangId}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// GANG-API-003: blockMember
// ---------------------------------------------------------------------------

export async function blockMember(gangId: string, targetUserId: string): Promise<ActionResult> {
  const adminResult = await requireGangAdmin(gangId)
  if (isActionError(adminResult)) return adminResult
  const { userId: adminId } = adminResult

  if (targetUserId === adminId) {
    return { success: false, error: 'You cannot block yourself' }
  }

  const serviceClient = createServiceRoleClient()

  const { error: updateError } = await serviceClient
    .from('v2_gang_members')
    .update({ is_blocked: true })
    .eq('gang_id', gangId)
    .eq('user_id', targetUserId)

  if (updateError !== null) {
    return { success: false, error: 'Failed to block member. Please try again.' }
  }

  trackServerEvent(adminId, GANG_MEMBER_BLOCKED, {
    gang_id: gangId,
    target_user_id: targetUserId,
  })

  revalidatePath(`/group/${gangId}`)
  revalidatePath(`/group/${gangId}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// GANG-API-003: unblockMember
// ---------------------------------------------------------------------------

export async function unblockMember(gangId: string, targetUserId: string): Promise<ActionResult> {
  const adminResult = await requireGangAdmin(gangId)
  if (isActionError(adminResult)) return adminResult
  const { userId: adminId } = adminResult

  if (targetUserId === adminId) {
    return { success: false, error: 'You cannot unblock yourself' }
  }

  const serviceClient = createServiceRoleClient()

  const { error: updateError } = await serviceClient
    .from('v2_gang_members')
    .update({ is_blocked: false })
    .eq('gang_id', gangId)
    .eq('user_id', targetUserId)

  if (updateError !== null) {
    return { success: false, error: 'Failed to unblock member. Please try again.' }
  }

  trackServerEvent(adminId, GANG_MEMBER_UNBLOCKED, {
    gang_id: gangId,
    target_user_id: targetUserId,
  })

  revalidatePath(`/group/${gangId}`)
  revalidatePath(`/group/${gangId}/settings`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// GANG-API-004: leaveGang
// ---------------------------------------------------------------------------

export async function leaveGang(gangId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  // Check if user is admin — admins cannot leave
  const adminCheckResult = await supabase.rpc('is_gang_admin', {
    p_gang_id: gangId,
    p_user_id: user.id,
  })

  if (adminCheckResult.data === true) {
    return {
      success: false,
      error: 'Admins cannot leave — delete the gang instead',
    }
  }

  // Verify user is an approved member
  const { data: membership, error: memberError } = await supabase
    .from('v2_gang_members')
    .select('status')
    .eq('gang_id', gangId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError !== null || membership === null) {
    return { success: false, error: 'You are not a member of this gang' }
  }

  if (String(membership.status) !== 'approved') {
    return { success: false, error: 'You are not an active member of this gang' }
  }

  // Update to left status
  const { error: updateError } = await supabase
    .from('v2_gang_members')
    .update({
      status: 'left',
      departed_at: new Date().toISOString(),
    })
    .eq('gang_id', gangId)
    .eq('user_id', user.id)

  if (updateError !== null) {
    return { success: false, error: 'Failed to leave gang. Please try again.' }
  }

  trackServerEvent(user.id, GANG_MEMBER_LEFT, {
    gang_id: gangId,
  })

  revalidatePath('/dashboard')
  revalidatePath(`/group/${gangId}`)
  redirect('/dashboard')
}

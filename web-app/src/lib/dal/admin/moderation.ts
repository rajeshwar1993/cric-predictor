import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModerationCounts {
  blockedMembers: number
  deletedAccounts: number
  deletedGangs: number
  pendingRequests: number
}

export interface BlockedUser {
  userId: string
  displayName: string | null
  email: string
  gangId: string
  gangName: string
}

export interface DeletedAccount {
  id: string
  displayName: string | null
  email: string
  deletedAt: string | null
  createdAt: string
}

export interface PendingRequest {
  userId: string
  displayName: string | null
  email: string
  gangId: string
  gangName: string
  requestedAt: string
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get moderation counts — blocked members, deleted accounts, deleted gangs, pending requests.
 */
export async function getModerationCounts(): Promise<ModerationCounts> {
  const supabase = createServiceRoleClient()

  // Blocked gang members
  const { count: blockedMembers, error: blockedError } = await supabase
    .from('v2_gang_members')
    .select('gang_id', { count: 'exact', head: true })
    .eq('is_blocked', true)

  if (blockedError)
    throw new Error(`getModerationCounts blocked failed: ${blockedError.message}`)

  // Deleted accounts
  const { count: deletedAccounts, error: deletedError } = await supabase
    .from('v2_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_deleted', true)

  if (deletedError)
    throw new Error(`getModerationCounts deleted failed: ${deletedError.message}`)

  // Deleted gangs
  const { count: deletedGangs, error: gangsError } = await supabase
    .from('v2_gangs')
    .select('id', { count: 'exact', head: true })
    .eq('is_deleted', true)

  if (gangsError)
    throw new Error(`getModerationCounts gangs failed: ${gangsError.message}`)

  // Pending join requests
  const { count: pendingRequests, error: pendingError } = await supabase
    .from('v2_gang_members')
    .select('gang_id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (pendingError)
    throw new Error(`getModerationCounts pending failed: ${pendingError.message}`)

  return {
    blockedMembers: blockedMembers ?? 0,
    deletedAccounts: deletedAccounts ?? 0,
    deletedGangs: deletedGangs ?? 0,
    pendingRequests: pendingRequests ?? 0,
  }
}

/**
 * Get blocked gang members with user and gang info.
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const supabase = createServiceRoleClient()

  const { data: blocked, error } = await supabase
    .from('v2_gang_members')
    .select('user_id, gang_id')
    .eq('is_blocked', true)
    .limit(100)

  if (error) throw new Error(`getBlockedUsers failed: ${error.message}`)

  const rows = blocked ?? []
  if (rows.length === 0) return []

  // Get user info
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const { data: profiles } = await supabase
    .from('v2_profiles')
    .select('id, display_name, email')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  )

  // Get gang info
  const gangIds = [...new Set(rows.map((r) => r.gang_id))]
  const { data: gangs } = await supabase
    .from('v2_gangs')
    .select('id, name')
    .in('id', gangIds)

  const gangMap = new Map((gangs ?? []).map((g) => [g.id, g.name]))

  return rows.map((r) => {
    const profile = profileMap.get(r.user_id)
    return {
      userId: r.user_id,
      displayName: profile?.display_name ?? null,
      email: profile?.email ?? 'unknown',
      gangId: r.gang_id,
      gangName: gangMap.get(r.gang_id) ?? 'Unknown',
    }
  })
}

/**
 * Get recent deleted accounts.
 */
export async function getDeletedAccounts(
  limit: number,
): Promise<DeletedAccount[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('v2_profiles')
    .select('id, display_name, email, deleted_at, created_at')
    .eq('is_deleted', true)
    .order('deleted_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) throw new Error(`getDeletedAccounts failed: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  }))
}

/**
 * Get pending join requests across all gangs.
 */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  const supabase = createServiceRoleClient()

  const { data: pending, error } = await supabase
    .from('v2_gang_members')
    .select('user_id, gang_id, requested_at')
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(`getPendingRequests failed: ${error.message}`)

  const rows = pending ?? []
  if (rows.length === 0) return []

  // Get user info
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const { data: profiles } = await supabase
    .from('v2_profiles')
    .select('id, display_name, email')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  )

  // Get gang info
  const gangIds = [...new Set(rows.map((r) => r.gang_id))]
  const { data: gangs } = await supabase
    .from('v2_gangs')
    .select('id, name')
    .in('id', gangIds)

  const gangMap = new Map((gangs ?? []).map((g) => [g.id, g.name]))

  return rows.map((r) => {
    const profile = profileMap.get(r.user_id)
    return {
      userId: r.user_id,
      displayName: profile?.display_name ?? null,
      email: profile?.email ?? 'unknown',
      gangId: r.gang_id,
      gangName: gangMap.get(r.gang_id) ?? 'Unknown',
      requestedAt: r.requested_at,
    }
  })
}

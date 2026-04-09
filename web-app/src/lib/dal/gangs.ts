import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { MemberRole, MemberStatus } from '@/types'

/**
 * Picked columns from v2_gangs returned by the membership query.
 */
type GangRow = Pick<
  Database['public']['Tables']['v2_gangs']['Row'],
  'id' | 'name' | 'invite_code' | 'created_at'
>

/**
 * Shape returned by `getUserGangs` — one entry per gang the user belongs to.
 */
export interface UserGang {
  /** Gang id */
  id: string
  /** Gang display name */
  name: string
  /** 6-char invite code */
  inviteCode: string
  /** User's role in this gang */
  role: MemberRole
  /** Count of approved members in this gang */
  memberCount: number
  /** When the gang was created */
  createdAt: string
}

/**
 * Fetch all gangs the given user is an approved member of.
 *
 * Uses a single query with a nested count sub-select so PostgREST returns
 * both the gang details and approved-member count in one round-trip.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getUserGangs(userId: string): Promise<UserGang[]> {
  const supabase = await createServerClient()

  // Single query: join to gangs and embed a nested count of approved members.
  const { data, error } = await supabase
    .from('v2_gang_members')
    .select(
      `
      role,
      v2_gangs!inner (
        id,
        name,
        invite_code,
        created_at,
        v2_gang_members(count)
      )
    `,
    )
    .eq('user_id', userId)
    .eq('status', 'approved')
    .eq('v2_gangs.is_deleted', false)
    .eq('v2_gangs.v2_gang_members.status', 'approved')

  if (error) throw error
  if (!data || data.length === 0) return []

  // Map to our clean interface
  return data.map((row) => {
    // PostgREST returns the joined table as an object for single-FK relations,
    // but the Supabase SDK types it as an array. Double-cast is needed here
    // because the generated types don't model this correctly.
    const gang = row.v2_gangs as unknown as GangRow & {
      v2_gang_members: [{ count: number }]
    }

    if (!gang || !gang.id) {
      throw new Error('Unexpected query shape: missing gang data')
    }

    return {
      id: gang.id,
      name: gang.name,
      inviteCode: gang.invite_code,
      role: row.role,
      memberCount: gang.v2_gang_members[0]?.count ?? 0,
      createdAt: gang.created_at,
    }
  })
}

// ---------------------------------------------------------------------------
// getGangByInviteCode
// ---------------------------------------------------------------------------

/**
 * Shape returned by `getGangByInviteCode` — basic gang info from the RPC.
 */
export interface GangByInviteCode {
  id: string
  name: string
  autoAccept: boolean
  isDeleted: boolean
  createdBy: string
}

/**
 * Look up a gang by its 6-character invite code.
 *
 * Uses the `get_gang_by_invite_code` SECURITY DEFINER RPC — no auth session required.
 * Returns `null` if no gang is found for the given code.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getGangByInviteCode(
  code: string,
): Promise<GangByInviteCode | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase.rpc('get_gang_by_invite_code', {
    p_invite_code: code,
  })

  if (error) throw error

  const row = data?.[0]
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    autoAccept: row.auto_accept,
    isDeleted: row.is_deleted,
    createdBy: row.created_by,
  }
}

// ---------------------------------------------------------------------------
// getMembershipStatus
// ---------------------------------------------------------------------------

/**
 * Shape returned by `getMembershipStatus` — the user's membership row in a gang.
 */
export interface MembershipInfo {
  status: MemberStatus
  isBlocked: boolean
}

/**
 * Check a user's membership status in a specific gang.
 *
 * Returns `null` if the user has no membership row for the gang.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getMembershipStatus(
  gangId: string,
  userId: string,
): Promise<MembershipInfo | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_gang_members')
    .select('status, is_blocked')
    .eq('gang_id', gangId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    status: data.status,
    isBlocked: data.is_blocked,
  }
}

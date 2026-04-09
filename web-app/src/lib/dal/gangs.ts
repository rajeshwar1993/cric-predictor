import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { MemberRole, MemberStatus } from '@/types'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type ProfileRow = Pick<
  Database['public']['Tables']['v2_profiles']['Row'],
  'display_name' | 'email'
>

type GangMemberRow = Pick<
  Database['public']['Tables']['v2_gang_members']['Row'],
  'user_id' | 'role' | 'status'
>

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

// ---------------------------------------------------------------------------
// getGangDetails
// ---------------------------------------------------------------------------

/**
 * A member row within the gang details response.
 */
export interface GangDetailMember {
  userId: string
  role: MemberRole
  status: MemberStatus
  displayName: string | null
  email: string
}

/**
 * Shape returned by `getGangDetails` — full gang info with members.
 */
export interface GangDetails {
  id: string
  name: string
  inviteCode: string
  autoAccept: boolean
  createdBy: string
  members: GangDetailMember[]
}

/**
 * Fetch full gang details including all members with their profiles.
 *
 * Returns `null` if the gang is not found or has been soft-deleted.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getGangDetails(
  gangId: string,
): Promise<GangDetails | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_gangs')
    .select(
      `
      id, name, invite_code, auto_accept, created_by,
      v2_gang_members (user_id, role, status, v2_profiles (display_name, email))
    `,
    )
    .eq('id', gangId)
    .eq('is_deleted', false)
    .single()

  if (error) {
    // PGRST116 = "no rows returned" — treat as not found
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!data) return null

  // PostgREST returns the nested join as an array. Each member has a
  // nested v2_profiles object (single-FK relation → object, not array).
  // Double-cast needed because the Supabase SDK types are imprecise here.
  const rawMembers = data.v2_gang_members as unknown as (GangMemberRow & {
    v2_profiles: ProfileRow | null
  })[]

  const members: GangDetailMember[] = (rawMembers ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role,
    status: m.status,
    displayName: m.v2_profiles?.display_name ?? null,
    email: m.v2_profiles?.email ?? '',
  }))

  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    autoAccept: data.auto_accept,
    createdBy: data.created_by,
    members,
  }
}

// ---------------------------------------------------------------------------
// getGangMemberStatus
// ---------------------------------------------------------------------------

/**
 * Shape returned by `getGangMemberStatus` — the user's full membership row.
 */
export interface GangMemberInfo {
  role: MemberRole
  status: MemberStatus
}

/**
 * Get a user's membership record for a specific gang.
 *
 * Returns `null` if the user has no membership row for the gang.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getGangMemberStatus(
  gangId: string,
  userId: string,
): Promise<GangMemberInfo | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_gang_members')
    .select('role, status')
    .eq('gang_id', gangId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    role: data.role,
    status: data.status,
  }
}

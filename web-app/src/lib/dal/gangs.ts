import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { MemberRole } from '@/types'

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
    // PostgREST returns the joined table as an object (single FK relation)
    const gang = row.v2_gangs as unknown as GangRow & {
      v2_gang_members: [{ count: number }]
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

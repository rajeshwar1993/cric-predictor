import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserGang {
  id: string
  name: string
  memberCount: number
  role: 'admin' | 'member'
}

export interface GangMember {
  userId: string
  displayName: string
  role: 'admin' | 'member'
  status: 'pending' | 'approved' | 'rejected' | 'removed' | 'left'
  isBlocked: boolean
  isCurrentUser: boolean
  points: number
  rank: number | null
  joinedAt: string | null
}

export interface GangDetails {
  id: string
  name: string
  inviteCode: string
  autoAccept: boolean
  predictionDeadlineMins: number
  createdBy: string
  memberCount: number
  members: GangMember[]
  currentUserRole: 'admin' | 'member' | null
}

export interface PendingRequest {
  userId: string
  displayName: string
  requestedAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(val: unknown): string {
  return String(val)
}

function toBool(val: unknown): boolean {
  return Boolean(val)
}

// ---------------------------------------------------------------------------
// getUserGangs
// ---------------------------------------------------------------------------

/**
 * Returns all active gangs for a user, with member count and the user's role.
 */
export async function getUserGangs(userId: string): Promise<UserGang[]> {
  const supabase = await createClient()

  const memberResult = await supabase
    .from('v2_gang_members')
    .select('gang_id, role')
    .eq('user_id', userId)
    .eq('status', 'approved')

  if (memberResult.error !== null) return []

  const memberships = memberResult.data
  if (memberships.length === 0) return []

  const gangIds = memberships.map((m: { gang_id: unknown }) => toStr(m.gang_id))

  const gangResult = await supabase
    .from('v2_gangs')
    .select('id, name')
    .in('id', gangIds)
    .eq('is_deleted', false)

  if (gangResult.error !== null) return []

  const gangs = gangResult.data

  const serviceClient = createServiceRoleClient()
  const countResult = await serviceClient
    .from('v2_gang_members')
    .select('gang_id')
    .in('gang_id', gangIds)
    .eq('status', 'approved')

  if (countResult.error !== null) return []

  const memberCounts = countResult.data

  const countMap = new Map<string, number>()
  for (const row of memberCounts) {
    const gid = toStr((row as { gang_id: unknown }).gang_id)
    countMap.set(gid, (countMap.get(gid) ?? 0) + 1)
  }

  const roleMap = new Map<string, 'admin' | 'member'>()
  for (const m of memberships) {
    const mem = m as { gang_id: unknown; role: unknown }
    roleMap.set(toStr(mem.gang_id), toStr(mem.role) === 'admin' ? 'admin' : 'member')
  }

  return gangs.map((g: { id: unknown; name: unknown }) => ({
    id: toStr(g.id),
    name: toStr(g.name),
    memberCount: countMap.get(toStr(g.id)) ?? 0,
    role: roleMap.get(toStr(g.id)) ?? 'member',
  }))
}

// ---------------------------------------------------------------------------
// getGangDetails
// ---------------------------------------------------------------------------

/**
 * Returns full gang details including members, invite code, and settings.
 */
export async function getGangDetails(
  gangId: string,
  currentUserId: string,
): Promise<GangDetails | null> {
  const serviceClient = createServiceRoleClient()

  const gangResult = await serviceClient
    .from('v2_gangs')
    .select('id, name, invite_code, auto_accept, created_by, is_deleted')
    .eq('id', gangId)
    .maybeSingle()

  if (gangResult.error !== null || gangResult.data === null) return null

  const gang = gangResult.data as {
    id: unknown
    name: unknown
    invite_code: unknown
    auto_accept: unknown
    created_by: unknown
    is_deleted: unknown
  }

  if (toBool(gang.is_deleted)) return null

  const memberResult = await serviceClient
    .from('v2_gang_members')
    .select('user_id, role, status, is_blocked, approved_at, requested_at')
    .eq('gang_id', gangId)
    .eq('status', 'approved')

  if (memberResult.error !== null) return null

  const memberRows = memberResult.data as Array<{
    user_id: unknown
    role: unknown
    status: unknown
    is_blocked: unknown
    approved_at: unknown
    requested_at: unknown
  }>

  const memberUserIds = memberRows.map((m) => toStr(m.user_id))

  const profileResult = await serviceClient
    .from('v2_profiles')
    .select('id, display_name')
    .in('id', memberUserIds)

  const profiles = (profileResult.data ?? []) as Array<{
    id: unknown
    display_name: unknown
  }>

  const profileMap = new Map<string, string>()
  for (const p of profiles) {
    profileMap.set(toStr(p.id), toStr(p.display_name ?? 'Unknown'))
  }

  const seasonResult = await serviceClient
    .from('v2_seasons')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  let predictionDeadlineMins = 45
  if (seasonResult.data !== null) {
    const season = seasonResult.data as { id: unknown }

    const deadlineResult = await serviceClient
      .from('v2_gang_league_seasons')
      .select('prediction_deadline_mins')
      .eq('gang_id', gangId)
      .eq('season_id', toStr(season.id))
      .maybeSingle()

    if (deadlineResult.data !== null) {
      const gangSeason = deadlineResult.data as { prediction_deadline_mins: unknown }
      predictionDeadlineMins = Number(gangSeason.prediction_deadline_mins)
    }
  }

  let currentUserRole: 'admin' | 'member' | null = null
  const members: GangMember[] = memberRows.map((m, index) => {
    const uid = toStr(m.user_id)
    const role: 'admin' | 'member' = toStr(m.role) === 'admin' ? 'admin' : 'member'
    if (uid === currentUserId) {
      currentUserRole = role
    }
    return {
      userId: uid,
      displayName: profileMap.get(uid) ?? 'Unknown',
      role,
      status: toStr(m.status) as GangMember['status'],
      isBlocked: toBool(m.is_blocked),
      isCurrentUser: uid === currentUserId,
      points: 0,
      rank: index + 1,
      joinedAt: m.approved_at !== null ? toStr(m.approved_at) : null,
    }
  })

  return {
    id: toStr(gang.id),
    name: toStr(gang.name),
    inviteCode: toStr(gang.invite_code),
    autoAccept: toBool(gang.auto_accept),
    predictionDeadlineMins,
    createdBy: toStr(gang.created_by),
    memberCount: members.length,
    members,
    currentUserRole,
  }
}

// ---------------------------------------------------------------------------
// getGangMembers
// ---------------------------------------------------------------------------

/**
 * Returns all members of a gang (all statuses) with profiles.
 * Used by member management in settings.
 */
export async function getGangMembers(gangId: string, currentUserId: string): Promise<GangMember[]> {
  const serviceClient = createServiceRoleClient()

  const memberResult = await serviceClient
    .from('v2_gang_members')
    .select('user_id, role, status, is_blocked, approved_at, requested_at')
    .eq('gang_id', gangId)

  if (memberResult.error !== null) return []

  const memberRows = memberResult.data as Array<{
    user_id: unknown
    role: unknown
    status: unknown
    is_blocked: unknown
    approved_at: unknown
    requested_at: unknown
  }>

  const memberUserIds = memberRows.map((m) => toStr(m.user_id))

  const profileResult = await serviceClient
    .from('v2_profiles')
    .select('id, display_name')
    .in('id', memberUserIds)

  const profiles = (profileResult.data ?? []) as Array<{
    id: unknown
    display_name: unknown
  }>

  const profileMap = new Map<string, string>()
  for (const p of profiles) {
    profileMap.set(toStr(p.id), toStr(p.display_name ?? 'Unknown'))
  }

  return memberRows.map((m, index) => {
    const uid = toStr(m.user_id)
    return {
      userId: uid,
      displayName: profileMap.get(uid) ?? 'Unknown',
      role: toStr(m.role) === 'admin' ? ('admin' as const) : ('member' as const),
      status: toStr(m.status) as GangMember['status'],
      isBlocked: toBool(m.is_blocked),
      isCurrentUser: uid === currentUserId,
      points: 0,
      rank: index + 1,
      joinedAt: m.approved_at !== null ? toStr(m.approved_at) : null,
    }
  })
}

// ---------------------------------------------------------------------------
// getPendingRequests
// ---------------------------------------------------------------------------

/**
 * Returns pending join requests for a gang.
 */
export async function getPendingRequests(gangId: string): Promise<PendingRequest[]> {
  const serviceClient = createServiceRoleClient()

  const pendingResult = await serviceClient
    .from('v2_gang_members')
    .select('user_id, requested_at')
    .eq('gang_id', gangId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (pendingResult.error !== null) return []

  const pendingRows = pendingResult.data as Array<{
    user_id: unknown
    requested_at: unknown
  }>

  if (pendingRows.length === 0) return []

  const userIds = pendingRows.map((m) => toStr(m.user_id))

  const profileResult = await serviceClient
    .from('v2_profiles')
    .select('id, display_name')
    .in('id', userIds)

  const profiles = (profileResult.data ?? []) as Array<{
    id: unknown
    display_name: unknown
  }>

  const profileMap = new Map<string, string>()
  for (const p of profiles) {
    profileMap.set(toStr(p.id), toStr(p.display_name ?? 'Unknown'))
  }

  return pendingRows.map((m) => ({
    userId: toStr(m.user_id),
    displayName: profileMap.get(toStr(m.user_id)) ?? 'Unknown',
    requestedAt: toStr(m.requested_at ?? new Date().toISOString()),
  }))
}

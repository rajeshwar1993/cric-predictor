import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GangMetrics {
  total: number
  active: number
  deleted: number
  autoAcceptEnabled: number
}

export interface GangSizeBracket {
  bracket: string
  count: number
}

export interface GangSearchResult {
  id: string
  name: string
  inviteCode: string
  autoAccept: boolean
  isDeleted: boolean
  memberCount: number
  createdAt: string
}

export interface GangMemberInfo {
  userId: string
  displayName: string | null
  email: string
  role: string
  status: string
}

export interface GangSeasonStanding {
  userId: string
  displayName: string | null
  seasonId: string
  totalPoints: number
  rank: number | null
  accuracyPct: number
}

export interface GangDetail {
  id: string
  name: string
  inviteCode: string
  createdBy: string
  creatorName: string | null
  autoAccept: boolean
  isDeleted: boolean
  createdAt: string
  members: GangMemberInfo[]
  seasonStandings: GangSeasonStanding[]
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get aggregate gang metrics.
 */
export async function getGangMetrics(): Promise<GangMetrics> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('v2_gangs')
    .select('is_deleted, auto_accept')

  if (error) throw new Error(`getGangMetrics failed: ${error.message}`)

  const rows = data ?? []
  const total = rows.length
  const deleted = rows.filter((r) => r.is_deleted).length
  const active = rows.filter((r) => !r.is_deleted).length
  const autoAcceptEnabled = rows.filter(
    (r) => !r.is_deleted && r.auto_accept,
  ).length

  return { total, active, deleted, autoAcceptEnabled }
}

/**
 * Get distribution of gangs by member count brackets.
 */
export async function getGangSizeDistribution(): Promise<GangSizeBracket[]> {
  const supabase = createServiceRoleClient()

  // Get active gangs
  const { data: gangs, error: gangsError } = await supabase
    .from('v2_gangs')
    .select('id')
    .eq('is_deleted', false)

  if (gangsError)
    throw new Error(`getGangSizeDistribution gangs failed: ${gangsError.message}`)

  const gangIds = (gangs ?? []).map((g) => g.id)

  // Get approved members per gang
  const { data: members, error: membersError } = await supabase
    .from('v2_gang_members')
    .select('gang_id')
    .eq('status', 'approved')
    .in('gang_id', gangIds.length > 0 ? gangIds : ['__none__'])

  if (membersError)
    throw new Error(`getGangSizeDistribution members failed: ${membersError.message}`)

  // Count members per gang
  const gangMemberCount = new Map<string, number>()
  for (const m of members ?? []) {
    gangMemberCount.set(m.gang_id, (gangMemberCount.get(m.gang_id) ?? 0) + 1)
  }

  // Define brackets
  const brackets: { label: string; min: number; max: number }[] = [
    { label: '1 member', min: 0, max: 1 },
    { label: '2-5 members', min: 2, max: 5 },
    { label: '6-10 members', min: 6, max: 10 },
    { label: '11-20 members', min: 11, max: 20 },
    { label: '21+ members', min: 21, max: Infinity },
  ]

  const result: GangSizeBracket[] = brackets.map((b) => {
    const count = gangIds.filter((id) => {
      const size = gangMemberCount.get(id) ?? 0
      return size >= b.min && size <= b.max
    }).length
    return { bracket: b.label, count }
  })

  return result
}

/**
 * Search gangs by name or invite_code.
 */
export async function searchGangs(query: string): Promise<GangSearchResult[]> {
  const supabase = createServiceRoleClient()
  const pattern = `%${query}%`

  const { data: gangs, error } = await supabase
    .from('v2_gangs')
    .select('id, name, invite_code, auto_accept, is_deleted, created_at')
    .or(`name.ilike.${pattern},invite_code.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`searchGangs failed: ${error.message}`)

  const gangIds = (gangs ?? []).map((g) => g.id)

  // Get member counts
  const { data: members } = await supabase
    .from('v2_gang_members')
    .select('gang_id')
    .eq('status', 'approved')
    .in('gang_id', gangIds.length > 0 ? gangIds : ['__none__'])

  const memberCountMap = new Map<string, number>()
  for (const m of members ?? []) {
    memberCountMap.set(m.gang_id, (memberCountMap.get(m.gang_id) ?? 0) + 1)
  }

  return (gangs ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    inviteCode: g.invite_code,
    autoAccept: g.auto_accept,
    isDeleted: g.is_deleted,
    memberCount: memberCountMap.get(g.id) ?? 0,
    createdAt: g.created_at,
  }))
}

/**
 * Get detailed gang info including members and season standings.
 */
export async function getGangDetail(gangId: string): Promise<GangDetail | null> {
  const supabase = createServiceRoleClient()

  const { data: gang, error: gangError } = await supabase
    .from('v2_gangs')
    .select('*')
    .eq('id', gangId)
    .maybeSingle()

  if (gangError) throw new Error(`getGangDetail failed: ${gangError.message}`)
  if (!gang) return null

  // Get creator name
  const { data: creator } = await supabase
    .from('v2_profiles')
    .select('display_name')
    .eq('id', gang.created_by)
    .maybeSingle()

  // Get members
  const { data: memberships } = await supabase
    .from('v2_gang_members')
    .select('user_id, role, status')
    .eq('gang_id', gangId)

  const memberUserIds = (memberships ?? []).map((m) => m.user_id)
  const { data: memberProfiles } = await supabase
    .from('v2_profiles')
    .select('id, display_name, email')
    .in('id', memberUserIds.length > 0 ? memberUserIds : ['__none__'])

  const profileMap = new Map(
    (memberProfiles ?? []).map((p) => [p.id, p]),
  )

  const members: GangMemberInfo[] = (memberships ?? []).map((m) => {
    const profile = profileMap.get(m.user_id)
    return {
      userId: m.user_id,
      displayName: profile?.display_name ?? null,
      email: profile?.email ?? 'unknown',
      role: m.role,
      status: m.status,
    }
  })

  // Get season standings
  const { data: standings } = await supabase
    .from('v2_gang_season_standings')
    .select('user_id, season_id, total_points, rank, accuracy_pct')
    .eq('gang_id', gangId)
    .order('rank', { ascending: true })

  const standingUserIds = (standings ?? []).map((s) => s.user_id)
  const { data: standingProfiles } = await supabase
    .from('v2_profiles')
    .select('id, display_name')
    .in('id', standingUserIds.length > 0 ? standingUserIds : ['__none__'])

  const standingProfileMap = new Map(
    (standingProfiles ?? []).map((p) => [p.id, p.display_name]),
  )

  const seasonStandings: GangSeasonStanding[] = (standings ?? []).map((s) => ({
    userId: s.user_id,
    displayName: standingProfileMap.get(s.user_id) ?? null,
    seasonId: s.season_id,
    totalPoints: s.total_points,
    rank: s.rank,
    accuracyPct: s.accuracy_pct,
  }))

  return {
    id: gang.id,
    name: gang.name,
    inviteCode: gang.invite_code,
    createdBy: gang.created_by,
    creatorName: creator?.display_name ?? null,
    autoAccept: gang.auto_accept,
    isDeleted: gang.is_deleted,
    createdAt: gang.created_at,
    members,
    seasonStandings,
  }
}

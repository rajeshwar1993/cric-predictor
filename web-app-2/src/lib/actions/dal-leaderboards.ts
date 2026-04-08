import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchLeaderboardEntry {
  userId: string
  displayName: string
  rank: number
  predictedCount: number
  resolvedCount: number
  correctCount: number
  pointsEarned: number
  lastSubmittedAt: string | null
  memberStatus: 'approved' | 'left' | 'removed'
}

export interface SeasonStandingsEntry {
  userId: string
  displayName: string
  rank: number
  matchesPredicted: number
  totalPoints: number
  totalCorrect: number
  totalResolved: number
  accuracyPct: number
  pointsPerMatch: number
  memberStatus: 'approved' | 'left' | 'removed'
}

export interface PredictionRevealScenario {
  id: string
  slug: string
  title: string
  points: number
  correctAnswer: string | null
  isResolved: boolean
  isVoided: boolean
  resolutionPhase: string
}

export interface PredictionRevealMember {
  userId: string
  displayName: string
  rank: number
  memberStatus: 'approved' | 'left' | 'removed'
}

export interface PredictionRevealPick {
  value: string
  isCorrect: boolean | null
  pointsEarned: number
}

export interface PredictionRevealMatrix {
  members: PredictionRevealMember[]
  scenarios: PredictionRevealScenario[]
  /** Map<userId, Map<scenarioId, pick>> */
  predictions: Record<string, Record<string, PredictionRevealPick>>
}

export interface UserOverallStats {
  totalGangs: number
  totalMatchesPredicted: number
  totalPoints: number
  overallAccuracyPct: number
}

export interface MemberWithPoints {
  userId: string
  displayName: string
  role: 'admin' | 'member'
  status: 'approved' | 'left' | 'removed' | 'pending' | 'rejected'
  isBlocked: boolean
  totalPoints: number
  rank: number | null
  joinedAt: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(val: unknown): string {
  return String(val)
}

function hasError(result: { error: unknown }): boolean {
  return result.error !== null && result.error !== undefined
}

function hasNoData(result: { data: unknown }): boolean {
  return result.data === null || result.data === undefined
}

type MemberStatus = 'approved' | 'left' | 'removed'

function parseMemberStatus(val: unknown): MemberStatus {
  const s = toStr(val)
  if (s === 'left' || s === 'removed') return s
  return 'approved'
}

/** Maps resolution_phase enum to sort position */
const PHASE_ORDER: Record<string, number> = {
  toss: 0,
  first_wicket: 1,
  team_powerplay_end: 2,
  mid_match: 3,
  team_innings_end: 4,
  end: 5,
  post_match: 6,
}

// ---------------------------------------------------------------------------
// getMatchLeaderboard
// ---------------------------------------------------------------------------

/**
 * Returns rows from v2_gang_fixture_standings ordered by rank ASC,
 * joined with v2_profiles and v2_gang_members.
 */
export async function getMatchLeaderboard(
  gangId: string,
  fixtureId: string,
): Promise<MatchLeaderboardEntry[]> {
  const serviceClient = createServiceRoleClient()

  // Step 1: Get standings
  const standingsResult = await serviceClient
    .from('v2_gang_fixture_standings')
    .select(
      'user_id, rank, predicted_count, resolved_count, correct_count, points_earned, last_submitted_at',
    )
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('rank', { ascending: true })

  if (hasError(standingsResult) || hasNoData(standingsResult)) return []

  const standings = standingsResult.data as Array<Record<string, unknown>>
  if (standings.length === 0) return []

  // Step 2: Get user IDs and fetch profiles + member status
  const userIds = standings.map((s) => toStr(s.user_id))

  const [profileResult, memberResult] = await Promise.all([
    serviceClient.from('v2_profiles').select('id, display_name').in('id', userIds),
    serviceClient
      .from('v2_gang_members')
      .select('user_id, status')
      .eq('gang_id', gangId)
      .in('user_id', userIds),
  ])

  const profileMap = new Map<string, string>()
  if (!hasNoData(profileResult)) {
    const profiles = profileResult.data as Array<{ id: unknown; display_name: unknown }>
    for (const p of profiles) {
      profileMap.set(toStr(p.id), toStr(p.display_name ?? 'Unknown'))
    }
  }

  const statusMap = new Map<string, MemberStatus>()
  if (!hasNoData(memberResult)) {
    const members = memberResult.data as Array<{ user_id: unknown; status: unknown }>
    for (const m of members) {
      statusMap.set(toStr(m.user_id), parseMemberStatus(m.status))
    }
  }

  return standings.map((s) => {
    const uid = toStr(s.user_id)
    return {
      userId: uid,
      displayName: profileMap.get(uid) ?? 'Unknown',
      rank: Number(s.rank),
      predictedCount: Number(s.predicted_count),
      resolvedCount: Number(s.resolved_count),
      correctCount: Number(s.correct_count),
      pointsEarned: Number(s.points_earned),
      lastSubmittedAt: s.last_submitted_at !== null ? toStr(s.last_submitted_at) : null,
      memberStatus: statusMap.get(uid) ?? 'approved',
    }
  })
}

// ---------------------------------------------------------------------------
// getSeasonStandings
// ---------------------------------------------------------------------------

/**
 * Returns rows from v2_gang_season_standings ordered by rank ASC,
 * joined with v2_profiles and v2_gang_members.
 */
export async function getSeasonStandings(
  gangId: string,
  seasonId: string,
): Promise<SeasonStandingsEntry[]> {
  const serviceClient = createServiceRoleClient()

  const standingsResult = await serviceClient
    .from('v2_gang_season_standings')
    .select(
      'user_id, rank, matches_predicted, total_points, total_correct, total_resolved, accuracy_pct, points_per_match',
    )
    .eq('gang_id', gangId)
    .eq('season_id', seasonId)
    .order('rank', { ascending: true })

  if (hasError(standingsResult) || hasNoData(standingsResult)) return []

  const standings = standingsResult.data as Array<Record<string, unknown>>
  if (standings.length === 0) return []

  const userIds = standings.map((s) => toStr(s.user_id))

  const [profileResult, memberResult] = await Promise.all([
    serviceClient.from('v2_profiles').select('id, display_name').in('id', userIds),
    serviceClient
      .from('v2_gang_members')
      .select('user_id, status')
      .eq('gang_id', gangId)
      .in('user_id', userIds),
  ])

  const profileMap = new Map<string, string>()
  if (!hasNoData(profileResult)) {
    const profiles = profileResult.data as Array<{ id: unknown; display_name: unknown }>
    for (const p of profiles) {
      profileMap.set(toStr(p.id), toStr(p.display_name ?? 'Unknown'))
    }
  }

  const statusMap = new Map<string, MemberStatus>()
  if (!hasNoData(memberResult)) {
    const members = memberResult.data as Array<{ user_id: unknown; status: unknown }>
    for (const m of members) {
      statusMap.set(toStr(m.user_id), parseMemberStatus(m.status))
    }
  }

  return standings.map((s) => {
    const uid = toStr(s.user_id)
    return {
      userId: uid,
      displayName: profileMap.get(uid) ?? 'Unknown',
      rank: Number(s.rank),
      matchesPredicted: Number(s.matches_predicted),
      totalPoints: Number(s.total_points),
      totalCorrect: Number(s.total_correct),
      totalResolved: Number(s.total_resolved),
      accuracyPct: Number(s.accuracy_pct),
      pointsPerMatch: Number(s.points_per_match),
      memberStatus: statusMap.get(uid) ?? 'approved',
    }
  })
}

// ---------------------------------------------------------------------------
// getPredictionRevealMatrix
// ---------------------------------------------------------------------------

/**
 * Returns all predictions for all approved gang members for the fixture,
 * plus the scenarios. RLS handles visibility (returns empty if before lock).
 */
export async function getPredictionRevealMatrix(
  gangId: string,
  fixtureId: string,
): Promise<PredictionRevealMatrix> {
  const serviceClient = createServiceRoleClient()

  // Step 1: Get fixture scenarios
  const scenarioResult = await serviceClient
    .from('v2_fixture_scenarios')
    .select('id, slug, title, points, correct_answer, is_resolved, is_voided, resolution_phase')
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)

  if (hasError(scenarioResult) || hasNoData(scenarioResult)) {
    return { members: [], scenarios: [], predictions: {} }
  }

  const scenarioRows = scenarioResult.data as Array<Record<string, unknown>>

  const scenarios: PredictionRevealScenario[] = scenarioRows
    .map((s) => ({
      id: toStr(s.id),
      slug: toStr(s.slug),
      title: toStr(s.title),
      points: Number(s.points),
      correctAnswer: s.correct_answer !== null ? toStr(s.correct_answer) : null,
      isResolved: Boolean(s.is_resolved),
      isVoided: Boolean(s.is_voided),
      resolutionPhase: toStr(s.resolution_phase),
    }))
    .sort((a, b) => {
      const phaseA = PHASE_ORDER[a.resolutionPhase] ?? 99
      const phaseB = PHASE_ORDER[b.resolutionPhase] ?? 99
      if (phaseA !== phaseB) return phaseA - phaseB
      return b.points - a.points
    })

  // Step 2: Get leaderboard to know member order
  const standingsResult = await serviceClient
    .from('v2_gang_fixture_standings')
    .select('user_id, rank')
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('rank', { ascending: true })

  // Also get all gang members to show those who didn't predict
  const allMembersResult = await serviceClient
    .from('v2_gang_members')
    .select('user_id, status')
    .eq('gang_id', gangId)
    .in('status', ['approved', 'left', 'removed'])

  const allMemberRows = !hasNoData(allMembersResult)
    ? (allMembersResult.data as Array<{ user_id: unknown; status: unknown }>)
    : []

  const standingsRows = !hasNoData(standingsResult)
    ? (standingsResult.data as Array<{ user_id: unknown; rank: unknown }>)
    : []

  // Build rank map from standings
  const rankMap = new Map<string, number>()
  for (const s of standingsRows) {
    rankMap.set(toStr(s.user_id), Number(s.rank))
  }

  // Build status map
  const statusMap = new Map<string, MemberStatus>()
  for (const m of allMemberRows) {
    statusMap.set(toStr(m.user_id), parseMemberStatus(m.status))
  }

  // Collect all user IDs
  const allUserIds = allMemberRows.map((m) => toStr(m.user_id))
  if (allUserIds.length === 0) {
    return { members: [], scenarios, predictions: {} }
  }

  // Step 3: Get profiles
  const profileResult = await serviceClient
    .from('v2_profiles')
    .select('id, display_name')
    .in('id', allUserIds)

  const profileMap = new Map<string, string>()
  if (!hasNoData(profileResult)) {
    const profiles = profileResult.data as Array<{ id: unknown; display_name: unknown }>
    for (const p of profiles) {
      profileMap.set(toStr(p.id), toStr(p.display_name ?? 'Unknown'))
    }
  }

  // Build members list — ranked first, then unranked
  const rankedUserIds = new Set(standingsRows.map((s) => toStr(s.user_id)))
  const members: PredictionRevealMember[] = [
    // Ranked members first (by rank)
    ...standingsRows.map((s) => ({
      userId: toStr(s.user_id),
      displayName: profileMap.get(toStr(s.user_id)) ?? 'Unknown',
      rank: Number(s.rank),
      memberStatus: statusMap.get(toStr(s.user_id)) ?? 'approved',
    })),
    // Unranked members (who didn't predict)
    ...allMemberRows
      .filter((m) => !rankedUserIds.has(toStr(m.user_id)))
      .map((m, index) => ({
        userId: toStr(m.user_id),
        displayName: profileMap.get(toStr(m.user_id)) ?? 'Unknown',
        rank: standingsRows.length + index + 1,
        memberStatus: parseMemberStatus(m.status),
      })),
  ]

  // Step 4: Get predictions
  const predictionsResult = await serviceClient
    .from('v2_predictions')
    .select('user_id, scenario_id, value, is_correct, points_earned')
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)

  const predictions: Record<string, Record<string, PredictionRevealPick>> = {}

  if (!hasNoData(predictionsResult)) {
    const predRows = predictionsResult.data as Array<Record<string, unknown>>
    for (const p of predRows) {
      const uid = toStr(p.user_id)
      const sid = toStr(p.scenario_id)
      if (predictions[uid] === undefined) {
        predictions[uid] = {}
      }
      predictions[uid][sid] = {
        value: toStr(p.value),
        isCorrect: p.is_correct !== null ? Boolean(p.is_correct) : null,
        pointsEarned: Number(p.points_earned ?? 0),
      }
    }
  }

  return { members, scenarios, predictions }
}

// ---------------------------------------------------------------------------
// getUserOverallStats
// ---------------------------------------------------------------------------

/**
 * Aggregates across all of the user's v2_gang_season_standings rows.
 * Uses SQL aggregation.
 */
export async function getUserOverallStats(userId: string): Promise<UserOverallStats> {
  const serviceClient = createServiceRoleClient()

  const result = await serviceClient
    .from('v2_gang_season_standings')
    .select('gang_id, matches_predicted, total_points, total_correct, total_resolved')
    .eq('user_id', userId)

  if (hasError(result) || hasNoData(result)) {
    return {
      totalGangs: 0,
      totalMatchesPredicted: 0,
      totalPoints: 0,
      overallAccuracyPct: 0,
    }
  }

  const rows = result.data as Array<Record<string, unknown>>

  if (rows.length === 0) {
    return {
      totalGangs: 0,
      totalMatchesPredicted: 0,
      totalPoints: 0,
      overallAccuracyPct: 0,
    }
  }

  const gangIds = new Set<string>()
  let totalMatchesPredicted = 0
  let totalPoints = 0
  let totalCorrect = 0
  let totalResolved = 0

  for (const row of rows) {
    gangIds.add(toStr(row.gang_id))
    totalMatchesPredicted += Number(row.matches_predicted)
    totalPoints += Number(row.total_points)
    totalCorrect += Number(row.total_correct)
    totalResolved += Number(row.total_resolved)
  }

  const overallAccuracyPct =
    totalResolved > 0 ? Math.round((totalCorrect / totalResolved) * 100) : 0

  return {
    totalGangs: gangIds.size,
    totalMatchesPredicted,
    totalPoints,
    overallAccuracyPct,
  }
}

// ---------------------------------------------------------------------------
// getMemberListWithPoints
// ---------------------------------------------------------------------------

/**
 * Returns all gang members joined with their v2_gang_season_standings row.
 * Includes left/removed members for grayed-out display.
 */
export async function getMemberListWithPoints(
  gangId: string,
  seasonId: string,
): Promise<MemberWithPoints[]> {
  const serviceClient = createServiceRoleClient()

  // Step 1: Get all gang members (approved + left + removed)
  const memberResult = await serviceClient
    .from('v2_gang_members')
    .select('user_id, role, status, is_blocked, approved_at')
    .eq('gang_id', gangId)
    .in('status', ['approved', 'left', 'removed'])

  if (hasError(memberResult) || hasNoData(memberResult)) return []

  const memberRows = memberResult.data as Array<{
    user_id: unknown
    role: unknown
    status: unknown
    is_blocked: unknown
    approved_at: unknown
  }>

  if (memberRows.length === 0) return []

  const userIds = memberRows.map((m) => toStr(m.user_id))

  // Step 2: Get profiles + standings in parallel
  const [profileResult, standingsResult] = await Promise.all([
    serviceClient.from('v2_profiles').select('id, display_name').in('id', userIds),
    serviceClient
      .from('v2_gang_season_standings')
      .select('user_id, total_points, rank')
      .eq('gang_id', gangId)
      .eq('season_id', seasonId)
      .in('user_id', userIds),
  ])

  const profileMap = new Map<string, string>()
  if (!hasNoData(profileResult)) {
    const profiles = profileResult.data as Array<{ id: unknown; display_name: unknown }>
    for (const p of profiles) {
      profileMap.set(toStr(p.id), toStr(p.display_name ?? 'Unknown'))
    }
  }

  const pointsMap = new Map<string, { totalPoints: number; rank: number | null }>()
  if (!hasNoData(standingsResult)) {
    const standings = standingsResult.data as Array<Record<string, unknown>>
    for (const s of standings) {
      pointsMap.set(toStr(s.user_id), {
        totalPoints: Number(s.total_points),
        rank: s.rank !== null ? Number(s.rank) : null,
      })
    }
  }

  return memberRows.map((m) => {
    const uid = toStr(m.user_id)
    const standings = pointsMap.get(uid)
    return {
      userId: uid,
      displayName: profileMap.get(uid) ?? 'Unknown',
      role: toStr(m.role) === 'admin' ? ('admin' as const) : ('member' as const),
      status: toStr(m.status) as MemberWithPoints['status'],
      isBlocked: Boolean(m.is_blocked),
      totalPoints: standings?.totalPoints ?? 0,
      rank: standings?.rank ?? null,
      joinedAt: m.approved_at !== null ? toStr(m.approved_at) : null,
    }
  })
}

// ---------------------------------------------------------------------------
// getActiveSeason
// ---------------------------------------------------------------------------

export interface ActiveSeason {
  id: string
  name: string
}

/**
 * Returns the currently active season, or null if none.
 */
export async function getActiveSeason(): Promise<ActiveSeason | null> {
  const serviceClient = createServiceRoleClient()

  const result = await serviceClient
    .from('v2_seasons')
    .select('id, name')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (result.data === null) return null

  const season = result.data as { id: unknown; name: unknown }
  return {
    id: toStr(season.id),
    name: toStr(season.name),
  }
}

// ---------------------------------------------------------------------------
// getUserProfile
// ---------------------------------------------------------------------------

export interface UserProfile {
  displayName: string
  dateOfBirth: string | null
}

/**
 * Returns the profile for a given user ID.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const serviceClient = createServiceRoleClient()

  const result = await serviceClient
    .from('v2_profiles')
    .select('display_name, date_of_birth')
    .eq('id', userId)
    .single()

  if (hasError(result) || hasNoData(result)) return null

  const profile = result.data as { display_name: unknown; date_of_birth: unknown }
  return {
    displayName: toStr(profile.display_name ?? 'Unknown'),
    dateOfBirth: profile.date_of_birth !== null ? toStr(profile.date_of_birth) : null,
  }
}

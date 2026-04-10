import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { MemberStatus } from '@/types'
import { isDeparted } from '@/lib/member-status'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type ProfileRow = Pick<
  Database['public']['Tables']['v2_profiles']['Row'],
  'display_name' | 'avatar_url'
>

/**
 * Shape returned by `getGangSeasonStandings` — one entry per member in the standings.
 */
export interface GangStandingEntry {
  userId: string
  totalPoints: number
  matchesPredicted: number
  accuracyPct: number
  pointsPerMatch: number
  rank: number | null
  displayName: string | null
  avatarUrl: string | null
  memberStatus: MemberStatus
}

/**
 * Shape returned by `getGangActiveSeason`.
 */
export interface GangActiveSeason {
  seasonId: string
  leagueId: string
}

// ---------------------------------------------------------------------------
// getGangSeasonStandings
// ---------------------------------------------------------------------------

/**
 * Fetch season standings for a gang, joined with profile data and member statuses.
 *
 * Ordered by rank ascending (nulls last — unranked members at the bottom).
 * Departed members (status: 'left' | 'removed') are sorted to the end.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getGangSeasonStandings(
  gangId: string,
  seasonId: string,
): Promise<GangStandingEntry[]> {
  const supabase = await createServerClient()

  // Query 1: season standings joined with profiles
  const { data, error } = await supabase
    .from('v2_gang_season_standings')
    .select(
      `
      user_id, total_points, matches_predicted, accuracy_pct, points_per_match, rank,
      v2_profiles (display_name, avatar_url)
    `,
    )
    .eq('gang_id', gangId)
    .eq('season_id', seasonId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) throw error
  if (!data || data.length === 0) return []

  // Query 2: batch fetch member statuses for all users in the standings
  const userIds = data.map((s) => s.user_id)
  const { data: members, error: membersError } = await supabase
    .from('v2_gang_members')
    .select('user_id, status')
    .eq('gang_id', gangId)
    .in('user_id', userIds)

  if (membersError) throw membersError

  // Build a lookup map: user_id → member status
  const memberStatusMap = new Map<string, MemberStatus>(
    (members ?? []).map((m) => [m.user_id, m.status]),
  )

  // Map and sort: active members first by rank, departed at end
  const entries: GangStandingEntry[] = data.map((row) => {
    const profile = row.v2_profiles as unknown as ProfileRow | null
    const status = memberStatusMap.get(row.user_id)
    if (status === undefined && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[DAL] getGangSeasonStandings: user ${row.user_id} has standings row but no membership record — defaulting to 'removed'`,
      )
    }
    // Safer default than 'approved': dim the user rather than falsely surface
    // them as active if the membership row is missing (e.g., data drift).
    const resolvedStatus: MemberStatus = status ?? 'removed'

    return {
      userId: row.user_id,
      totalPoints: row.total_points,
      matchesPredicted: row.matches_predicted,
      // DECIMAL(5,2) columns can arrive as strings from supabase-js; coerce
      // here so downstream `.toFixed()` callers never see a string.
      accuracyPct: Number(row.accuracy_pct),
      pointsPerMatch: Number(row.points_per_match),
      rank: row.rank,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      memberStatus: resolvedStatus,
    }
  })

  // Sort: active members first (by rank from DB), then departed at bottom
  const active = entries.filter((e) => !isDeparted(e.memberStatus))
  const departed = entries.filter((e) => isDeparted(e.memberStatus))

  return [...active, ...departed]
}

// ---------------------------------------------------------------------------
// getGangActiveSeason
// ---------------------------------------------------------------------------

/**
 * Get the active season for a gang from `v2_gang_league_seasons`.
 *
 * Returns the first active enrollment found, or null if none exists.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getGangActiveSeason(
  gangId: string,
): Promise<GangActiveSeason | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_gang_league_seasons')
    .select('season_id, league_id')
    .eq('gang_id', gangId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    seasonId: data.season_id,
    leagueId: data.league_id,
  }
}

// ---------------------------------------------------------------------------
// MatchLeaderboardEntry type
// ---------------------------------------------------------------------------

/**
 * Shape returned by `getMatchLeaderboard` — one entry per member who has
 * fixture standings for a specific match.
 */
export interface MatchLeaderboardEntry {
  userId: string
  predictedCount: number
  resolvedCount: number
  correctCount: number
  pointsEarned: number
  rank: number | null
  lastSubmittedAt: string | null
  displayName: string | null
  avatarUrl: string | null
  memberStatus: MemberStatus
}

// ---------------------------------------------------------------------------
// getMatchLeaderboard
// ---------------------------------------------------------------------------

/**
 * Fetch match leaderboard standings for a gang + fixture, joined with profiles
 * and member statuses.
 *
 * Ordered by rank ascending (nulls last — unranked members at the bottom).
 * Departed members (status: 'left' | 'removed') are sorted to the end.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on database error.
 */
export async function getMatchLeaderboard(
  gangId: string,
  fixtureId: string,
): Promise<MatchLeaderboardEntry[]> {
  const supabase = await createServerClient()

  // Query 1: fixture standings joined with profiles
  const { data: standings, error: standingsError } = await supabase
    .from('v2_gang_fixture_standings')
    .select(
      `
      user_id, predicted_count, resolved_count, correct_count, points_earned, rank, last_submitted_at,
      v2_profiles (display_name, avatar_url)
    `,
    )
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (standingsError) throw standingsError
  if (!standings || standings.length === 0) return []

  // Query 2: batch fetch member statuses for all users in the standings
  const userIds = standings.map((s) => s.user_id)
  const { data: members, error: membersError } = await supabase
    .from('v2_gang_members')
    .select('user_id, status')
    .eq('gang_id', gangId)
    .in('user_id', userIds)

  if (membersError) throw membersError

  // Build a lookup map: user_id → member status
  const memberStatusMap = new Map<string, MemberStatus>(
    (members ?? []).map((m) => [m.user_id, m.status]),
  )

  // Map and sort: active members first by rank, departed at end
  const entries: MatchLeaderboardEntry[] = standings.map((row) => {
    const profile = row.v2_profiles as unknown as ProfileRow | null
    const status = memberStatusMap.get(row.user_id)
    if (status === undefined && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[DAL] getMatchLeaderboard: user ${row.user_id} has standings row but no membership record — defaulting to 'removed'`,
      )
    }
    // Safer default than 'approved': dim the user rather than falsely surface
    // them as active if the membership row is missing (e.g., data drift).
    const resolvedStatus: MemberStatus = status ?? 'removed'

    return {
      userId: row.user_id,
      predictedCount: row.predicted_count,
      resolvedCount: row.resolved_count,
      correctCount: row.correct_count,
      pointsEarned: row.points_earned,
      rank: row.rank,
      lastSubmittedAt: row.last_submitted_at,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      memberStatus: resolvedStatus,
    }
  })

  // Sort: active members first (by rank from DB), then departed at bottom
  const active = entries.filter((e) => !isDeparted(e.memberStatus))
  const departed = entries.filter((e) => isDeparted(e.memberStatus))

  return [...active, ...departed]
}

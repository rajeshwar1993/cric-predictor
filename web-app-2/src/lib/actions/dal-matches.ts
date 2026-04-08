import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpcomingMatch {
  fixtureId: string
  matchNumber: number
  homeTeamCode: string
  awayTeamCode: string
  startDatetime: string
  venueName: string
  status: 'upcoming' | 'live'
  predictionDeadlineMins: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(val: unknown): string {
  return String(val)
}

// ---------------------------------------------------------------------------
// getUpcomingMatchesForGang
// ---------------------------------------------------------------------------

/**
 * Returns up to 3 upcoming/live matches for a gang's enrolled season(s).
 *
 * Joins:
 *   v2_gang_league_seasons → v2_league_season_fixtures → v2_league_teams (home + away)
 *
 * Filters:
 *   - gang_league_seasons.is_active = true
 *   - fixture status IN ('upcoming', 'live')
 *
 * Orders by start_datetime ASC, limits to 3.
 */
// ---------------------------------------------------------------------------
// LiveFixture (for LIVE-UI-002)
// ---------------------------------------------------------------------------

export interface LiveFixtureLiveScore {
  fixtureId: string
  homeTeamScore: string | null
  awayTeamScore: string | null
  homeTeamOvers: number | null
  awayTeamOvers: number | null
  battingTeamId: string | null
  currentRunRate: number | null
  last6Balls: string | null
  strikerName: string | null
  strikerScore: string | null
  nonStrikerName: string | null
  nonStrikerScore: string | null
  currentBowler: string | null
  currentPartnership: string | null
  lastPolledAt: string | null
}

export interface LiveFixture {
  fixtureId: string
  matchNumber: number
  homeTeamId: string
  homeTeamCode: string
  homeTeamName: string
  awayTeamId: string
  awayTeamCode: string
  awayTeamName: string
  liveScore: LiveFixtureLiveScore | null
}

/**
 * Returns all live fixtures for a gang's enrolled season(s), with live score data.
 */
export async function getLiveFixturesForGang(gangId: string): Promise<LiveFixture[]> {
  const serviceClient = createServiceRoleClient()

  // Step 1: Get the gang's enrolled season(s)
  const seasonResult = await serviceClient
    .from('v2_gang_league_seasons')
    .select('season_id')
    .eq('gang_id', gangId)
    .eq('is_active', true)

  if (seasonResult.error !== null) return []

  const seasons = seasonResult.data as Array<{ season_id: unknown }>
  if (seasons.length === 0) return []

  const seasonIds = seasons.map((s) => toStr(s.season_id))

  // Step 2: Get live fixtures
  const fixtureResult = await serviceClient
    .from('v2_league_season_fixtures')
    .select('id, match_number, home_team_id, away_team_id, start_datetime, status')
    .in('season_id', seasonIds)
    .eq('status', 'live')
    .order('start_datetime', { ascending: true })

  if (fixtureResult.error !== null) return []

  const fixtures = fixtureResult.data as Array<{
    id: unknown
    match_number: unknown
    home_team_id: unknown
    away_team_id: unknown
    start_datetime: unknown
    status: unknown
  }>

  if (fixtures.length === 0) return []

  // Step 3: Get team info
  const teamIds = new Set<string>()
  for (const f of fixtures) {
    teamIds.add(toStr(f.home_team_id))
    teamIds.add(toStr(f.away_team_id))
  }

  const teamResult = await serviceClient
    .from('v2_league_teams')
    .select('id, code, name')
    .in('id', Array.from(teamIds))

  const teamMap = new Map<string, { code: string; name: string }>()
  if (teamResult.data !== null) {
    const teams = teamResult.data as Array<{ id: unknown; code: unknown; name: unknown }>
    for (const t of teams) {
      teamMap.set(toStr(t.id), { code: toStr(t.code), name: toStr(t.name) })
    }
  }

  // Step 4: Get live scores for all live fixture IDs
  const fixtureIds = fixtures.map((f) => toStr(f.id))
  const liveScoreResult = await serviceClient
    .from('v2_fixture_live_scores')
    .select('*')
    .in('fixture_id', fixtureIds)

  const liveScoreMap = new Map<string, LiveFixtureLiveScore>()
  if (liveScoreResult.data !== null) {
    const scores = liveScoreResult.data as Array<Record<string, unknown>>
    for (const s of scores) {
      liveScoreMap.set(toStr(s.fixture_id), {
        fixtureId: toStr(s.fixture_id),
        homeTeamScore: s.home_team_score !== null ? toStr(s.home_team_score) : null,
        awayTeamScore: s.away_team_score !== null ? toStr(s.away_team_score) : null,
        homeTeamOvers: s.home_team_overs !== null ? Number(s.home_team_overs) : null,
        awayTeamOvers: s.away_team_overs !== null ? Number(s.away_team_overs) : null,
        battingTeamId: s.batting_team_id !== null ? toStr(s.batting_team_id) : null,
        currentRunRate: s.current_run_rate !== null ? Number(s.current_run_rate) : null,
        last6Balls: s.last_6_balls !== null ? toStr(s.last_6_balls) : null,
        strikerName: s.striker_name !== null ? toStr(s.striker_name) : null,
        strikerScore: s.striker_score !== null ? toStr(s.striker_score) : null,
        nonStrikerName: s.non_striker_name !== null ? toStr(s.non_striker_name) : null,
        nonStrikerScore: s.non_striker_score !== null ? toStr(s.non_striker_score) : null,
        currentBowler: s.current_bowler !== null ? toStr(s.current_bowler) : null,
        currentPartnership: s.current_partnership !== null ? toStr(s.current_partnership) : null,
        lastPolledAt: s.last_polled_at !== null ? toStr(s.last_polled_at) : null,
      })
    }
  }

  // Step 5: Map to LiveFixture[]
  return fixtures.map((f) => {
    const homeTeamId = toStr(f.home_team_id)
    const awayTeamId = toStr(f.away_team_id)
    const homeTeam = teamMap.get(homeTeamId)
    const awayTeam = teamMap.get(awayTeamId)
    return {
      fixtureId: toStr(f.id),
      matchNumber: Number(f.match_number),
      homeTeamId,
      homeTeamCode: homeTeam?.code ?? 'TBD',
      homeTeamName: homeTeam?.name ?? 'TBD',
      awayTeamId,
      awayTeamCode: awayTeam?.code ?? 'TBD',
      awayTeamName: awayTeam?.name ?? 'TBD',
      liveScore: liveScoreMap.get(toStr(f.id)) ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// RecentResult (for LIVE-UI-003)
// ---------------------------------------------------------------------------

export type RecentResultStatus = 'completed' | 'resolved' | 'abandoned' | 'no_result'

export interface RecentResult {
  fixtureId: string
  matchNumber: number
  homeTeamCode: string
  awayTeamCode: string
  startDatetime: string
  status: RecentResultStatus
  /** Winner team name (only when resolved) */
  winnerName: string | null
  /** Winner team code (only when resolved) */
  winnerCode: string | null
  /** Home team innings score */
  homeScore: number | null
  /** Away team innings score */
  awayScore: number | null
  /** User's prediction stats for this fixture (null if no standings row) */
  userStats: {
    predictedCount: number
    correctCount: number
    pointsEarned: number
  } | null
  /** Total scenarios for this fixture in this gang */
  totalScenarios: number
}

/**
 * Returns the last `limit` completed/resolved/abandoned/no_result fixtures
 * for a gang's enrolled season(s), with user prediction stats.
 */
export async function getRecentResultsForGang(
  gangId: string,
  userId: string,
  limit = 3,
): Promise<RecentResult[]> {
  const serviceClient = createServiceRoleClient()

  // Step 1: Get the gang's enrolled season(s)
  const seasonResult = await serviceClient
    .from('v2_gang_league_seasons')
    .select('season_id')
    .eq('gang_id', gangId)
    .eq('is_active', true)

  if (seasonResult.error !== null) return []

  const seasons = seasonResult.data as Array<{ season_id: unknown }>
  if (seasons.length === 0) return []

  const seasonIds = seasons.map((s) => toStr(s.season_id))

  // Step 2: Get recent completed/resolved/abandoned/no_result fixtures
  const fixtureResult = await serviceClient
    .from('v2_league_season_fixtures')
    .select('id, match_number, home_team_id, away_team_id, start_datetime, status, season_id')
    .in('season_id', seasonIds)
    .in('status', ['completed', 'resolved', 'abandoned', 'no_result'])
    .order('start_datetime', { ascending: false })
    .limit(limit)

  if (fixtureResult.error !== null) return []

  const fixtures = fixtureResult.data as Array<{
    id: unknown
    match_number: unknown
    home_team_id: unknown
    away_team_id: unknown
    start_datetime: unknown
    status: unknown
    season_id: unknown
  }>

  if (fixtures.length === 0) return []

  // Step 3: Get team info
  const teamIds = new Set<string>()
  for (const f of fixtures) {
    teamIds.add(toStr(f.home_team_id))
    teamIds.add(toStr(f.away_team_id))
  }

  const teamResult = await serviceClient
    .from('v2_league_teams')
    .select('id, code, name')
    .in('id', Array.from(teamIds))

  const teamMap = new Map<string, { code: string; name: string }>()
  if (teamResult.data !== null) {
    const teams = teamResult.data as Array<{ id: unknown; code: unknown; name: unknown }>
    for (const t of teams) {
      teamMap.set(toStr(t.id), { code: toStr(t.code), name: toStr(t.name) })
    }
  }

  // Step 4: Get fixture results for all fixture IDs
  const fixtureIds = fixtures.map((f) => toStr(f.id))
  const resultsResult = await serviceClient
    .from('v2_fixture_results')
    .select('fixture_id, match_winner_id, home_team_innings_score, away_team_innings_score')
    .in('fixture_id', fixtureIds)

  const resultMap = new Map<
    string,
    { winnerId: string | null; homeScore: number | null; awayScore: number | null }
  >()
  if (resultsResult.data !== null) {
    const results = resultsResult.data as Array<Record<string, unknown>>
    for (const r of results) {
      resultMap.set(toStr(r.fixture_id), {
        winnerId: r.match_winner_id !== null ? toStr(r.match_winner_id) : null,
        homeScore: r.home_team_innings_score !== null ? Number(r.home_team_innings_score) : null,
        awayScore: r.away_team_innings_score !== null ? Number(r.away_team_innings_score) : null,
      })
    }
  }

  // Step 5: Get user standings for these fixtures
  const standingsResult = await serviceClient
    .from('v2_gang_fixture_standings')
    .select('fixture_id, predicted_count, correct_count, points_earned')
    .eq('gang_id', gangId)
    .eq('user_id', userId)
    .in('fixture_id', fixtureIds)

  const standingsMap = new Map<
    string,
    { predictedCount: number; correctCount: number; pointsEarned: number }
  >()
  if (standingsResult.data !== null) {
    const standings = standingsResult.data as Array<Record<string, unknown>>
    for (const s of standings) {
      standingsMap.set(toStr(s.fixture_id), {
        predictedCount: Number(s.predicted_count),
        correctCount: Number(s.correct_count),
        pointsEarned: Number(s.points_earned),
      })
    }
  }

  // Step 6: Get scenario counts per fixture (for "X/totalScenarios" display)
  const scenarioCountResult = await serviceClient
    .from('v2_fixture_scenarios')
    .select('fixture_id')
    .eq('gang_id', gangId)
    .in('fixture_id', fixtureIds)

  const scenarioCountMap = new Map<string, number>()
  if (scenarioCountResult.data !== null) {
    const scenarios = scenarioCountResult.data as Array<Record<string, unknown>>
    for (const s of scenarios) {
      const fid = toStr(s.fixture_id)
      scenarioCountMap.set(fid, (scenarioCountMap.get(fid) ?? 0) + 1)
    }
  }

  // Step 7: Map to RecentResult[]
  return fixtures.map((f) => {
    const homeTeamId = toStr(f.home_team_id)
    const awayTeamId = toStr(f.away_team_id)
    const homeTeam = teamMap.get(homeTeamId)
    const awayTeam = teamMap.get(awayTeamId)
    const result = resultMap.get(toStr(f.id))
    const standings = standingsMap.get(toStr(f.id))
    const totalScenarios = scenarioCountMap.get(toStr(f.id)) ?? 0

    let winnerName: string | null = null
    let winnerCode: string | null = null
    if (result?.winnerId !== null && result?.winnerId !== undefined) {
      const winnerTeam = teamMap.get(result.winnerId)
      winnerName = winnerTeam?.name ?? null
      winnerCode = winnerTeam?.code ?? null
    }

    const statusStr = toStr(f.status)
    let typedStatus: RecentResultStatus = 'completed'
    if (statusStr === 'resolved' || statusStr === 'abandoned' || statusStr === 'no_result') {
      typedStatus = statusStr
    }

    return {
      fixtureId: toStr(f.id),
      matchNumber: Number(f.match_number),
      homeTeamCode: homeTeam?.code ?? 'TBD',
      awayTeamCode: awayTeam?.code ?? 'TBD',
      startDatetime: toStr(f.start_datetime),
      status: typedStatus,
      winnerName,
      winnerCode,
      homeScore: result?.homeScore ?? null,
      awayScore: result?.awayScore ?? null,
      userStats: standings ?? null,
      totalScenarios,
    }
  })
}

// ---------------------------------------------------------------------------
// getUpcomingMatchesForGang
// ---------------------------------------------------------------------------

export async function getUpcomingMatchesForGang(gangId: string): Promise<UpcomingMatch[]> {
  const serviceClient = createServiceRoleClient()

  // Step 1: Get the gang's enrolled season(s)
  const seasonResult = await serviceClient
    .from('v2_gang_league_seasons')
    .select('season_id, prediction_deadline_mins')
    .eq('gang_id', gangId)
    .eq('is_active', true)

  if (seasonResult.error !== null) return []

  const seasons = seasonResult.data as Array<{
    season_id: unknown
    prediction_deadline_mins: unknown
  }>

  if (seasons.length === 0) return []

  const seasonIds = seasons.map((s) => toStr(s.season_id))

  // Use the first active season's prediction deadline (gangs typically enroll in one season)
  const predictionDeadlineMins = Number(seasons[0]?.prediction_deadline_mins ?? 45)

  // Step 2: Get upcoming/live fixtures for those seasons
  const fixtureResult = await serviceClient
    .from('v2_league_season_fixtures')
    .select('id, match_number, home_team_id, away_team_id, start_datetime, venue_name, status')
    .in('season_id', seasonIds)
    .in('status', ['upcoming', 'live'])
    .order('start_datetime', { ascending: true })
    .limit(3)

  if (fixtureResult.error !== null) return []

  const fixtures = fixtureResult.data as Array<{
    id: unknown
    match_number: unknown
    home_team_id: unknown
    away_team_id: unknown
    start_datetime: unknown
    venue_name: unknown
    status: unknown
  }>

  if (fixtures.length === 0) return []

  // Step 3: Collect all team IDs and fetch team codes
  const teamIds = new Set<string>()
  for (const f of fixtures) {
    teamIds.add(toStr(f.home_team_id))
    teamIds.add(toStr(f.away_team_id))
  }

  const teamResult = await serviceClient
    .from('v2_league_teams')
    .select('id, code')
    .in('id', Array.from(teamIds))

  const teamCodeMap = new Map<string, string>()
  if (teamResult.data !== null) {
    const teams = teamResult.data as Array<{ id: unknown; code: unknown }>
    for (const t of teams) {
      teamCodeMap.set(toStr(t.id), toStr(t.code))
    }
  }

  // Step 4: Map to UpcomingMatch[]
  return fixtures.map((f) => ({
    fixtureId: toStr(f.id),
    matchNumber: Number(f.match_number),
    homeTeamCode: teamCodeMap.get(toStr(f.home_team_id)) ?? 'TBD',
    awayTeamCode: teamCodeMap.get(toStr(f.away_team_id)) ?? 'TBD',
    startDatetime: toStr(f.start_datetime),
    venueName: toStr(f.venue_name),
    status: toStr(f.status) === 'live' ? ('live' as const) : ('upcoming' as const),
    predictionDeadlineMins,
  }))
}

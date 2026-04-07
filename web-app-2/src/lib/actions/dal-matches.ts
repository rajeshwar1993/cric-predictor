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

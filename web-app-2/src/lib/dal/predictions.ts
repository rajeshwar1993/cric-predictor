import 'server-only'

import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResolutionPhase =
  | 'toss'
  | 'first_wicket'
  | 'team_powerplay_end'
  | 'mid_match'
  | 'team_innings_end'
  | 'end'
  | 'post_match'

export type InputType = 'team_pick' | 'player_pick' | 'range' | 'yes_no'

export interface FixtureScenario {
  id: string
  templateId: string | null
  fixtureId: string
  gangId: string
  leagueId: string
  seasonId: string
  slug: string
  title: string
  inputType: InputType
  options: string[] | null
  points: number
  resolutionPhase: ResolutionPhase
  isResolved: boolean
  correctAnswer: string | null
}

export interface UserPrediction {
  id: string
  scenarioId: string
  value: string
  submittedAt: string
}

export interface Player {
  id: string
  name: string
  teamId: string
  teamCode: string
  role: string | null
}

export interface FixtureWithDeadline {
  fixture: {
    id: string
    leagueId: string
    seasonId: string
    matchNumber: number
    homeTeamId: string
    awayTeamId: string
    startDatetime: string
    venueName: string
    status: string
  }
  predictionDeadlineMins: number
  deadline: Date
  windowOpensAt: Date
  isOpen: boolean
  isLocked: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(val: unknown): string {
  return String(val)
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

function parseOptions(raw: unknown): string[] | null {
  if (raw === null || raw === undefined) return null
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      // not valid JSON
    }
  }
  return null
}

/**
 * Helper to check if a Supabase query result has an error.
 * Avoids no-unnecessary-condition lint rule issues with permissive Database types.
 */
function hasError(result: { error: unknown }): boolean {
  return result.error !== null && result.error !== undefined
}

/**
 * Helper to check if query data is missing.
 */
function hasNoData(result: { data: unknown }): boolean {
  return result.data === null || result.data === undefined
}

// ---------------------------------------------------------------------------
// getScenariosForFixture
// ---------------------------------------------------------------------------

/**
 * Returns all non-voided fixture scenarios for (gang, fixture),
 * ordered by resolution_phase then points DESC.
 */
export async function getScenariosForFixture(
  gangId: string,
  fixtureId: string,
): Promise<FixtureScenario[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('v2_fixture_scenarios')
    .select(
      'id, template_id, fixture_id, gang_id, league_id, season_id, slug, title, input_type, options, points, resolution_phase, is_resolved, correct_answer',
    )
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .eq('is_voided', false)

  if (hasError(result)) return []

  const rows = result.data as Array<Record<string, unknown>>

  const mapped: FixtureScenario[] = rows.map((r) => ({
    id: toStr(r['id']),
    templateId: r['template_id'] !== null ? toStr(r['template_id']) : null,
    fixtureId: toStr(r['fixture_id']),
    gangId: toStr(r['gang_id']),
    leagueId: toStr(r['league_id']),
    seasonId: toStr(r['season_id']),
    slug: toStr(r['slug']),
    title: toStr(r['title']),
    inputType: toStr(r['input_type']) as InputType,
    options: parseOptions(r['options']),
    points: Number(r['points']),
    resolutionPhase: toStr(r['resolution_phase']) as ResolutionPhase,
    isResolved: Boolean(r['is_resolved']),
    correctAnswer: r['correct_answer'] !== null ? toStr(r['correct_answer']) : null,
  }))

  // Sort by resolution_phase order, then by points DESC within each phase
  mapped.sort((a, b) => {
    const phaseA = PHASE_ORDER[a.resolutionPhase] ?? 99
    const phaseB = PHASE_ORDER[b.resolutionPhase] ?? 99
    if (phaseA !== phaseB) return phaseA - phaseB
    return b.points - a.points
  })

  return mapped
}

// ---------------------------------------------------------------------------
// getUserPredictions
// ---------------------------------------------------------------------------

/**
 * Returns existing predictions for the user across the given scenario IDs.
 * Used to pre-fill the prediction form.
 */
export async function getUserPredictions(
  userId: string,
  scenarioIds: string[],
): Promise<UserPrediction[]> {
  if (scenarioIds.length === 0) return []

  const supabase = await createClient()

  const result = await supabase
    .from('v2_predictions')
    .select('id, scenario_id, value, submitted_at')
    .eq('user_id', userId)
    .in('scenario_id', scenarioIds)

  if (hasError(result)) return []

  const rows = result.data as Array<Record<string, unknown>>

  return rows.map((r) => ({
    id: toStr(r['id']),
    scenarioId: toStr(r['scenario_id']),
    value: toStr(r['value']),
    submittedAt: toStr(r['submitted_at']),
  }))
}

// ---------------------------------------------------------------------------
// getPlayersForFixture
// ---------------------------------------------------------------------------

/**
 * Returns both teams' rosters for the fixture via v2_league_season_team_players
 * joined with v2_players and v2_league_teams.
 */
export async function getPlayersForFixture(fixtureId: string): Promise<Player[]> {
  const supabase = await createClient()

  // Step 1: Get fixture to find season_id, home_team_id, away_team_id
  const fixtureResult = await supabase
    .from('v2_league_season_fixtures')
    .select('season_id, home_team_id, away_team_id')
    .eq('id', fixtureId)
    .single()

  if (hasError(fixtureResult) || hasNoData(fixtureResult)) return []

  const fixtureData = fixtureResult.data as Record<string, unknown>
  const seasonId = toStr(fixtureData['season_id'])
  const homeTeamId = toStr(fixtureData['home_team_id'])
  const awayTeamId = toStr(fixtureData['away_team_id'])

  // Step 2: Get team codes
  const teamResult = await supabase
    .from('v2_league_teams')
    .select('id, code')
    .in('id', [homeTeamId, awayTeamId])

  const teamCodeMap = new Map<string, string>()
  if (!hasNoData(teamResult)) {
    const teams = teamResult.data as Array<{ id: unknown; code: unknown }>
    for (const t of teams) {
      teamCodeMap.set(toStr(t.id), toStr(t.code))
    }
  }

  // Step 3: Get players for both teams in this season
  const playerMappingResult = await supabase
    .from('v2_league_season_team_players')
    .select('team_id, player_id')
    .eq('season_id', seasonId)
    .in('team_id', [homeTeamId, awayTeamId])

  if (hasError(playerMappingResult) || hasNoData(playerMappingResult)) return []

  const mappings = playerMappingResult.data as Array<{
    team_id: unknown
    player_id: unknown
  }>

  if (mappings.length === 0) return []

  const playerIds = mappings.map((m) => toStr(m.player_id))
  const playerTeamMap = new Map<string, string>()
  for (const m of mappings) {
    playerTeamMap.set(toStr(m.player_id), toStr(m.team_id))
  }

  // Step 4: Get player details
  const playersResult = await supabase
    .from('v2_players')
    .select('id, name, role')
    .in('id', playerIds)

  if (hasError(playersResult) || hasNoData(playersResult)) return []

  const players = playersResult.data as Array<{
    id: unknown
    name: unknown
    role: unknown
  }>

  return players.map((p) => {
    const playerId = toStr(p.id)
    const teamId = playerTeamMap.get(playerId) ?? ''
    return {
      id: playerId,
      name: toStr(p.name),
      teamId,
      teamCode: teamCodeMap.get(teamId) ?? 'TBD',
      role: p.role !== null ? toStr(p.role) : null,
    }
  })
}

// ---------------------------------------------------------------------------
// getTeamCodesForFixture
// ---------------------------------------------------------------------------

/**
 * Returns team codes for the home and away teams of a fixture.
 */
export async function getTeamCodesForFixture(
  homeTeamId: string,
  awayTeamId: string,
): Promise<{ homeCode: string; awayCode: string }> {
  const supabase = await createClient()

  const result = await supabase
    .from('v2_league_teams')
    .select('id, code')
    .in('id', [homeTeamId, awayTeamId])

  if (hasError(result)) return { homeCode: 'TBD', awayCode: 'TBD' }

  const teams = result.data as Array<{ id: unknown; code: unknown }>
  let homeCode = 'TBD'
  let awayCode = 'TBD'

  for (const t of teams) {
    if (toStr(t.id) === homeTeamId) homeCode = toStr(t.code)
    if (toStr(t.id) === awayTeamId) awayCode = toStr(t.code)
  }

  return { homeCode, awayCode }
}

// ---------------------------------------------------------------------------
// getMembersWhoPredictedForFixture
// ---------------------------------------------------------------------------

/**
 * Wraps the get_members_who_predicted RPC (SECURITY DEFINER).
 * Returns an array of user IDs who have submitted predictions.
 */
export async function getMembersWhoPredictedForFixture(
  gangId: string,
  fixtureId: string,
): Promise<string[]> {
  const supabase = await createClient()

  const result = await supabase.rpc('get_members_who_predicted', {
    p_gang_id: gangId,
    p_fixture_id: fixtureId,
  })

  if (hasError(result)) return []

  const data = result.data as unknown
  if (Array.isArray(data)) {
    return data.map((row: unknown) => {
      if (typeof row === 'string') return row
      if (typeof row === 'object' && row !== null && 'user_id' in row) {
        return toStr((row as { user_id: unknown }).user_id)
      }
      return toStr(row)
    })
  }

  return []
}

// ---------------------------------------------------------------------------
// getFixtureWithDeadline
// ---------------------------------------------------------------------------

/**
 * Returns fixture details joined with the gang's prediction_deadline_mins,
 * plus computed deadline, windowOpensAt, isOpen, and isLocked.
 */
export async function getFixtureWithDeadline(
  gangId: string,
  fixtureId: string,
): Promise<FixtureWithDeadline | null> {
  const supabase = await createClient()

  // Step 1: Get fixture
  const fixtureResult = await supabase
    .from('v2_league_season_fixtures')
    .select(
      'id, league_id, season_id, match_number, home_team_id, away_team_id, start_datetime, venue_name, status',
    )
    .eq('id', fixtureId)
    .single()

  if (hasError(fixtureResult) || hasNoData(fixtureResult)) return null

  const f = fixtureResult.data as Record<string, unknown>

  // Step 2: Get gang's prediction_deadline_mins for the fixture's season
  const seasonResult = await supabase
    .from('v2_gang_league_seasons')
    .select('prediction_deadline_mins')
    .eq('gang_id', gangId)
    .eq('season_id', toStr(f['season_id']))
    .single()

  const predictionDeadlineMins = hasNoData(seasonResult)
    ? 45
    : Number((seasonResult.data as Record<string, unknown>)['prediction_deadline_mins'])

  // Compute derived values
  const startDatetime = new Date(toStr(f['start_datetime']))
  const deadline = new Date(startDatetime.getTime() - predictionDeadlineMins * 60 * 1000)
  const windowOpensAt = new Date(startDatetime.getTime() - 12 * 60 * 60 * 1000)
  const now = new Date()

  const fixtureStatus = toStr(f['status'])
  const isOpen = now >= windowOpensAt && now < deadline && fixtureStatus === 'upcoming'
  const isLocked = now >= deadline || fixtureStatus !== 'upcoming'

  return {
    fixture: {
      id: toStr(f['id']),
      leagueId: toStr(f['league_id']),
      seasonId: toStr(f['season_id']),
      matchNumber: Number(f['match_number']),
      homeTeamId: toStr(f['home_team_id']),
      awayTeamId: toStr(f['away_team_id']),
      startDatetime: toStr(f['start_datetime']),
      venueName: toStr(f['venue_name']),
      status: fixtureStatus,
    },
    predictionDeadlineMins,
    deadline,
    windowOpensAt,
    isOpen,
    isLocked,
  }
}

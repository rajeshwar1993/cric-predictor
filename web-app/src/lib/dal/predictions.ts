import { createServerClient } from '@/lib/supabase/server'
import type { ResolutionPhase, ScenarioInputType } from '@/types'
import type { Json } from '@/types/database'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/**
 * A fixture scenario with typed fields, used by the predict page.
 */
export interface FixtureScenarioRow {
  id: string
  fixtureId: string
  title: string
  description: string | null
  inputType: ScenarioInputType
  options: Json | null
  resolutionPhase: ResolutionPhase
  correctAnswer: string | null
  pointsWeight: number
  sortOrder: number
}

/**
 * A user's existing prediction for a scenario.
 */
export interface UserPredictionRow {
  id: string
  scenarioId: string
  value: string
  submittedAt: string
}

/**
 * A player available for player_select scenarios.
 */
export interface MatchPlayer {
  id: string
  name: string
  teamId: string
  role: string | null
}

// ---------------------------------------------------------------------------
// Phase ordering and labels
// ---------------------------------------------------------------------------

/**
 * Canonical order of resolution phases for display.
 */
export const PHASE_ORDER: ResolutionPhase[] = [
  'toss',
  'first_wicket',
  'team_powerplay_end',
  'mid_match',
  'team_innings_end',
  'end',
  'post_match',
]

/**
 * Human-readable labels for each resolution phase.
 */
export const PHASE_LABELS: Record<ResolutionPhase, string> = {
  toss: 'TOSS',
  first_wicket: 'FIRST WICKET',
  team_powerplay_end: 'POWERPLAY',
  mid_match: 'DURING MATCH',
  team_innings_end: 'INNINGS END',
  end: 'MATCH END',
  post_match: 'POST MATCH',
}

// ---------------------------------------------------------------------------
// getFixtureScenarios
// ---------------------------------------------------------------------------

/**
 * Fetch all scenarios for a specific fixture within a gang.
 *
 * Scenarios are per-gang-per-fixture (UNIQUE on gang_id, fixture_id, slug).
 * Both gangId and fixtureId are required to return the correct scenario set
 * for multi-gang users.
 *
 * Creates its own Supabase server client (DAL convention).
 * Returns empty array if no scenarios exist.
 * Throws on non-recoverable database errors.
 */
export async function getFixtureScenarios(
  gangId: string,
  fixtureId: string,
): Promise<FixtureScenarioRow[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_fixture_scenarios')
    .select(
      'id, fixture_id, title, description, input_type, options, resolution_phase, correct_answer, points_weight, sort_order',
    )
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  if (!data || data.length === 0) return []

  return data.map((row) => ({
    id: row.id,
    fixtureId: row.fixture_id,
    title: row.title,
    description: row.description,
    inputType: row.input_type,
    options: row.options,
    resolutionPhase: row.resolution_phase,
    correctAnswer: row.correct_answer,
    pointsWeight: row.points_weight,
    sortOrder: row.sort_order,
  }))
}

// ---------------------------------------------------------------------------
// getUserPredictions
// ---------------------------------------------------------------------------

/**
 * Fetch existing predictions for a user on a specific fixture within a gang.
 *
 * Returns the user's answers keyed by scenario_id for efficient lookups.
 *
 * Creates its own Supabase server client (DAL convention).
 * Returns empty array if no predictions exist.
 * Throws on non-recoverable database errors.
 */
export async function getUserPredictions(
  gangId: string,
  fixtureId: string,
  userId: string,
): Promise<UserPredictionRow[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_predictions')
    .select('id, scenario_id, value, submitted_at')
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .eq('user_id', userId)

  if (error) throw error
  if (!data || data.length === 0) return []

  return data.map((row) => ({
    id: row.id,
    scenarioId: row.scenario_id,
    value: row.value,
    submittedAt: row.submitted_at,
  }))
}

// ---------------------------------------------------------------------------
// getMatchPlayers
// ---------------------------------------------------------------------------

/**
 * Fetch players for both teams in a match.
 *
 * Joins `v2_league_season_team_players` with `v2_players` to get
 * player names and roles for player_select scenario pickers.
 *
 * Creates its own Supabase server client (DAL convention).
 * Returns empty array if no players found.
 * Throws on non-recoverable database errors.
 */
export async function getMatchPlayers(
  seasonId: string,
  homeTeamId: string,
  awayTeamId: string,
): Promise<MatchPlayer[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_league_season_team_players')
    .select(
      'team_id, player:v2_players!player_id (id, name, role)',
    )
    .eq('season_id', seasonId)
    .in('team_id', [homeTeamId, awayTeamId])

  if (error) throw error
  if (!data || data.length === 0) return []

  return data.flatMap((row) => {
    // PostgREST returns single-FK joins as objects, SDK types as arrays.
    const player = row.player as unknown as {
      id: string
      name: string
      role: string | null
    } | null

    // Guard against null/invalid joins (e.g., deleted player)
    if (!player || typeof player !== 'object' || !player.id) return []

    return [{
      id: player.id,
      name: player.name,
      teamId: row.team_id,
      role: player.role,
    }]
  })
}

// ---------------------------------------------------------------------------
// getGangLeagueSeason
// ---------------------------------------------------------------------------

/**
 * Info from the gang's active league season entry.
 */
export interface GangLeagueSeasonInfo {
  leagueId: string
  seasonId: string
  predictionDeadlineMins: number
}

/**
 * Fetch the gang's active league season settings.
 *
 * Returns null if no active season exists.
 * Throws on non-recoverable database errors.
 */
export async function getGangLeagueSeason(
  gangId: string,
): Promise<GangLeagueSeasonInfo | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_gang_league_seasons')
    .select('league_id, season_id, prediction_deadline_mins')
    .eq('gang_id', gangId)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!data) return null

  return {
    leagueId: data.league_id,
    seasonId: data.season_id,
    predictionDeadlineMins: data.prediction_deadline_mins ?? 45,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Group scenarios by resolution phase, maintaining phase order.
 *
 * Returns an array of groups with the phase key, label, and scenarios.
 * Empty phases (no scenarios) are omitted.
 */
export function groupScenariosByPhase(
  scenarios: FixtureScenarioRow[],
): { phase: ResolutionPhase; label: string; scenarios: FixtureScenarioRow[] }[] {
  const groups = new Map<ResolutionPhase, FixtureScenarioRow[]>()

  for (const scenario of scenarios) {
    const existing = groups.get(scenario.resolutionPhase)
    if (existing) {
      existing.push(scenario)
    } else {
      groups.set(scenario.resolutionPhase, [scenario])
    }
  }

  return PHASE_ORDER
    .filter((phase) => groups.has(phase))
    .map((phase) => ({
      phase,
      label: PHASE_LABELS[phase],
      scenarios: groups.get(phase)!,
    }))
}

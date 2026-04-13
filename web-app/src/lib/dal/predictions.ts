import { createServerClient } from '@/lib/supabase/server'
import { getMatchLeaderboard } from './leaderboards'
import {
  PHASE_ORDER,
  PHASE_LABELS,
  type MatchPredictionCell,
  type MatchPredictionMember,
  type MatchPredictionPhaseGroup,
  type MatchPredictionPlayer,
  type MatchPredictionScenario,
  type MatchPredictionTeam,
  type MatchPredictionsDataset,
} from './predictions-shared'
import type { ResolutionPhase, ScenarioInputType } from '@/types'
import type { Json } from '@/types/database'

// Re-export client-safe shared exports so existing imports from this module
// keep working (pages / server components still import PHASE_* + matrix
// types from this file).
export { PHASE_ORDER, PHASE_LABELS }
export type {
  MatchPredictionCell,
  MatchPredictionMember,
  MatchPredictionPhaseGroup,
  MatchPredictionPlayer,
  MatchPredictionScenario,
  MatchPredictionTeam,
  MatchPredictionsDataset,
}

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
  inputType: ScenarioInputType
  options: Json | null
  resolutionPhase: ResolutionPhase
  correctAnswer: string | null
  points: number
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
      'id, fixture_id, title, input_type, options, resolution_phase, correct_answer, points, slug',
    )
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('slug', { ascending: true })

  if (error) throw error
  if (!data || data.length === 0) return []

  return data.map((row) => ({
    id: row.id,
    fixtureId: row.fixture_id,
    title: row.title,
    inputType: row.input_type,
    options: row.options,
    resolutionPhase: row.resolution_phase,
    correctAnswer: row.correct_answer,
    points: row.points,
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

// ---------------------------------------------------------------------------
// Match Predictions Matrix (LDB-002)
// ---------------------------------------------------------------------------

/**
 * Fetch all predictions for every member in a gang for a specific fixture,
 * shaped as a matrix-ready dataset for the prediction reveal table.
 *
 * Flow:
 *   1. Reuse `getMatchLeaderboard` for member ordering + profile + status.
 *   2. Fetch all `v2_fixture_scenarios` for this gang + fixture (with points,
 *      input_type, correct_answer, is_resolved, is_voided).
 *   3. Fetch all `v2_predictions` for this gang + fixture (all members).
 *   4. Collect team UUIDs (from `team_select` scenario values + correct answers)
 *      and batch fetch `v2_league_teams` rows for resolution.
 *   5. Collect player UUIDs (from `player_select` values + correct answers)
 *      and batch fetch `v2_players` rows.
 *
 * Returns an empty dataset when there are no members. Throws on DB error.
 *
 * @see docs/stories/LDB-002-prediction-reveal.md
 */
export async function getMatchPredictions(
  gangId: string,
  fixtureId: string,
): Promise<MatchPredictionsDataset> {
  // Step 1: leaderboard-ordered members
  const leaderboardEntries = await getMatchLeaderboard(gangId, fixtureId)

  const members: MatchPredictionMember[] = leaderboardEntries.map((entry) => ({
    userId: entry.userId,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    memberStatus: entry.memberStatus,
    rank: entry.rank,
  }))

  // Early return — no members means nothing to render.
  if (members.length === 0) {
    return {
      members: [],
      phases: [],
      predictionsByScenarioByUser: new Map(),
      teamsById: {},
      playersById: {},
    }
  }

  const supabase = await createServerClient()

  // Step 2: scenarios (use `points`, not `points_weight`)
  const { data: scenarioRows, error: scenariosError } = await supabase
    .from('v2_fixture_scenarios')
    .select(
      'id, title, input_type, points, resolution_phase, correct_answer, is_resolved, is_voided, sort_order',
    )
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('sort_order', { ascending: true })

  if (scenariosError) throw scenariosError

  // Build the scenario list once, tracking the phase alongside each row so
  // we can partition into phase groups without re-mapping.
  const scenariosWithPhase: {
    scenario: MatchPredictionScenario
    phase: ResolutionPhase
  }[] = (scenarioRows ?? []).map((row) => ({
    scenario: {
      id: row.id,
      title: row.title,
      points: row.points,
      inputType: row.input_type,
      correctAnswer: row.correct_answer,
      isResolved: row.is_resolved,
      isVoided: row.is_voided,
    },
    phase: row.resolution_phase as ResolutionPhase,
  }))

  // Flat list retained for downstream UUID collection (correct-answer loop).
  const scenarios: MatchPredictionScenario[] = scenariosWithPhase.map(
    (s) => s.scenario,
  )

  // Build a scenario-id → input-type map for UUID collection
  const scenarioInputTypeById = new Map<string, ScenarioInputType>()
  for (const { scenario } of scenariosWithPhase) {
    scenarioInputTypeById.set(scenario.id, scenario.inputType)
  }

  // Partition scenarios into phase groups (canonical order applied below).
  const phaseGroups = new Map<ResolutionPhase, MatchPredictionScenario[]>()
  for (const { scenario, phase } of scenariosWithPhase) {
    const existing = phaseGroups.get(phase)
    if (existing) existing.push(scenario)
    else phaseGroups.set(phase, [scenario])
  }

  const phases: MatchPredictionPhaseGroup[] = PHASE_ORDER
    .filter((p) => phaseGroups.has(p))
    .map((p) => ({
      phase: p,
      label: PHASE_LABELS[p],
      scenarios: phaseGroups.get(p)!,
    }))

  // Step 3: predictions (all members, all scenarios)
  const { data: predictionRows, error: predictionsError } = await supabase
    .from('v2_predictions')
    .select('user_id, scenario_id, value, is_correct, points_earned')
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)

  if (predictionsError) throw predictionsError

  // Build the O(1) cell lookup: Map<scenarioId, Map<userId, cell>>
  const predictionsByScenarioByUser = new Map<
    string,
    Map<string, MatchPredictionCell>
  >()

  for (const row of predictionRows ?? []) {
    const scenarioMap =
      predictionsByScenarioByUser.get(row.scenario_id) ??
      new Map<string, MatchPredictionCell>()
    scenarioMap.set(row.user_id, {
      value: row.value,
      isCorrect: row.is_correct,
      pointsEarned: row.points_earned,
    })
    predictionsByScenarioByUser.set(row.scenario_id, scenarioMap)
  }

  // Step 4: collect team UUIDs needed for resolution
  const teamIds = new Set<string>()
  const playerIds = new Set<string>()

  for (const row of predictionRows ?? []) {
    const inputType = scenarioInputTypeById.get(row.scenario_id)
    if (!inputType) continue
    if (inputType === 'team_select' && row.value) teamIds.add(row.value)
    if (inputType === 'player_select' && row.value) playerIds.add(row.value)
  }

  // Also resolve correct_answer UUIDs where applicable
  for (const s of scenarios) {
    if (!s.correctAnswer) continue
    if (s.inputType === 'team_select') teamIds.add(s.correctAnswer)
    if (s.inputType === 'player_select') playerIds.add(s.correctAnswer)
  }

  // Step 5a: batch fetch teams
  const teamsById: Record<string, MatchPredictionTeam> = {}
  if (teamIds.size > 0) {
    const { data: teamRows, error: teamsError } = await supabase
      .from('v2_league_teams')
      .select('id, code, name, color')
      .in('id', Array.from(teamIds))

    if (teamsError) throw teamsError

    for (const t of teamRows ?? []) {
      teamsById[t.id] = { code: t.code, name: t.name, color: t.color }
    }
  }

  // Step 5b: batch fetch players
  const playersById: Record<string, MatchPredictionPlayer> = {}
  if (playerIds.size > 0) {
    const { data: playerRows, error: playersError } = await supabase
      .from('v2_players')
      .select('id, name')
      .in('id', Array.from(playerIds))

    if (playersError) throw playersError

    for (const p of playerRows ?? []) {
      playersById[p.id] = { name: p.name }
    }
  }

  return {
    members,
    phases,
    predictionsByScenarioByUser,
    teamsById,
    playersById,
  }
}

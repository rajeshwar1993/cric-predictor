import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchStatus = Database['public']['Enums']['v2_match_status']

export interface PipelineTeam {
  id: string
  code: string
  color: string
}

export interface PipelineFixture {
  id: string
  matchNumber: number
  startDatetime: string
  status: MatchStatus
  statusChangedAt: string
  homeTeam: PipelineTeam
  awayTeam: PipelineTeam
}

export type FixturePipeline = Record<MatchStatus, PipelineFixture[]>

export interface FixtureTableRow {
  id: string
  matchNumber: number
  round: string
  startDatetime: string
  venueName: string
  status: MatchStatus
  statusChangedAt: string
  preMatchSynced: boolean
  homeTeam: PipelineTeam
  awayTeam: PipelineTeam
  scenariosTotal: number
  scenariosResolved: number
  predictionsCount: number
}

export interface FixtureDetailData {
  id: string
  apiId: string
  leagueId: string
  seasonId: string
  matchNumber: number
  round: string
  startDatetime: string
  venueName: string
  venueId: string | null
  status: MatchStatus
  statusChangedAt: string
  preMatchSynced: boolean
  createdAt: string
  homeTeam: { id: string; name: string; code: string; color: string }
  awayTeam: { id: string; name: string; code: string; color: string }
  results: FixtureResultDetail | null
  liveScores: FixtureLiveScoreDetail | null
  scenariosByGang: GangScenarioGroup[]
  predictionsByGang: GangPredictionSummary[]
}

export interface FixtureResultDetail {
  tossWinner: string | null
  matchWinner: string | null
  topScorer: string | null
  topWicketTaker: string | null
  mostSixesPlayer: string | null
  playerOfMatch: string | null
  homeTeamInningsScore: number | null
  awayTeamInningsScore: number | null
  homeTeamPowerplayRuns: number | null
  awayTeamPowerplayRuns: number | null
  homeTeamPowerplayWicketsLost: number | null
  awayTeamPowerplayWicketsLost: number | null
  totalMatchRuns: number | null
  totalMatchSixes: number | null
  totalMatchWickets: number | null
  totalMatchCatches: number | null
  firstWicketOver: number | null
  fiftyScored: boolean | null
  bowlerThreeWickets: boolean | null
  superOver: boolean | null
  resolvedAt: string | null
}

export interface FixtureLiveScoreDetail {
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
  updatedAt: string
}

export interface ScenarioInfo {
  id: string
  slug: string
  title: string
  isResolved: boolean
  isVoided: boolean
  correctAnswer: string | null
  resolutionPhase: string
}

export interface GangScenarioGroup {
  gangId: string
  gangName: string
  scenarios: ScenarioInfo[]
}

export interface GangPredictionSummary {
  gangId: string
  gangName: string
  totalPredictions: number
  distinctUsers: number
  totalMembers: number
}

export type AlertSeverity = 'critical' | 'high' | 'medium'

export interface FixtureAlert {
  severity: AlertSeverity
  description: string
  fixtureId: string
  fixtureLabel: string
}

export interface ActiveSeason {
  id: string
  name: string
  year: number
  leagueId: string
}

// ---------------------------------------------------------------------------
// DAL Functions
// ---------------------------------------------------------------------------

/**
 * Get the currently active season.
 */
export async function getActiveSeason(): Promise<ActiveSeason | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('v2_seasons')
    .select('id, name, year, league_id')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    year: data.year,
    leagueId: data.league_id,
  }
}

/**
 * Fetch fixtures grouped by status for the pipeline view.
 */
export async function getFixturePipeline(
  seasonId: string,
): Promise<FixturePipeline> {
  const supabase = createServiceRoleClient()

  const { data: fixtures, error } = await supabase
    .from('v2_league_season_fixtures')
    .select(
      `
      id,
      match_number,
      start_datetime,
      status,
      status_changed_at,
      home_team_id,
      away_team_id
    `,
    )
    .eq('season_id', seasonId)
    .order('match_number')

  if (error) throw error

  // Collect unique team IDs
  const teamIds = new Set<string>()
  for (const f of fixtures ?? []) {
    teamIds.add(f.home_team_id)
    teamIds.add(f.away_team_id)
  }

  // Fetch team info
  const teamMap = new Map<string, PipelineTeam>()
  if (teamIds.size > 0) {
    const { data: teams } = await supabase
      .from('v2_league_teams')
      .select('id, code, color')
      .in('id', Array.from(teamIds))

    for (const t of teams ?? []) {
      teamMap.set(t.id, { id: t.id, code: t.code, color: t.color })
    }
  }

  const fallbackTeam: PipelineTeam = { id: '', code: '???', color: '#666666' }

  const pipeline: FixturePipeline = {
    upcoming: [],
    live: [],
    completed: [],
    resolved: [],
    abandoned: [],
    no_result: [],
  }

  for (const f of fixtures ?? []) {
    pipeline[f.status].push({
      id: f.id,
      matchNumber: f.match_number,
      startDatetime: f.start_datetime,
      status: f.status,
      statusChangedAt: f.status_changed_at,
      homeTeam: teamMap.get(f.home_team_id) ?? fallbackTeam,
      awayTeam: teamMap.get(f.away_team_id) ?? fallbackTeam,
    })
  }

  return pipeline
}

/**
 * Fetch all fixtures as a table with scenario/prediction counts.
 */
export async function getFixtureTable(
  seasonId: string,
): Promise<FixtureTableRow[]> {
  const supabase = createServiceRoleClient()

  const { data: fixtures, error } = await supabase
    .from('v2_league_season_fixtures')
    .select(
      `
      id,
      match_number,
      round,
      start_datetime,
      venue_name,
      status,
      status_changed_at,
      pre_match_synced,
      home_team_id,
      away_team_id
    `,
    )
    .eq('season_id', seasonId)
    .order('match_number')

  if (error) throw error
  if (!fixtures || fixtures.length === 0) return []

  // Collect team IDs
  const teamIds = new Set<string>()
  for (const f of fixtures) {
    teamIds.add(f.home_team_id)
    teamIds.add(f.away_team_id)
  }

  // Fetch teams, scenarios, predictions in parallel
  const fixtureIds = fixtures.map((f) => f.id)

  const [teamsRes, scenariosRes, predictionsRes] = await Promise.all([
    supabase
      .from('v2_league_teams')
      .select('id, code, color')
      .in('id', Array.from(teamIds)),
    supabase
      .from('v2_fixture_scenarios')
      .select('fixture_id, is_resolved, slug')
      .in('fixture_id', fixtureIds),
    supabase
      .from('v2_predictions')
      .select('fixture_id')
      .in('fixture_id', fixtureIds),
  ])

  const teamMap = new Map<string, PipelineTeam>()
  for (const t of teamsRes.data ?? []) {
    teamMap.set(t.id, { id: t.id, code: t.code, color: t.color })
  }

  // Count unique scenarios per fixture (deduplicated by slug across gangs)
  const scenarioCounts = new Map<
    string,
    { slugs: Set<string>; resolvedSlugs: Set<string> }
  >()
  for (const s of scenariosRes.data ?? []) {
    const current = scenarioCounts.get(s.fixture_id) ?? {
      slugs: new Set<string>(),
      resolvedSlugs: new Set<string>(),
    }
    current.slugs.add(s.slug)
    if (s.is_resolved) current.resolvedSlugs.add(s.slug)
    scenarioCounts.set(s.fixture_id, current)
  }

  // Count predictions per fixture
  const predictionCounts = new Map<string, number>()
  for (const p of predictionsRes.data ?? []) {
    predictionCounts.set(
      p.fixture_id,
      (predictionCounts.get(p.fixture_id) ?? 0) + 1,
    )
  }

  const fallbackTeam: PipelineTeam = { id: '', code: '???', color: '#666666' }

  return fixtures.map((f) => ({
    id: f.id,
    matchNumber: f.match_number,
    round: f.round,
    startDatetime: f.start_datetime,
    venueName: f.venue_name,
    status: f.status,
    statusChangedAt: f.status_changed_at,
    preMatchSynced: f.pre_match_synced,
    homeTeam: teamMap.get(f.home_team_id) ?? fallbackTeam,
    awayTeam: teamMap.get(f.away_team_id) ?? fallbackTeam,
    scenariosTotal: scenarioCounts.get(f.id)?.slugs.size ?? 0,
    scenariosResolved: scenarioCounts.get(f.id)?.resolvedSlugs.size ?? 0,
    predictionsCount: predictionCounts.get(f.id) ?? 0,
  }))
}

/**
 * Fetch detailed data for a single fixture, including results, live scores,
 * scenarios grouped by gang, and prediction summaries.
 */
export async function getFixtureDetail(
  fixtureId: string,
): Promise<FixtureDetailData | null> {
  const supabase = createServiceRoleClient()

  // Fetch fixture
  const { data: fixture, error: fixtureError } = await supabase
    .from('v2_league_season_fixtures')
    .select('*')
    .eq('id', fixtureId)
    .maybeSingle()

  if (fixtureError) throw fixtureError
  if (!fixture) return null

  // Fetch related data in parallel
  const [teamsRes, resultsRes, liveScoresRes, scenariosRes, predictionsRes] =
    await Promise.all([
      supabase
        .from('v2_league_teams')
        .select('id, name, code, color')
        .in('id', [fixture.home_team_id, fixture.away_team_id]),
      supabase
        .from('v2_fixture_results')
        .select('*')
        .eq('fixture_id', fixtureId)
        .maybeSingle(),
      supabase
        .from('v2_fixture_live_scores')
        .select('*')
        .eq('fixture_id', fixtureId)
        .maybeSingle(),
      supabase
        .from('v2_fixture_scenarios')
        .select(
          'id, gang_id, slug, title, is_resolved, is_voided, correct_answer, resolution_phase',
        )
        .eq('fixture_id', fixtureId)
        .order('resolution_phase'),
      supabase
        .from('v2_predictions')
        .select('gang_id, user_id')
        .eq('fixture_id', fixtureId),
    ])

  // Build team map
  const teamMap = new Map<
    string,
    { id: string; name: string; code: string; color: string }
  >()
  for (const t of teamsRes.data ?? []) {
    teamMap.set(t.id, { id: t.id, name: t.name, code: t.code, color: t.color })
  }

  const fallbackTeamFull = {
    id: '',
    name: 'Unknown',
    code: '???',
    color: '#666666',
  }
  const homeTeam = teamMap.get(fixture.home_team_id) ?? fallbackTeamFull
  const awayTeam = teamMap.get(fixture.away_team_id) ?? fallbackTeamFull

  // Resolve player names for results
  let resultDetail: FixtureResultDetail | null = null
  if (resultsRes.data) {
    const r = resultsRes.data
    // Toss/match winner could be team IDs, player IDs are for the rest
    const playerOnlyIds = [
      r.top_scorer_id,
      r.top_wicket_taker_id,
      r.most_sixes_player_id,
      r.player_of_match_id,
    ].filter((id): id is string => id !== null)

    const playerNameMap = new Map<string, string>()
    if (playerOnlyIds.length > 0) {
      const { data: players } = await supabase
        .from('v2_players')
        .select('id, name')
        .in('id', playerOnlyIds)

      for (const p of players ?? []) {
        playerNameMap.set(p.id, p.name)
      }
    }

    // Toss winner and match winner are team IDs
    const resolveName = (
      id: string | null,
      isTeam: boolean,
    ): string | null => {
      if (!id) return null
      if (isTeam) return teamMap.get(id)?.name ?? id
      return playerNameMap.get(id) ?? id
    }

    resultDetail = {
      tossWinner: resolveName(r.toss_winner_id, true),
      matchWinner: resolveName(r.match_winner_id, true),
      topScorer: resolveName(r.top_scorer_id, false),
      topWicketTaker: resolveName(r.top_wicket_taker_id, false),
      mostSixesPlayer: resolveName(r.most_sixes_player_id, false),
      playerOfMatch: resolveName(r.player_of_match_id, false),
      homeTeamInningsScore: r.home_team_innings_score,
      awayTeamInningsScore: r.away_team_innings_score,
      homeTeamPowerplayRuns: r.home_team_powerplay_runs,
      awayTeamPowerplayRuns: r.away_team_powerplay_runs,
      homeTeamPowerplayWicketsLost: r.home_team_powerplay_wickets_lost,
      awayTeamPowerplayWicketsLost: r.away_team_powerplay_wickets_lost,
      totalMatchRuns: r.total_match_runs,
      totalMatchSixes: r.total_match_sixes,
      totalMatchWickets: r.total_match_wickets,
      totalMatchCatches: r.total_match_catches,
      firstWicketOver: r.first_wicket_over,
      fiftyScored: r.fifty_scored,
      bowlerThreeWickets: r.bowler_three_wickets,
      superOver: r.super_over,
      resolvedAt: r.resolved_at,
    }
  }

  // Live scores
  let liveScoreDetail: FixtureLiveScoreDetail | null = null
  if (liveScoresRes.data) {
    const ls = liveScoresRes.data
    liveScoreDetail = {
      homeTeamScore: ls.home_team_score,
      awayTeamScore: ls.away_team_score,
      homeTeamOvers: ls.home_team_overs,
      awayTeamOvers: ls.away_team_overs,
      battingTeamId: ls.batting_team_id,
      currentRunRate: ls.current_run_rate,
      last6Balls: ls.last_6_balls,
      strikerName: ls.striker_name,
      strikerScore: ls.striker_score,
      nonStrikerName: ls.non_striker_name,
      nonStrikerScore: ls.non_striker_score,
      currentBowler: ls.current_bowler,
      currentPartnership: ls.current_partnership,
      lastPolledAt: ls.last_polled_at,
      updatedAt: ls.updated_at,
    }
  }

  // Group scenarios by gang
  const gangIds = new Set<string>()
  for (const s of scenariosRes.data ?? []) {
    gangIds.add(s.gang_id)
  }

  // Fetch gang names
  const gangNameMap = new Map<string, string>()
  if (gangIds.size > 0) {
    const { data: gangs } = await supabase
      .from('v2_gangs')
      .select('id, name')
      .in('id', Array.from(gangIds))

    for (const g of gangs ?? []) {
      gangNameMap.set(g.id, g.name)
    }
  }

  const scenarioGroupMap = new Map<string, ScenarioInfo[]>()
  for (const s of scenariosRes.data ?? []) {
    const list = scenarioGroupMap.get(s.gang_id) ?? []
    list.push({
      id: s.id,
      slug: s.slug,
      title: s.title,
      isResolved: s.is_resolved,
      isVoided: s.is_voided,
      correctAnswer: s.correct_answer,
      resolutionPhase: s.resolution_phase,
    })
    scenarioGroupMap.set(s.gang_id, list)
  }

  const scenariosByGang: GangScenarioGroup[] = Array.from(
    scenarioGroupMap.entries(),
  ).map(([gangId, scenarios]) => ({
    gangId,
    gangName: gangNameMap.get(gangId) ?? gangId,
    scenarios,
  }))

  // Prediction summaries per gang
  const predGangMap = new Map<
    string,
    { users: Set<string>; count: number }
  >()
  for (const p of predictionsRes.data ?? []) {
    const entry = predGangMap.get(p.gang_id) ?? {
      users: new Set<string>(),
      count: 0,
    }
    entry.users.add(p.user_id)
    entry.count += 1
    predGangMap.set(p.gang_id, entry)
  }

  // All gang IDs that appear in either scenarios or predictions
  const allGangIds = new Set([...gangIds, ...predGangMap.keys()])

  // Fetch gang member counts for participation %
  let gangMemberCounts = new Map<string, number>()
  if (allGangIds.size > 0) {
    const { data: members } = await supabase
      .from('v2_gang_members')
      .select('gang_id')
      .in('gang_id', Array.from(allGangIds))
      .eq('status', 'approved')

    const counts = new Map<string, number>()
    for (const m of members ?? []) {
      counts.set(m.gang_id, (counts.get(m.gang_id) ?? 0) + 1)
    }
    gangMemberCounts = counts

    // Also fetch gang names we may not have yet
    for (const gId of allGangIds) {
      if (!gangNameMap.has(gId)) {
        // Already fetched above, but cover edge case
        gangNameMap.set(gId, gId)
      }
    }
  }

  const predictionsByGang: GangPredictionSummary[] = Array.from(
    allGangIds,
  ).map((gangId) => {
    const entry = predGangMap.get(gangId)
    return {
      gangId,
      gangName: gangNameMap.get(gangId) ?? gangId,
      totalPredictions: entry?.count ?? 0,
      distinctUsers: entry?.users.size ?? 0,
      totalMembers: gangMemberCounts.get(gangId) ?? 0,
    }
  })

  return {
    id: fixture.id,
    apiId: fixture.api_id,
    leagueId: fixture.league_id,
    seasonId: fixture.season_id,
    matchNumber: fixture.match_number,
    round: fixture.round,
    startDatetime: fixture.start_datetime,
    venueName: fixture.venue_name,
    venueId: fixture.venue_id,
    status: fixture.status,
    statusChangedAt: fixture.status_changed_at,
    preMatchSynced: fixture.pre_match_synced,
    createdAt: fixture.created_at,
    homeTeam,
    awayTeam,
    results: resultDetail,
    liveScores: liveScoreDetail,
    scenariosByGang,
    predictionsByGang,
  }
}

/**
 * Detect operational alerts for the fixture pipeline.
 */
export async function getFixtureAlerts(
  seasonId: string,
): Promise<FixtureAlert[]> {
  const supabase = createServiceRoleClient()
  const alerts: FixtureAlert[] = []
  const now = Date.now()

  // Fetch all fixtures for the season with status info
  const { data: fixtures, error } = await supabase
    .from('v2_league_season_fixtures')
    .select(
      'id, match_number, status, status_changed_at, start_datetime, pre_match_synced, home_team_id, away_team_id',
    )
    .eq('season_id', seasonId)

  if (error) throw error
  if (!fixtures || fixtures.length === 0) return alerts

  // Collect team IDs for labels
  const teamIds = new Set<string>()
  for (const f of fixtures) {
    teamIds.add(f.home_team_id)
    teamIds.add(f.away_team_id)
  }

  const { data: teams } = await supabase
    .from('v2_league_teams')
    .select('id, code')
    .in('id', Array.from(teamIds))

  const teamCodeMap = new Map<string, string>()
  for (const t of teams ?? []) {
    teamCodeMap.set(t.id, t.code)
  }

  const makeLabel = (f: {
    match_number: number
    home_team_id: string
    away_team_id: string
  }): string => {
    const home = teamCodeMap.get(f.home_team_id) ?? '???'
    const away = teamCodeMap.get(f.away_team_id) ?? '???'
    return `Match #${f.match_number} (${home} vs ${away})`
  }

  // 1. Critical: Stuck in "completed" for > 120 minutes
  for (const f of fixtures) {
    if (f.status === 'completed') {
      const changedAt = new Date(f.status_changed_at).getTime()
      const minutesInStatus = (now - changedAt) / 60_000
      if (minutesInStatus > 120) {
        alerts.push({
          severity: 'critical',
          description: `Stuck in "completed" for ${Math.round(minutesInStatus)} min (> 120 min). Resolution may be blocked.`,
          fixtureId: f.id,
          fixtureLabel: makeLabel(f),
        })
      }
    }
  }

  // 2. High: Live but stale data (last_polled_at > 2 min)
  const liveFixtures = fixtures.filter((f) => f.status === 'live')
  if (liveFixtures.length > 0) {
    const liveIds = liveFixtures.map((f) => f.id)
    const { data: liveScores } = await supabase
      .from('v2_fixture_live_scores')
      .select('fixture_id, last_polled_at')
      .in('fixture_id', liveIds)

    const scoreMap = new Map<string, string | null>()
    for (const s of liveScores ?? []) {
      scoreMap.set(s.fixture_id, s.last_polled_at)
    }

    for (const f of liveFixtures) {
      const lastPolled = scoreMap.get(f.id)
      if (!lastPolled) {
        alerts.push({
          severity: 'high',
          description:
            'Live match with no live score data. Polling may not be running.',
          fixtureId: f.id,
          fixtureLabel: makeLabel(f),
        })
      } else {
        const polledAt = new Date(lastPolled).getTime()
        const minutesAgo = (now - polledAt) / 60_000
        if (minutesAgo > 2) {
          alerts.push({
            severity: 'high',
            description: `Live match with stale data (last polled ${Math.round(minutesAgo)} min ago).`,
            fixtureId: f.id,
            fixtureLabel: makeLabel(f),
          })
        }
      }
    }
  }

  // 3. High: Upcoming within 14h with no scenarios seeded for some gangs
  const upcomingFixtures = fixtures.filter((f) => f.status === 'upcoming')
  const soonFixtures = upcomingFixtures.filter((f) => {
    const startTime = new Date(f.start_datetime).getTime()
    const hoursUntil = (startTime - now) / 3_600_000
    return hoursUntil <= 14 && hoursUntil > 0
  })

  if (soonFixtures.length > 0) {
    const soonIds = soonFixtures.map((f) => f.id)

    // Check which fixtures have scenarios
    const { data: scenarios } = await supabase
      .from('v2_fixture_scenarios')
      .select('fixture_id, gang_id')
      .in('fixture_id', soonIds)

    const fixtureScenarioGangs = new Map<string, Set<string>>()
    for (const s of scenarios ?? []) {
      const gangs = fixtureScenarioGangs.get(s.fixture_id) ?? new Set<string>()
      gangs.add(s.gang_id)
      fixtureScenarioGangs.set(s.fixture_id, gangs)
    }

    // Check active gangs for the season
    const { data: gangSeasons } = await supabase
      .from('v2_gang_league_seasons')
      .select('gang_id')
      .eq('season_id', seasonId)
      .eq('is_active', true)

    const activeGangIds = new Set(
      (gangSeasons ?? []).map((gs) => gs.gang_id),
    )

    for (const f of soonFixtures) {
      const seededGangs = fixtureScenarioGangs.get(f.id) ?? new Set<string>()
      const unseededCount = Array.from(activeGangIds).filter(
        (gId) => !seededGangs.has(gId),
      ).length

      if (unseededCount > 0) {
        const hoursUntil = Math.round(
          (new Date(f.start_datetime).getTime() - now) / 3_600_000,
        )
        alerts.push({
          severity: 'high',
          description: `Starts in ~${hoursUntil}h but ${unseededCount} gang${unseededCount === 1 ? '' : 's'} have no scenarios seeded.`,
          fixtureId: f.id,
          fixtureLabel: makeLabel(f),
        })
      }
    }
  }

  // 4. Medium: pre_match_synced = false, starting within 30 min
  for (const f of upcomingFixtures) {
    if (!f.pre_match_synced) {
      const startTime = new Date(f.start_datetime).getTime()
      const minutesUntil = (startTime - now) / 60_000
      if (minutesUntil <= 30 && minutesUntil > 0) {
        alerts.push({
          severity: 'medium',
          description: `Starting in ~${Math.round(minutesUntil)} min but pre-match data not synced.`,
          fixtureId: f.id,
          fixtureLabel: makeLabel(f),
        })
      }
    }
  }

  // Sort by severity: critical first, then high, then medium
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  }
  alerts.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  )

  return alerts
}

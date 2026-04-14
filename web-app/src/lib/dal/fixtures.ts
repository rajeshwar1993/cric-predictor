import { createServerClient } from '@/lib/supabase/server'
import type { MatchStatus } from '@/types'

// Statuses that indicate a match has ended
const COMPLETED_STATUSES: MatchStatus[] = ['completed', 'resolved', 'abandoned', 'no_result']

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/**
 * Team info as returned by fixture queries.
 */
export interface FixtureTeam {
  id: string
  name: string
  code: string
  color: string
  logoUrl: string | null
}

/**
 * Fixture with joined team data, used for match cards.
 */
export interface FixtureWithTeams {
  id: string
  leagueId: string
  seasonId: string
  matchNumber: number
  startDatetime: string
  venueName: string
  status: MatchStatus
  homeTeam: FixtureTeam
  awayTeam: FixtureTeam
}

/**
 * Upcoming fixture with prediction metadata, used by the gang page.
 */
export interface UpcomingFixture extends FixtureWithTeams {
  /** Minutes before match start when predictions lock (from gang settings) */
  predictionDeadlineMins: number
  /** Count of gang members who have submitted predictions for this fixture */
  predictedCount: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Maps raw PostgREST team row to our clean FixtureTeam interface.
 */
function mapTeam(raw: {
  id: string
  name: string
  code: string
  color: string
  logo_url: string | null
}): FixtureTeam {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    color: raw.color,
    logoUrl: raw.logo_url,
  }
}

// ---------------------------------------------------------------------------
// getUpcomingFixtures
// ---------------------------------------------------------------------------

/**
 * Fetch the next N upcoming fixtures for a gang.
 *
 * Joins home/away team info, fetches the gang's prediction deadline setting,
 * and queries how many members have predicted for each fixture.
 *
 * Creates its own Supabase server client (DAL convention).
 * Returns empty array if no active league season or no fixtures.
 * Throws on non-recoverable database errors.
 */
export async function getUpcomingFixtures(
  gangId: string,
  limit: number = 3,
): Promise<UpcomingFixture[]> {
  const supabase = await createServerClient()

  // Step 1: Get gang's active league season settings (for prediction_deadline_mins)
  const { data: gangSeason, error: gangSeasonError } = await supabase
    .from('v2_gang_league_seasons')
    .select('prediction_deadline_mins, league_id, season_id')
    .eq('gang_id', gangId)
    .eq('is_active', true)
    .single()

  if (gangSeasonError) {
    // No active league season — nothing to show
    if (gangSeasonError.code === 'PGRST116') return []
    throw gangSeasonError
  }

  if (!gangSeason) return []

  const predictionDeadlineMins = gangSeason.prediction_deadline_mins ?? 45

  // Step 2: Fetch upcoming fixtures sorted by start_datetime
  const { data: fixtures, error: fixturesError } = await supabase
    .from('v2_league_season_fixtures')
    .select(
      `
      id,
      match_number,
      start_datetime,
      venue_name,
      status,
      home_team:v2_league_teams!home_team_id (id, name, code, color, logo_url),
      away_team:v2_league_teams!away_team_id (id, name, code, color, logo_url)
    `,
    )
    .eq('league_id', gangSeason.league_id)
    .eq('season_id', gangSeason.season_id)
    .in('status', ['upcoming'])
    .order('start_datetime', { ascending: true })
    .limit(limit)

  if (fixturesError) throw fixturesError
  if (!fixtures || fixtures.length === 0) return []

  // Step 3: Batch-fetch prediction counts for all fixtures in a single query
  const fixtureIds = fixtures.map((f) => f.id)
  const { data: predictions } = await supabase
    .from('v2_predictions')
    .select('fixture_id, user_id')
    .in('fixture_id', fixtureIds)
    .eq('gang_id', gangId)

  // Build a map of fixture_id → count of distinct users who predicted
  const predictionCountMap = new Map<string, number>()
  if (predictions) {
    // Use a Set per fixture to count distinct users
    const userSets = new Map<string, Set<string>>()
    for (const row of predictions) {
      let userSet = userSets.get(row.fixture_id)
      if (!userSet) {
        userSet = new Set<string>()
        userSets.set(row.fixture_id, userSet)
      }
      userSet.add(row.user_id)
    }
    for (const [fixtureId, userSet] of userSets) {
      predictionCountMap.set(fixtureId, userSet.size)
    }
  }

  // Step 4: Map fixture rows to clean UpcomingFixture interface
  return fixtures.map((row) => {
    // PostgREST returns joined rows as objects for single-FK relations.
    // The SDK types them as arrays — double-cast needed.
    const homeTeam = row.home_team as unknown as {
      id: string
      name: string
      code: string
      color: string
      logo_url: string | null
    }
    const awayTeam = row.away_team as unknown as {
      id: string
      name: string
      code: string
      color: string
      logo_url: string | null
    }

    return {
      id: row.id,
      leagueId: gangSeason.league_id,
      seasonId: gangSeason.season_id,
      matchNumber: row.match_number,
      startDatetime: row.start_datetime,
      venueName: row.venue_name,
      status: row.status,
      predictionDeadlineMins: predictionDeadlineMins,
      predictedCount: predictionCountMap.get(row.id) ?? 0,
      homeTeam: mapTeam(homeTeam),
      awayTeam: mapTeam(awayTeam),
    }
  })
}

// ---------------------------------------------------------------------------
// LiveFixture type
// ---------------------------------------------------------------------------

/**
 * Live fixture with joined team data, used by the LiveMatchesSection.
 */
export interface LiveFixture extends FixtureWithTeams {
  /** The fixture status is always 'live' for these fixtures */
  status: 'live'
}

// ---------------------------------------------------------------------------
// getLiveFixtures
// ---------------------------------------------------------------------------

/**
 * Fetch all live fixtures for a gang's active league season.
 *
 * Returns fixtures where status='live' with home/away team joins.
 * Used by the gang page server component to provide initial data
 * to the LiveMatchesSection client component.
 *
 * Creates its own Supabase server client (DAL convention).
 * Returns empty array if no active league season or no live fixtures.
 * Throws on non-recoverable database errors.
 */
export async function getLiveFixtures(gangId: string): Promise<LiveFixture[]> {
  const supabase = await createServerClient()

  // Step 1: Get gang's active league season
  const { data: gangSeason, error: gangSeasonError } = await supabase
    .from('v2_gang_league_seasons')
    .select('league_id, season_id')
    .eq('gang_id', gangId)
    .eq('is_active', true)
    .single()

  if (gangSeasonError) {
    // No active league season — nothing to show
    if (gangSeasonError.code === 'PGRST116') return []
    throw gangSeasonError
  }

  if (!gangSeason) return []

  // Step 2: Fetch live fixtures sorted by start_datetime
  const { data: fixtures, error: fixturesError } = await supabase
    .from('v2_league_season_fixtures')
    .select(
      `
      id,
      match_number,
      start_datetime,
      venue_name,
      status,
      home_team:v2_league_teams!home_team_id (id, name, code, color, logo_url),
      away_team:v2_league_teams!away_team_id (id, name, code, color, logo_url)
    `,
    )
    .eq('league_id', gangSeason.league_id)
    .eq('season_id', gangSeason.season_id)
    .eq('status', 'live')
    .order('start_datetime', { ascending: true })

  if (fixturesError) throw fixturesError
  if (!fixtures || fixtures.length === 0) return []

  return fixtures.map((row) => {
    const homeTeam = row.home_team as unknown as {
      id: string
      name: string
      code: string
      color: string
      logo_url: string | null
    }
    const awayTeam = row.away_team as unknown as {
      id: string
      name: string
      code: string
      color: string
      logo_url: string | null
    }

    return {
      id: row.id,
      leagueId: gangSeason.league_id,
      seasonId: gangSeason.season_id,
      matchNumber: row.match_number,
      startDatetime: row.start_datetime,
      venueName: row.venue_name,
      status: 'live' as const,
      homeTeam: mapTeam(homeTeam),
      awayTeam: mapTeam(awayTeam),
    }
  })
}

// ---------------------------------------------------------------------------
// getFixtureWithTeams
// ---------------------------------------------------------------------------

/**
 * Fetch a single fixture with home/away team details.
 *
 * Returns `null` if the fixture is not found.
 *
 * Creates its own Supabase server client (DAL convention).
 * Throws on non-recoverable database errors.
 */
export async function getFixtureWithTeams(
  fixtureId: string,
): Promise<FixtureWithTeams | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('v2_league_season_fixtures')
    .select(
      `
      id,
      league_id,
      season_id,
      match_number,
      start_datetime,
      venue_name,
      status,
      home_team:v2_league_teams!home_team_id (id, name, code, color, logo_url),
      away_team:v2_league_teams!away_team_id (id, name, code, color, logo_url)
    `,
    )
    .eq('id', fixtureId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!data) return null

  const homeTeam = data.home_team as unknown as {
    id: string
    name: string
    code: string
    color: string
    logo_url: string | null
  }
  const awayTeam = data.away_team as unknown as {
    id: string
    name: string
    code: string
    color: string
    logo_url: string | null
  }

  return {
    id: data.id,
    leagueId: data.league_id,
    seasonId: data.season_id,
    matchNumber: data.match_number,
    startDatetime: data.start_datetime,
    venueName: data.venue_name,
    status: data.status,
    homeTeam: mapTeam(homeTeam),
    awayTeam: mapTeam(awayTeam),
  }
}

// ---------------------------------------------------------------------------
// RecentResult types
// ---------------------------------------------------------------------------

/**
 * User's prediction standing for a fixture.
 */
export interface FixtureUserStanding {
  predictedCount: number
  correctCount: number
  resolvedCount: number
  pointsEarned: number
}

/**
 * A completed fixture with result info and user's standing.
 */
export interface RecentResultFixture extends FixtureWithTeams {
  /** The winning team's ID, or null if no winner (tie/no_result/abandoned) */
  matchWinnerId: string | null
  /** Home team final score string from live_scores (e.g. "186/4") */
  homeTeamScore: string | null
  /** Away team final score string from live_scores (e.g. "183/8") */
  awayTeamScore: string | null
  /** The user's prediction standing for this fixture, or null if they didn't predict */
  userStanding: FixtureUserStanding | null
}

// ---------------------------------------------------------------------------
// getRecentResults
// ---------------------------------------------------------------------------

/**
 * Fetch the last N completed/resolved/abandoned/no_result fixtures for a gang,
 * with user's prediction standings.
 *
 * Returns fixtures newest first with match winner, final scores, and the
 * current user's prediction summary (correct count, points earned, etc.).
 *
 * Creates its own Supabase server client (DAL convention).
 * Returns empty array if no active league season or no completed fixtures.
 * Throws on non-recoverable database errors.
 */
export async function getRecentResults(
  gangId: string,
  userId: string,
  limit: number = 3,
): Promise<RecentResultFixture[]> {
  const supabase = await createServerClient()

  // Step 1: Get gang's active league season
  const { data: gangSeason, error: gangSeasonError } = await supabase
    .from('v2_gang_league_seasons')
    .select('league_id, season_id')
    .eq('gang_id', gangId)
    .eq('is_active', true)
    .single()

  if (gangSeasonError) {
    if (gangSeasonError.code === 'PGRST116') return []
    throw gangSeasonError
  }

  if (!gangSeason) return []

  // Step 2: Fetch recent completed fixtures with results and live scores
  const { data: fixtures, error: fixturesError } = await supabase
    .from('v2_league_season_fixtures')
    .select(
      `
      id,
      match_number,
      start_datetime,
      venue_name,
      status,
      home_team:v2_league_teams!home_team_id (id, name, code, color, logo_url),
      away_team:v2_league_teams!away_team_id (id, name, code, color, logo_url),
      v2_fixture_results (match_winner_id),
      v2_fixture_live_scores (home_team_score, away_team_score)
    `,
    )
    .eq('league_id', gangSeason.league_id)
    .eq('season_id', gangSeason.season_id)
    .in('status', COMPLETED_STATUSES)
    .order('start_datetime', { ascending: false })
    .limit(limit)

  if (fixturesError) throw fixturesError
  if (!fixtures || fixtures.length === 0) return []

  // Step 3: Get user's standings for these fixtures
  const fixtureIds = fixtures.map((f) => f.id)
  const { data: standings, error: standingsError } = await supabase
    .from('v2_gang_fixture_standings')
    .select('fixture_id, predicted_count, correct_count, resolved_count, points_earned')
    .eq('gang_id', gangId)
    .eq('user_id', userId)
    .in('fixture_id', fixtureIds)

  if (standingsError) throw standingsError

  // Build a lookup map for standings
  const standingsMap = new Map(
    (standings ?? []).map((s) => [
      s.fixture_id,
      {
        predictedCount: s.predicted_count,
        correctCount: s.correct_count,
        resolvedCount: s.resolved_count,
        pointsEarned: s.points_earned,
      },
    ]),
  )

  // Step 4: Map fixtures to clean RecentResultFixture interface
  return fixtures.map((row) => {
    const homeTeam = row.home_team as unknown as {
      id: string
      name: string
      code: string
      color: string
      logo_url: string | null
    }
    const awayTeam = row.away_team as unknown as {
      id: string
      name: string
      code: string
      color: string
      logo_url: string | null
    }

    // PostgREST returns one-to-one as an object (or null), but types say array
    const result = row.v2_fixture_results as unknown as {
      match_winner_id: string | null
    } | null

    const liveScores = row.v2_fixture_live_scores as unknown as {
      home_team_score: string | null
      away_team_score: string | null
    } | null

    return {
      id: row.id,
      leagueId: gangSeason.league_id,
      seasonId: gangSeason.season_id,
      matchNumber: row.match_number,
      startDatetime: row.start_datetime,
      venueName: row.venue_name,
      status: row.status,
      homeTeam: mapTeam(homeTeam),
      awayTeam: mapTeam(awayTeam),
      matchWinnerId: result?.match_winner_id ?? null,
      homeTeamScore: liveScores?.home_team_score ?? null,
      awayTeamScore: liveScores?.away_team_score ?? null,
      userStanding: standingsMap.get(row.id) ?? null,
    }
  })
}

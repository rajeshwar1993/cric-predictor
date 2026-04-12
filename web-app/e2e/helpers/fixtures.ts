/**
 * Test fixture helpers for E2E tests.
 *
 * Seeds, updates, and cleans up test fixtures and scenarios in the
 * staging Supabase database via the service role client.
 */
import { getSupabaseAdmin } from './supabase-admin'

/** Unique api_id prefix to avoid collision with real Sportmonks data */
const E2E_FIXTURE_PREFIX = 'e2e-fixture'

export interface SeedFixtureOptions {
  fixtureKey: string // e.g. '001', '002'
  leagueId: string
  seasonId: string
  homeTeamId: string
  awayTeamId: string
  startDatetime: string // ISO 8601
  status?: 'upcoming' | 'live' | 'completed' | 'resolved'
  matchNumber?: number
  venueName?: string
  round?: string
}

/**
 * Seeds (or upserts) a test fixture in the staging database.
 * Uses api_id with `e2e-fixture-` prefix for idempotent creation.
 * Returns the fixture UUID.
 */
export async function seedTestFixture(opts: SeedFixtureOptions): Promise<string> {
  const admin = getSupabaseAdmin()
  const apiId = `${E2E_FIXTURE_PREFIX}-${opts.fixtureKey}`

  const { data, error } = await admin
    .from('v2_league_season_fixtures')
    .upsert(
      {
        api_id: apiId,
        league_id: opts.leagueId,
        season_id: opts.seasonId,
        home_team_id: opts.homeTeamId,
        away_team_id: opts.awayTeamId,
        start_datetime: opts.startDatetime,
        status: opts.status ?? 'upcoming',
        match_number: opts.matchNumber ?? 999,
        venue_name: opts.venueName ?? 'E2E Test Venue',
        round: opts.round ?? 'E2E Test Round',
      },
      { onConflict: 'api_id' }
    )
    .select('id')
    .single()

  if (error) throw new Error(`Failed to seed fixture ${apiId}: ${error.message}`)
  return data.id
}

/**
 * Seeds scenarios for a (gang, fixture) pair via the Postgres RPC.
 * Idempotent — runs ON CONFLICT DO NOTHING internally.
 */
export async function seedFixtureScenarios(gangId: string, fixtureId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc('seed_fixture_scenarios_for_gang', {
    p_gang_id: gangId,
    p_fixture_id: fixtureId,
  })
  if (error) throw new Error(`Failed to seed scenarios for gang=${gangId}, fixture=${fixtureId}: ${error.message}`)
}

/**
 * Updates a fixture's status (e.g. upcoming → live → completed → resolved).
 */
export async function setFixtureStatus(
  fixtureId: string,
  status: 'upcoming' | 'live' | 'completed' | 'resolved'
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('v2_league_season_fixtures')
    .update({ status })
    .eq('id', fixtureId)
  if (error) throw new Error(`Failed to update fixture ${fixtureId} status to ${status}: ${error.message}`)
}

/**
 * Updates a fixture's start_datetime (to control prediction deadline behaviour).
 */
export async function setFixtureStartTime(fixtureId: string, startDatetime: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('v2_league_season_fixtures')
    .update({ start_datetime: startDatetime })
    .eq('id', fixtureId)
  if (error) throw new Error(`Failed to update fixture ${fixtureId} start time: ${error.message}`)
}

/**
 * Resolves a single scenario via the Postgres RPC.
 * Sets `correct_answer`, marks `is_resolved=true`, and updates all
 * predictions with `is_correct` and `points_earned`.
 * Standings triggers fire automatically.
 */
export async function resolveScenario(scenarioId: string, correctAnswer: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc('resolve_scenario', {
    p_scenario_id: scenarioId,
    p_correct_answer: correctAnswer,
  })
  if (error) throw new Error(`Failed to resolve scenario ${scenarioId}: ${error.message}`)
}

/**
 * Marks a fixture as fully resolved via the Postgres RPC.
 */
export async function markFixtureResolved(fixtureId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc('mark_fixture_resolved', {
    p_fixture_id: fixtureId,
  })
  if (error) throw new Error(`Failed to mark fixture ${fixtureId} resolved: ${error.message}`)
}

/**
 * Fetches all scenarios for a (gang, fixture) pair.
 * Used for assertions and for resolving scenarios with known correct answers.
 */
export async function getFixtureScenarios(
  gangId: string,
  fixtureId: string
): Promise<
  Array<{
    id: string
    slug: string
    title: string
    input_type: string
    points: number
    options: unknown
    sort_order: number
  }>
> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('v2_fixture_scenarios')
    .select('id, slug, title, input_type, points, options, sort_order')
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('sort_order')
  if (error) throw new Error(`Failed to fetch scenarios: ${error.message}`)
  return data
}

/**
 * Cleans up all E2E test fixtures and their associated data.
 * Identified by the `e2e-fixture-` prefix on api_id.
 */
export async function cleanupTestFixtures(): Promise<void> {
  const admin = getSupabaseAdmin()

  // Find all e2e fixtures
  const { data: fixtures } = await admin
    .from('v2_league_season_fixtures')
    .select('id')
    .like('api_id', `${E2E_FIXTURE_PREFIX}%`)

  if (!fixtures?.length) return

  const fixtureIds = fixtures.map((f) => f.id)

  // Delete in dependency order:
  // predictions → fixture_scenarios → fixture_results → fixture_standings → fixtures

  // 1. Delete predictions for scenarios in these fixtures
  const { data: scenarios } = await admin
    .from('v2_fixture_scenarios')
    .select('id')
    .in('fixture_id', fixtureIds)

  if (scenarios?.length) {
    const scenarioIds = scenarios.map((s) => s.id)
    await admin.from('v2_predictions').delete().in('scenario_id', scenarioIds)
  }

  // 2. Delete scenarios
  await admin.from('v2_fixture_scenarios').delete().in('fixture_id', fixtureIds)

  // 3. Delete fixture results
  await admin.from('v2_fixture_results').delete().in('fixture_id', fixtureIds)

  // 4. Delete fixture standings
  await admin.from('v2_gang_fixture_standings').delete().in('fixture_id', fixtureIds)

  // 5. Delete the fixtures themselves
  await admin.from('v2_league_season_fixtures').delete().like('api_id', `${E2E_FIXTURE_PREFIX}%`)
}

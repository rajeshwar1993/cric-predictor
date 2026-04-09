import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockRateLimit = vi.fn()
const mockTrackEvent = vi.fn()
const mockRevalidatePath = vi.fn()
const mockFrom = vi.fn()

/**
 * Chainable query builder mock. Each method returns the chain, and terminal
 * methods (single, maybeSingle) resolve with the provided value.
 */
function createQueryChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn().mockImplementation(handler)
  chain.insert = vi.fn().mockImplementation(handler)
  chain.upsert = vi.fn().mockImplementation(handler)
  chain.update = vi.fn().mockImplementation(handler)
  chain.delete = vi.fn().mockImplementation(handler)
  chain.eq = vi.fn().mockImplementation(handler)
  chain.neq = vi.fn().mockImplementation(handler)
  chain.in = vi.fn().mockImplementation(handler)
  chain.limit = vi.fn().mockImplementation(handler)
  chain.single = vi.fn().mockImplementation(() => resolvedValue)
  chain.maybeSingle = vi.fn().mockImplementation(() => resolvedValue)
  // For terminal calls that don't use single/maybeSingle (like upsert)
  chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => void) => {
    resolve(resolvedValue)
  })
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/analytics/server', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// Import after mocks are set up
const { submitPredictions } = await import('./predictions')

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const MOCK_USER = { id: 'user-123' }
const MOCK_GANG_ID = '11111111-1111-4111-a111-111111111111'
const MOCK_FIXTURE_ID = '22222222-2222-4222-a222-222222222222'
const MOCK_SCENARIO_ID = '33333333-3333-4333-a333-333333333333'
const MOCK_HOME_TEAM_ID = '44444444-4444-4444-a444-444444444444'
const MOCK_AWAY_TEAM_ID = '55555555-5555-4555-a555-555555555555'

// Future fixture: 6 hours from now (within 12h window)
const MOCK_START_DATETIME = new Date(
  Date.now() + 6 * 60 * 60 * 1000,
).toISOString()

const MOCK_FIXTURE = {
  id: MOCK_FIXTURE_ID,
  status: 'upcoming',
  start_datetime: MOCK_START_DATETIME,
  home_team_id: MOCK_HOME_TEAM_ID,
  away_team_id: MOCK_AWAY_TEAM_ID,
  league_id: 'league-1',
  season_id: 'season-1',
}

const MOCK_GANG_SEASON = {
  league_id: 'league-1',
  season_id: 'season-1',
  prediction_deadline_mins: 45,
}

const MOCK_YES_NO_SCENARIO_ID = '33333333-3333-4333-a333-333333333334'
const MOCK_RANGE_SCENARIO_ID = '33333333-3333-4333-a333-333333333335'

const MOCK_SCENARIOS = [
  { id: MOCK_SCENARIO_ID, input_type: 'team_select', options: null },
  {
    id: MOCK_YES_NO_SCENARIO_ID,
    input_type: 'yes_no',
    options: null,
  },
  {
    id: MOCK_RANGE_SCENARIO_ID,
    input_type: 'number_range',
    options: ['<30', '30-39', '40-49', '50+'],
  },
]

const VALID_PICKS = [
  { scenarioId: MOCK_SCENARIO_ID, value: MOCK_HOME_TEAM_ID },
]

// ---------------------------------------------------------------------------
// Helper to set up mock chain for .from() calls
// ---------------------------------------------------------------------------

type FromCallMap = Record<string, ReturnType<typeof createQueryChain>>

/**
 * Configure mockFrom so that each .from(tableName) returns the specified chain.
 */
function setupFromMock(tableChains: FromCallMap) {
  mockFrom.mockImplementation((tableName: string) => {
    const chain = tableChains[tableName]
    if (chain) return chain
    // Default: return empty data
    return createQueryChain({ data: null, error: null })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('submitPredictions server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 59 })
  })

  // ---- Auth checks ----

  test('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ---- Rate limiting ----

  test('returns error when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({
      success: false,
      error: 'Too many requests. Try again later.',
    })
    expect(mockRateLimit).toHaveBeenCalledWith('user-123', 'submit_predictions', {
      max: 60,
      windowSeconds: 3600,
    })
  })

  // ---- Zod validation ----

  test('returns error for invalid gangId', async () => {
    const result = await submitPredictions('not-a-uuid', MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result.success).toBe(false)
  })

  test('returns error for invalid fixtureId', async () => {
    const result = await submitPredictions(MOCK_GANG_ID, 'not-a-uuid', VALID_PICKS)

    expect(result.success).toBe(false)
  })

  test('returns error for empty picks array', async () => {
    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, [])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('At least 1 pick')
    }
  })

  test('returns error for pick with invalid scenarioId', async () => {
    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, [
      { scenarioId: 'not-a-uuid', value: 'some-value' },
    ])

    expect(result.success).toBe(false)
  })

  test('returns error for pick with empty value', async () => {
    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, [
      { scenarioId: MOCK_SCENARIO_ID, value: '' },
    ])

    expect(result.success).toBe(false)
  })

  // ---- Membership check ----

  test('returns error when user is not a member of the gang', async () => {
    setupFromMock({
      v2_gang_members: createQueryChain({ data: null, error: null }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({
      success: false,
      error: 'You are not a member of this gang',
    })
  })

  // ---- Fixture validation ----

  test('returns error when fixture not found', async () => {
    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({ success: false, error: 'Fixture not found' })
  })

  test('returns error when fixture is not upcoming', async () => {
    const liveFixture = { ...MOCK_FIXTURE, status: 'live' }
    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: liveFixture,
        error: null,
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({
      success: false,
      error: 'Predictions are locked for this match',
    })
  })

  // ---- Prediction window checks ----

  test('returns error when prediction deadline has passed', async () => {
    // Fixture starts 30 minutes from now, deadline is 45 minutes before → already passed
    const soonFixture = {
      ...MOCK_FIXTURE,
      start_datetime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }

    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: soonFixture,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: MOCK_GANG_SEASON,
        error: null,
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({
      success: false,
      error: 'Prediction deadline has passed',
    })
  })

  test('returns error when prediction window is not open yet', async () => {
    // Fixture starts 24 hours from now → window opens 12h before = too early
    const farFixture = {
      ...MOCK_FIXTURE,
      start_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: farFixture,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: MOCK_GANG_SEASON,
        error: null,
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({
      success: false,
      error: 'Prediction window is not open yet',
    })
  })

  // ---- Scenario validation ----

  test('returns error when scenario does not belong to fixture', async () => {
    const unknownScenarioId = '99999999-9999-4999-a999-999999999999'

    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: MOCK_FIXTURE,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: MOCK_GANG_SEASON,
        error: null,
      }),
      v2_fixture_scenarios: createQueryChain({
        data: MOCK_SCENARIOS,
        error: null,
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, [
      { scenarioId: unknownScenarioId, value: MOCK_HOME_TEAM_ID },
    ])

    expect(result).toEqual({ success: false, error: 'Invalid scenario' })
  })

  // ---- Pick value validation ----

  test('returns error for invalid team_select value', async () => {
    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: MOCK_FIXTURE,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: MOCK_GANG_SEASON,
        error: null,
      }),
      v2_fixture_scenarios: createQueryChain({
        data: MOCK_SCENARIOS,
        error: null,
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, [
      { scenarioId: MOCK_SCENARIO_ID, value: 'invalid-team-id' },
    ])

    expect(result).toEqual({ success: false, error: 'Invalid team selection' })
  })

  test('returns error for invalid yes_no value', async () => {
    const yesNoScenarioId = MOCK_YES_NO_SCENARIO_ID

    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: MOCK_FIXTURE,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: MOCK_GANG_SEASON,
        error: null,
      }),
      v2_fixture_scenarios: createQueryChain({
        data: MOCK_SCENARIOS,
        error: null,
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, [
      { scenarioId: yesNoScenarioId, value: 'Maybe' },
    ])

    expect(result).toEqual({ success: false, error: 'Must be Yes or No' })
  })

  test('returns error for invalid number_range value', async () => {
    const rangeScenarioId = MOCK_RANGE_SCENARIO_ID

    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: MOCK_FIXTURE,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: MOCK_GANG_SEASON,
        error: null,
      }),
      v2_fixture_scenarios: createQueryChain({
        data: MOCK_SCENARIOS,
        error: null,
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, [
      { scenarioId: rangeScenarioId, value: '100-200' },
    ])

    expect(result).toEqual({ success: false, error: 'Invalid range selection' })
  })

  // ---- Successful submission ----

  test('successfully submits predictions and returns success', async () => {
    const upsertChain = createQueryChain({ data: null, error: null })

    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: MOCK_FIXTURE,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: MOCK_GANG_SEASON,
        error: null,
      }),
      v2_fixture_scenarios: createQueryChain({
        data: MOCK_SCENARIOS,
        error: null,
      }),
      v2_predictions: upsertChain,
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({ success: true })

    // Verify analytics event was fired
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-123',
      'prediction_submitted',
      expect.objectContaining({
        gang_id: MOCK_GANG_ID,
        fixture_id: MOCK_FIXTURE_ID,
        pick_count: 1,
      }),
    )

    // Verify revalidation
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/group/${MOCK_GANG_ID}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/group/${MOCK_GANG_ID}/predict/${MOCK_FIXTURE_ID}`,
    )
  })

  // ---- Upsert error ----

  test('returns error when upsert fails', async () => {
    const failingUpsertChain = createQueryChain({
      data: null,
      error: { message: 'db error' },
    })

    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: MOCK_FIXTURE,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: MOCK_GANG_SEASON,
        error: null,
      }),
      v2_fixture_scenarios: createQueryChain({
        data: MOCK_SCENARIOS,
        error: null,
      }),
      v2_predictions: failingUpsertChain,
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({
      success: false,
      error: 'Failed to save predictions. Please try again.',
    })
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  // ---- Gang season validation ----

  test('returns error when fixture does not belong to gang season', async () => {
    const differentSeason = {
      ...MOCK_GANG_SEASON,
      league_id: 'other-league',
    }

    setupFromMock({
      v2_gang_members: createQueryChain({
        data: { status: 'approved' },
        error: null,
      }),
      v2_league_season_fixtures: createQueryChain({
        data: MOCK_FIXTURE,
        error: null,
      }),
      v2_gang_league_seasons: createQueryChain({
        data: differentSeason,
        error: null,
      }),
    })

    const result = await submitPredictions(MOCK_GANG_ID, MOCK_FIXTURE_ID, VALID_PICKS)

    expect(result).toEqual({ success: false, error: 'Fixture not found' })
  })
})

import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — chain-style to simulate Supabase PostgREST builder
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()
const mockRpc = vi.fn()

/**
 * Build a chainable mock that records every method call and resolves to
 * `resolvedValue` at the end of the chain.
 */
function chainBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const chain = {
    select(...args: unknown[]) {
      mockSelect(...args)
      return chain
    },
    eq(...args: unknown[]) {
      mockEq(...args)
      return chain
    },
    in(...args: unknown[]) {
      mockIn(...args)
      return chain
    },
    order(...args: unknown[]) {
      mockOrder(...args)
      return chain
    },
    limit(...args: unknown[]) {
      mockLimit(...args)
      return chain
    },
    single() {
      mockSingle()
      return chain
    },
    // Make it thenable so `await` resolves it
    then(fn: (v: { data: unknown; error: unknown }) => void) {
      fn(resolvedValue)
    },
  }
  return chain
}

/** The per-test resolved value for the query. */
let queryResult: { data: unknown; error: unknown }

/** The per-test resolved value for predictions batch query. */
let predictionsResult: { data: unknown; error: unknown }

/** The per-test resolved value for gang league season query. */
let gangLeagueSeasonResult: { data: unknown; error: unknown }

/** The per-test resolved value for standings query. */
let standingsResult: { data: unknown; error: unknown }

/** Track which table is being queried to return the right result. */
let _tableCallCount: number

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      mockFrom(table)
      _tableCallCount++
      if (table === 'v2_gang_league_seasons') {
        return chainBuilder(gangLeagueSeasonResult)
      }
      if (table === 'v2_gang_fixture_standings') {
        return chainBuilder(standingsResult)
      }
      if (table === 'v2_predictions') {
        return chainBuilder(predictionsResult)
      }
      return chainBuilder(queryResult)
    },
    rpc: (fnName: string, params: unknown) => {
      mockRpc(fnName, params)
      return chainBuilder({ data: [], error: null })
    },
  })),
}))

// Import after mocks
const { getUpcomingFixtures, getFixtureWithTeams, getLiveFixtures, getRecentResults } = await import('./fixtures')

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const TEAM_MI = {
  id: 'team-mi',
  name: 'Mumbai Indians',
  code: 'MI',
  color: '#004BA0',
  logo_url: '/teams/mi.png',
}

const TEAM_CSK = {
  id: 'team-csk',
  name: 'Chennai Super Kings',
  code: 'CSK',
  color: '#FDB913',
  logo_url: '/teams/csk.png',
}

const FIXTURE_1 = {
  id: 'fixture-1',
  match_number: 1,
  start_datetime: '2026-04-10T19:30:00Z',
  venue_name: 'Wankhede Stadium',
  status: 'upcoming',
  home_team: TEAM_MI,
  away_team: TEAM_CSK,
}

// ---------------------------------------------------------------------------
// Tests — getUpcomingFixtures
// ---------------------------------------------------------------------------

describe('getUpcomingFixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _tableCallCount = 0

    queryResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }
    standingsResult = { data: [], error: null }
    gangLeagueSeasonResult = {
      data: {
        prediction_deadline_mins: 45,
        league_id: 'league-1',
        season_id: 'season-1',
      },
      error: null,
    }
  })

  test('returns empty array when no upcoming fixtures exist', async () => {
    queryResult = { data: [], error: null }

    const result = await getUpcomingFixtures('gang-1')

    expect(result).toEqual([])
  })

  test('fetches gang league season settings first', async () => {
    queryResult = { data: [], error: null }

    await getUpcomingFixtures('gang-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_gang_league_seasons')
    expect(mockEq).toHaveBeenCalledWith('gang_id', 'gang-1')
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
  })

  test('returns empty array when gang has no active league season', async () => {
    gangLeagueSeasonResult = { data: null, error: { message: 'no rows', code: 'PGRST116' } }

    const result = await getUpcomingFixtures('gang-1')

    expect(result).toEqual([])
  })

  test('queries fixtures with correct status filter and ordering', async () => {
    queryResult = { data: [FIXTURE_1], error: null }

    await getUpcomingFixtures('gang-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_league_season_fixtures')
    expect(mockIn).toHaveBeenCalledWith('status', ['upcoming'])
    expect(mockOrder).toHaveBeenCalledWith('start_datetime', { ascending: true })
    expect(mockLimit).toHaveBeenCalledWith(3)
  })

  test('maps fixture rows to clean interface with team info', async () => {
    queryResult = {
      data: [FIXTURE_1],
      error: null,
    }
    predictionsResult = {
      data: [
        { fixture_id: 'fixture-1', user_id: 'user-1' },
        { fixture_id: 'fixture-1', user_id: 'user-2' },
      ],
      error: null,
    }

    const result = await getUpcomingFixtures('gang-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'fixture-1',
        matchNumber: 1,
        startDatetime: '2026-04-10T19:30:00Z',
        venueName: 'Wankhede Stadium',
        status: 'upcoming',
        predictionDeadlineMins: 45,
        predictedCount: 2,
        homeTeam: {
          id: 'team-mi',
          name: 'Mumbai Indians',
          code: 'MI',
          color: '#004BA0',
          logoUrl: '/teams/mi.png',
        },
        awayTeam: {
          id: 'team-csk',
          name: 'Chennai Super Kings',
          code: 'CSK',
          color: '#FDB913',
          logoUrl: '/teams/csk.png',
        },
      }),
    )
  })

  test('respects custom limit parameter', async () => {
    queryResult = { data: [], error: null }

    await getUpcomingFixtures('gang-1', 5)

    expect(mockLimit).toHaveBeenCalledWith(5)
  })

  test('throws when the fixtures query errors', async () => {
    queryResult = { data: null, error: { message: 'db error', code: '42P01' } }

    await expect(getUpcomingFixtures('gang-1')).rejects.toEqual(
      expect.objectContaining({ message: 'db error' }),
    )
  })

  test('batch-fetches predictions from v2_predictions for all fixtures', async () => {
    queryResult = {
      data: [FIXTURE_1],
      error: null,
    }
    predictionsResult = {
      data: [{ fixture_id: 'fixture-1', user_id: 'user-1' }],
      error: null,
    }

    await getUpcomingFixtures('gang-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_predictions')
    expect(mockIn).toHaveBeenCalledWith('fixture_id', ['fixture-1'])
    expect(mockEq).toHaveBeenCalledWith('gang_id', 'gang-1')
  })

  test('counts distinct users per fixture in batch predictions', async () => {
    queryResult = {
      data: [FIXTURE_1],
      error: null,
    }
    // Same user predicted multiple scenarios for the same fixture — should count as 1
    predictionsResult = {
      data: [
        { fixture_id: 'fixture-1', user_id: 'user-1' },
        { fixture_id: 'fixture-1', user_id: 'user-1' },
        { fixture_id: 'fixture-1', user_id: 'user-2' },
      ],
      error: null,
    }

    const result = await getUpcomingFixtures('gang-1')

    expect(result[0]?.predictedCount).toBe(2)
  })

  test('handles prediction query error gracefully by returning 0 predicted count', async () => {
    queryResult = {
      data: [FIXTURE_1],
      error: null,
    }
    predictionsResult = { data: null, error: { message: 'query error', code: '42P01' } }

    const result = await getUpcomingFixtures('gang-1')

    expect(result[0]?.predictedCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Tests — getFixtureWithTeams
// ---------------------------------------------------------------------------

describe('getFixtureWithTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _tableCallCount = 0

    queryResult = { data: null, error: null }
    predictionsResult = { data: [], error: null }
    standingsResult = { data: [], error: null }
    gangLeagueSeasonResult = { data: null, error: null }
  })

  test('returns fixture with team details', async () => {
    queryResult = {
      data: {
        id: 'fixture-1',
        league_id: 'league-1',
        season_id: 'season-1',
        match_number: 1,
        start_datetime: '2026-04-10T19:30:00Z',
        venue_name: 'Wankhede Stadium',
        status: 'upcoming',
        home_team: TEAM_MI,
        away_team: TEAM_CSK,
      },
      error: null,
    }

    const result = await getFixtureWithTeams('fixture-1')

    expect(result).toEqual({
      id: 'fixture-1',
      leagueId: 'league-1',
      seasonId: 'season-1',
      matchNumber: 1,
      startDatetime: '2026-04-10T19:30:00Z',
      venueName: 'Wankhede Stadium',
      status: 'upcoming',
      homeTeam: {
        id: 'team-mi',
        name: 'Mumbai Indians',
        code: 'MI',
        color: '#004BA0',
        logoUrl: '/teams/mi.png',
      },
      awayTeam: {
        id: 'team-csk',
        name: 'Chennai Super Kings',
        code: 'CSK',
        color: '#FDB913',
        logoUrl: '/teams/csk.png',
      },
    })
  })

  test('returns null when fixture is not found (PGRST116)', async () => {
    queryResult = {
      data: null,
      error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    }

    const result = await getFixtureWithTeams('non-existent')

    expect(result).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('v2_league_season_fixtures')
    expect(mockEq).toHaveBeenCalledWith('id', 'non-existent')
    expect(mockSingle).toHaveBeenCalledTimes(1)
  })

  test('throws on non-PGRST116 errors', async () => {
    queryResult = {
      data: null,
      error: { message: 'connection error', code: '08006' },
    }

    await expect(getFixtureWithTeams('fixture-1')).rejects.toEqual(
      expect.objectContaining({ message: 'connection error' }),
    )
  })
})

// ---------------------------------------------------------------------------
// Tests — getLiveFixtures
// ---------------------------------------------------------------------------

const LIVE_FIXTURE_1 = {
  id: 'live-fixture-1',
  match_number: 12,
  start_datetime: '2026-04-09T19:30:00Z',
  venue_name: 'Wankhede Stadium',
  status: 'live',
  home_team: TEAM_MI,
  away_team: TEAM_CSK,
}

describe('getLiveFixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _tableCallCount = 0

    queryResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }
    standingsResult = { data: [], error: null }
    gangLeagueSeasonResult = {
      data: {
        league_id: 'league-1',
        season_id: 'season-1',
      },
      error: null,
    }
  })

  test('returns empty array when no live fixtures exist', async () => {
    queryResult = { data: [], error: null }

    const result = await getLiveFixtures('gang-1')

    expect(result).toEqual([])
  })

  test('returns empty array when gang has no active league season', async () => {
    gangLeagueSeasonResult = { data: null, error: { message: 'no rows', code: 'PGRST116' } }

    const result = await getLiveFixtures('gang-1')

    expect(result).toEqual([])
  })

  test('queries fixtures with status=live only', async () => {
    queryResult = { data: [LIVE_FIXTURE_1], error: null }

    await getLiveFixtures('gang-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_league_season_fixtures')
    expect(mockEq).toHaveBeenCalledWith('status', 'live')
    expect(mockOrder).toHaveBeenCalledWith('start_datetime', { ascending: true })
  })

  test('maps fixture rows to LiveFixture interface with team info', async () => {
    queryResult = {
      data: [LIVE_FIXTURE_1],
      error: null,
    }

    const result = await getLiveFixtures('gang-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'live-fixture-1',
      leagueId: 'league-1',
      seasonId: 'season-1',
      matchNumber: 12,
      startDatetime: '2026-04-09T19:30:00Z',
      venueName: 'Wankhede Stadium',
      status: 'live',
      homeTeam: {
        id: 'team-mi',
        name: 'Mumbai Indians',
        code: 'MI',
        color: '#004BA0',
        logoUrl: '/teams/mi.png',
      },
      awayTeam: {
        id: 'team-csk',
        name: 'Chennai Super Kings',
        code: 'CSK',
        color: '#FDB913',
        logoUrl: '/teams/csk.png',
      },
    })
  })

  test('throws on non-PGRST116 gang season errors', async () => {
    gangLeagueSeasonResult = {
      data: null,
      error: { message: 'connection error', code: '08006' },
    }

    await expect(getLiveFixtures('gang-1')).rejects.toEqual(
      expect.objectContaining({ message: 'connection error' }),
    )
  })

  test('throws when the fixtures query errors', async () => {
    queryResult = { data: null, error: { message: 'db error', code: '42P01' } }

    await expect(getLiveFixtures('gang-1')).rejects.toEqual(
      expect.objectContaining({ message: 'db error' }),
    )
  })

  test('returns multiple live fixtures when two concurrent matches exist', async () => {
    const liveFixture2 = {
      ...LIVE_FIXTURE_1,
      id: 'live-fixture-2',
      match_number: 13,
    }
    queryResult = {
      data: [LIVE_FIXTURE_1, liveFixture2],
      error: null,
    }

    const result = await getLiveFixtures('gang-1')

    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe('live-fixture-1')
    expect(result[1]?.id).toBe('live-fixture-2')
  })
})

// ---------------------------------------------------------------------------
// Tests — getRecentResults
// ---------------------------------------------------------------------------

const RESOLVED_FIXTURE = {
  id: 'resolved-fixture-1',
  match_number: 5,
  start_datetime: '2026-04-08T19:30:00Z',
  venue_name: 'Wankhede Stadium',
  status: 'resolved',
  home_team: TEAM_MI,
  away_team: TEAM_CSK,
  v2_fixture_results: { match_winner_id: 'team-mi' },
  v2_fixture_live_scores: {
    home_team_score: '186/4',
    away_team_score: '183/8',
  },
}

const ABANDONED_FIXTURE = {
  id: 'abandoned-fixture-1',
  match_number: 6,
  start_datetime: '2026-04-07T15:00:00Z',
  venue_name: 'Eden Gardens',
  status: 'abandoned',
  home_team: TEAM_CSK,
  away_team: TEAM_MI,
  v2_fixture_results: null,
  v2_fixture_live_scores: null,
}

describe('getRecentResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _tableCallCount = 0

    queryResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }
    standingsResult = { data: [], error: null }
    gangLeagueSeasonResult = {
      data: {
        league_id: 'league-1',
        season_id: 'season-1',
      },
      error: null,
    }
  })

  test('returns empty array when no completed fixtures exist', async () => {
    queryResult = { data: [], error: null }

    const result = await getRecentResults('gang-1', 'user-1')

    expect(result).toEqual([])
  })

  test('returns empty array when gang has no active league season', async () => {
    gangLeagueSeasonResult = { data: null, error: { message: 'no rows', code: 'PGRST116' } }

    const result = await getRecentResults('gang-1', 'user-1')

    expect(result).toEqual([])
  })

  test('queries fixtures with completed statuses filter and descending order', async () => {
    queryResult = { data: [RESOLVED_FIXTURE], error: null }

    await getRecentResults('gang-1', 'user-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_league_season_fixtures')
    expect(mockIn).toHaveBeenCalledWith('status', ['completed', 'resolved', 'abandoned', 'no_result'])
    expect(mockOrder).toHaveBeenCalledWith('start_datetime', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(3)
  })

  test('fetches user standings for fixture IDs', async () => {
    queryResult = { data: [RESOLVED_FIXTURE], error: null }

    await getRecentResults('gang-1', 'user-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_gang_fixture_standings')
    expect(mockEq).toHaveBeenCalledWith('gang_id', 'gang-1')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockIn).toHaveBeenCalledWith('fixture_id', ['resolved-fixture-1'])
  })

  test('maps resolved fixture with winner, scores, and user standing', async () => {
    queryResult = { data: [RESOLVED_FIXTURE], error: null }
    standingsResult = {
      data: [
        {
          fixture_id: 'resolved-fixture-1',
          predicted_count: 5,
          correct_count: 3,
          resolved_count: 5,
          points_earned: 15,
        },
      ],
      error: null,
    }

    const result = await getRecentResults('gang-1', 'user-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'resolved-fixture-1',
        matchNumber: 5,
        status: 'resolved',
        matchWinnerId: 'team-mi',
        homeTeamScore: '186/4',
        awayTeamScore: '183/8',
        homeTeam: expect.objectContaining({ code: 'MI' }),
        awayTeam: expect.objectContaining({ code: 'CSK' }),
        userStanding: {
          predictedCount: 5,
          correctCount: 3,
          resolvedCount: 5,
          pointsEarned: 15,
        },
      }),
    )
  })

  test('returns null userStanding when user did not predict', async () => {
    queryResult = { data: [RESOLVED_FIXTURE], error: null }
    standingsResult = { data: [], error: null }

    const result = await getRecentResults('gang-1', 'user-1')

    expect(result[0]?.userStanding).toBeNull()
  })

  test('handles abandoned fixture with null scores and results', async () => {
    queryResult = { data: [ABANDONED_FIXTURE], error: null }

    const result = await getRecentResults('gang-1', 'user-1')

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'abandoned-fixture-1',
        status: 'abandoned',
        matchWinnerId: null,
        homeTeamScore: null,
        awayTeamScore: null,
      }),
    )
  })

  test('respects custom limit parameter', async () => {
    queryResult = { data: [], error: null }

    await getRecentResults('gang-1', 'user-1', 5)

    expect(mockLimit).toHaveBeenCalledWith(5)
  })

  test('throws when the fixtures query errors', async () => {
    queryResult = { data: null, error: { message: 'db error', code: '42P01' } }

    await expect(getRecentResults('gang-1', 'user-1')).rejects.toEqual(
      expect.objectContaining({ message: 'db error' }),
    )
  })

  test('throws when the standings query errors', async () => {
    queryResult = { data: [RESOLVED_FIXTURE], error: null }
    standingsResult = { data: null, error: { message: 'standings error', code: '42P01' } }

    await expect(getRecentResults('gang-1', 'user-1')).rejects.toEqual(
      expect.objectContaining({ message: 'standings error' }),
    )
  })

  test('throws on non-PGRST116 gang season errors', async () => {
    gangLeagueSeasonResult = {
      data: null,
      error: { message: 'connection error', code: '08006' },
    }

    await expect(getRecentResults('gang-1', 'user-1')).rejects.toEqual(
      expect.objectContaining({ message: 'connection error' }),
    )
  })
})

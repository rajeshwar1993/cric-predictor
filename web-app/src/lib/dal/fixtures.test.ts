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
  const chain: Record<string, (...args: unknown[]) => typeof chain> & {
    then: (fn: (v: { data: unknown; error: unknown }) => void) => void
  } = {
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

/** The per-test resolved value for RPC calls. */
let rpcResult: { data: unknown; error: unknown }

/** The per-test resolved value for gang league season query. */
let gangLeagueSeasonResult: { data: unknown; error: unknown }

/** Track which table is being queried to return the right result. */
let _tableCallCount: number

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      mockFrom(table)
      _tableCallCount++
      // Return gang league season result on second from() call
      if (table === 'v2_gang_league_seasons') {
        return chainBuilder(gangLeagueSeasonResult)
      }
      return chainBuilder(queryResult)
    },
    rpc: (fnName: string, params: unknown) => {
      mockRpc(fnName, params)
      return chainBuilder(rpcResult)
    },
  })),
}))

// Import after mocks
const { getUpcomingFixtures, getFixtureWithTeams } = await import('./fixtures')

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
    rpcResult = { data: [], error: null }
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
    expect(mockIn).toHaveBeenCalledWith('status', ['upcoming', 'live'])
    expect(mockOrder).toHaveBeenCalledWith('start_datetime', { ascending: true })
    expect(mockLimit).toHaveBeenCalledWith(3)
  })

  test('maps fixture rows to clean interface with team info', async () => {
    queryResult = {
      data: [FIXTURE_1],
      error: null,
    }
    rpcResult = { data: ['user-1', 'user-2'], error: null }

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

  test('calls get_members_who_predicted RPC for each fixture', async () => {
    queryResult = {
      data: [FIXTURE_1],
      error: null,
    }
    rpcResult = { data: ['user-1'], error: null }

    await getUpcomingFixtures('gang-1')

    expect(mockRpc).toHaveBeenCalledWith('get_members_who_predicted', {
      p_gang_id: 'gang-1',
      p_fixture_id: 'fixture-1',
    })
  })

  test('handles RPC error gracefully by returning 0 predicted count', async () => {
    queryResult = {
      data: [FIXTURE_1],
      error: null,
    }
    rpcResult = { data: null, error: { message: 'rpc error', code: '42883' } }

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
    rpcResult = { data: [], error: null }
    gangLeagueSeasonResult = { data: null, error: null }
  })

  test('returns fixture with team details', async () => {
    queryResult = {
      data: {
        id: 'fixture-1',
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

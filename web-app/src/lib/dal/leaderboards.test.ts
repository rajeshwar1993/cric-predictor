import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — chain-style to simulate Supabase PostgREST builder
// ---------------------------------------------------------------------------

/** Tracks calls to `.from()` */
const mockFrom = vi.fn()
/** Tracks calls to `.select()` */
const mockSelect = vi.fn()
/** Tracks calls to `.eq()` */
const mockEq = vi.fn()
/** Tracks calls to `.order()` */
const mockOrder = vi.fn()
/** Tracks calls to `.limit()` */
const mockLimit = vi.fn()
/** Tracks calls to `.maybeSingle()` */
const mockMaybeSingle = vi.fn()

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
    order(...args: unknown[]) {
      mockOrder(...args)
      return chain
    },
    limit(...args: unknown[]) {
      mockLimit(...args)
      return chain
    },
    maybeSingle() {
      mockMaybeSingle()
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

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      mockFrom(table)
      return chainBuilder(queryResult)
    },
  })),
}))

// Import after mocks
const { getGangSeasonStandings, getGangActiveSeason } = await import(
  './leaderboards'
)

// ---------------------------------------------------------------------------
// Tests — getGangSeasonStandings
// ---------------------------------------------------------------------------

describe('getGangSeasonStandings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: [], error: null }
  })

  test('returns empty array when no standings exist', async () => {
    queryResult = { data: [], error: null }

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('v2_gang_season_standings')
    expect(mockEq).toHaveBeenCalledWith('gang_id', 'gang-1')
    expect(mockEq).toHaveBeenCalledWith('season_id', 'season-1')
  })

  test('returns empty array when data is null', async () => {
    queryResult = { data: null, error: null }

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toEqual([])
  })

  test('maps standings rows with profile data', async () => {
    queryResult = {
      data: [
        {
          user_id: 'user-1',
          total_points: 142,
          matches_predicted: 18,
          accuracy_pct: 85.5,
          rank: 1,
          v2_profiles: { display_name: 'Rajesh K', avatar_url: null },
        },
        {
          user_id: 'user-2',
          total_points: 138,
          matches_predicted: 17,
          accuracy_pct: 82.3,
          rank: 2,
          v2_profiles: { display_name: 'Virat K', avatar_url: 'https://example.com/avatar.jpg' },
        },
      ],
      error: null,
    }

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      userId: 'user-1',
      totalPoints: 142,
      matchesPredicted: 18,
      accuracyPct: 85.5,
      rank: 1,
      displayName: 'Rajesh K',
      avatarUrl: null,
    })
    expect(result[1]).toEqual({
      userId: 'user-2',
      totalPoints: 138,
      matchesPredicted: 17,
      accuracyPct: 82.3,
      rank: 2,
      displayName: 'Virat K',
      avatarUrl: 'https://example.com/avatar.jpg',
    })
  })

  test('handles null profile gracefully', async () => {
    queryResult = {
      data: [
        {
          user_id: 'user-1',
          total_points: 50,
          matches_predicted: 5,
          accuracy_pct: 60.0,
          rank: 1,
          v2_profiles: null,
        },
      ],
      error: null,
    }

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      userId: 'user-1',
      totalPoints: 50,
      matchesPredicted: 5,
      accuracyPct: 60.0,
      rank: 1,
      displayName: null,
      avatarUrl: null,
    })
  })

  test('handles null rank for unranked members', async () => {
    queryResult = {
      data: [
        {
          user_id: 'user-1',
          total_points: 0,
          matches_predicted: 0,
          accuracy_pct: 0,
          rank: null,
          v2_profiles: { display_name: 'New User', avatar_url: null },
        },
      ],
      error: null,
    }

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result[0]?.rank).toBeNull()
  })

  test('orders by rank ascending', async () => {
    queryResult = { data: [], error: null }

    await getGangSeasonStandings('gang-1', 'season-1')

    expect(mockOrder).toHaveBeenCalledWith('rank', {
      ascending: true,
      nullsFirst: false,
    })
  })

  test('throws when the query errors', async () => {
    queryResult = {
      data: null,
      error: { message: 'db error', code: '42P01' },
    }

    await expect(
      getGangSeasonStandings('gang-1', 'season-1'),
    ).rejects.toEqual(expect.objectContaining({ message: 'db error' }))
  })
})

// ---------------------------------------------------------------------------
// Tests — getGangActiveSeason
// ---------------------------------------------------------------------------

describe('getGangActiveSeason', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  test('returns season_id when an active season exists', async () => {
    queryResult = {
      data: {
        season_id: 'season-ipl-2026',
        league_id: 'league-ipl',
      },
      error: null,
    }

    const result = await getGangActiveSeason('gang-1')

    expect(result).toEqual({
      seasonId: 'season-ipl-2026',
      leagueId: 'league-ipl',
    })
    expect(mockFrom).toHaveBeenCalledWith('v2_gang_league_seasons')
    expect(mockEq).toHaveBeenCalledWith('gang_id', 'gang-1')
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
    expect(mockSelect).toHaveBeenCalledWith('season_id, league_id')
    expect(mockLimit).toHaveBeenCalledWith(1)
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1)
  })

  test('returns null when no active season exists', async () => {
    queryResult = { data: null, error: null }

    const result = await getGangActiveSeason('gang-1')

    expect(result).toBeNull()
  })

  test('throws when the query errors', async () => {
    queryResult = {
      data: null,
      error: { message: 'db error', code: '42P01' },
    }

    await expect(getGangActiveSeason('gang-1')).rejects.toEqual(
      expect.objectContaining({ message: 'db error' }),
    )
  })
})

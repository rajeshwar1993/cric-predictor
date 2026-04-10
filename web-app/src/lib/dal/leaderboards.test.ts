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
/** Tracks calls to `.in()` */
const mockIn = vi.fn()

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
    in(...args: unknown[]) {
      mockIn(...args)
      return chain
    },
    // Make it thenable so `await` resolves it
    then(fn: (v: { data: unknown; error: unknown }) => void) {
      fn(resolvedValue)
    },
  }
  return chain
}

/** The per-test resolved value for the query (single-query functions). */
let queryResult: { data: unknown; error: unknown }

/**
 * Per-table query results for multi-query functions.
 * When a table is in this map, it takes precedence over `queryResult`.
 */
let tableResults: Map<string, { data: unknown; error: unknown }>

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      mockFrom(table)
      const result = tableResults.get(table) ?? queryResult
      return chainBuilder(result)
    },
  })),
}))

// Import after mocks
const { getGangSeasonStandings, getGangActiveSeason, getMatchLeaderboard } =
  await import('./leaderboards')

// ---------------------------------------------------------------------------
// Tests — getGangSeasonStandings
// ---------------------------------------------------------------------------

describe('getGangSeasonStandings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: [], error: null }
    tableResults = new Map()
  })

  test('returns empty array when no standings exist', async () => {
    tableResults.set('v2_gang_season_standings', { data: [], error: null })

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('v2_gang_season_standings')
    expect(mockEq).toHaveBeenCalledWith('gang_id', 'gang-1')
    expect(mockEq).toHaveBeenCalledWith('season_id', 'season-1')
  })

  test('returns empty array when data is null', async () => {
    tableResults.set('v2_gang_season_standings', { data: null, error: null })

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toEqual([])
  })

  test('maps standings rows with profile and member status data', async () => {
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          user_id: 'user-1',
          total_points: 142,
          matches_predicted: 18,
          accuracy_pct: 85.5,
          points_per_match: 7.9,
          rank: 1,
          v2_profiles: { display_name: 'Rajesh K', avatar_url: null },
        },
        {
          user_id: 'user-2',
          total_points: 138,
          matches_predicted: 17,
          accuracy_pct: 82.3,
          points_per_match: 8.1,
          rank: 2,
          v2_profiles: {
            display_name: 'Virat K',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [
        { user_id: 'user-1', status: 'approved' },
        { user_id: 'user-2', status: 'approved' },
      ],
      error: null,
    })

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      userId: 'user-1',
      totalPoints: 142,
      matchesPredicted: 18,
      accuracyPct: 85.5,
      pointsPerMatch: 7.9,
      rank: 1,
      displayName: 'Rajesh K',
      avatarUrl: null,
      memberStatus: 'approved',
    })
    expect(result[1]).toEqual({
      userId: 'user-2',
      totalPoints: 138,
      matchesPredicted: 17,
      accuracyPct: 82.3,
      pointsPerMatch: 8.1,
      rank: 2,
      displayName: 'Virat K',
      avatarUrl: 'https://example.com/avatar.jpg',
      memberStatus: 'approved',
    })
  })

  test('handles null profile gracefully', async () => {
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          user_id: 'user-1',
          total_points: 50,
          matches_predicted: 5,
          accuracy_pct: 60.0,
          points_per_match: 10.0,
          rank: 1,
          v2_profiles: null,
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [{ user_id: 'user-1', status: 'approved' }],
      error: null,
    })

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      userId: 'user-1',
      totalPoints: 50,
      matchesPredicted: 5,
      accuracyPct: 60.0,
      pointsPerMatch: 10.0,
      rank: 1,
      displayName: null,
      avatarUrl: null,
      memberStatus: 'approved',
    })
  })

  test('handles null rank for unranked members', async () => {
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          user_id: 'user-1',
          total_points: 0,
          matches_predicted: 0,
          accuracy_pct: 0,
          points_per_match: 0,
          rank: null,
          v2_profiles: { display_name: 'New User', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [{ user_id: 'user-1', status: 'approved' }],
      error: null,
    })

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result[0]?.rank).toBeNull()
  })

  test('orders by rank ascending', async () => {
    tableResults.set('v2_gang_season_standings', { data: [], error: null })

    await getGangSeasonStandings('gang-1', 'season-1')

    expect(mockOrder).toHaveBeenCalledWith('rank', {
      ascending: true,
      nullsFirst: false,
    })
  })

  test('throws when the standings query errors', async () => {
    tableResults.set('v2_gang_season_standings', {
      data: null,
      error: { message: 'db error', code: '42P01' },
    })

    await expect(
      getGangSeasonStandings('gang-1', 'season-1'),
    ).rejects.toEqual(expect.objectContaining({ message: 'db error' }))
  })

  test('throws when the members query errors', async () => {
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          user_id: 'user-1',
          total_points: 50,
          matches_predicted: 5,
          accuracy_pct: 60.0,
          points_per_match: 10.0,
          rank: 1,
          v2_profiles: { display_name: 'User', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: null,
      error: { message: 'members error', code: '42P01' },
    })

    await expect(
      getGangSeasonStandings('gang-1', 'season-1'),
    ).rejects.toEqual(expect.objectContaining({ message: 'members error' }))
  })

  test('sorts departed members to the end', async () => {
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          user_id: 'user-active',
          total_points: 20,
          matches_predicted: 5,
          accuracy_pct: 50.0,
          points_per_match: 4.0,
          rank: 2,
          v2_profiles: { display_name: 'Active User', avatar_url: null },
        },
        {
          user_id: 'user-left',
          total_points: 42,
          matches_predicted: 8,
          accuracy_pct: 75.0,
          points_per_match: 5.25,
          rank: 1,
          v2_profiles: { display_name: 'Left User', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [
        { user_id: 'user-active', status: 'approved' },
        { user_id: 'user-left', status: 'left' },
      ],
      error: null,
    })

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result).toHaveLength(2)
    // Active member should be first despite departed member having rank 1
    expect(result[0]?.userId).toBe('user-active')
    expect(result[0]?.memberStatus).toBe('approved')
    expect(result[1]?.userId).toBe('user-left')
    expect(result[1]?.memberStatus).toBe('left')
  })

  test("defaults member status to 'removed' when not found", async () => {
    // Safer default than 'approved': if the standings row exists but the
    // membership record is missing (data drift), we dim the user rather
    // than falsely surface them as active.
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          user_id: 'user-unknown',
          total_points: 10,
          matches_predicted: 2,
          accuracy_pct: 40.0,
          points_per_match: 5.0,
          rank: 1,
          v2_profiles: { display_name: 'Unknown', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [],
      error: null,
    })

    // Suppress the expected dev-only warning log.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await getGangSeasonStandings('gang-1', 'season-1')
    warnSpy.mockRestore()

    expect(result[0]?.memberStatus).toBe('removed')
  })

  test('includes pointsPerMatch from database', async () => {
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          user_id: 'user-1',
          total_points: 90,
          matches_predicted: 12,
          accuracy_pct: 72.5,
          points_per_match: 7.5,
          rank: 1,
          v2_profiles: { display_name: 'Test User', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [{ user_id: 'user-1', status: 'approved' }],
      error: null,
    })

    const result = await getGangSeasonStandings('gang-1', 'season-1')

    expect(result[0]?.pointsPerMatch).toBe(7.5)
  })

  test('queries v2_gang_members with correct filters', async () => {
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          user_id: 'user-1',
          total_points: 10,
          matches_predicted: 1,
          accuracy_pct: 50.0,
          points_per_match: 10.0,
          rank: 1,
          v2_profiles: { display_name: 'User', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [{ user_id: 'user-1', status: 'approved' }],
      error: null,
    })

    await getGangSeasonStandings('gang-1', 'season-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_gang_members')
    expect(mockIn).toHaveBeenCalledWith('user_id', ['user-1'])
  })
})

// ---------------------------------------------------------------------------
// Tests — getGangActiveSeason
// ---------------------------------------------------------------------------

describe('getGangActiveSeason', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
    tableResults = new Map()
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

// ---------------------------------------------------------------------------
// Tests — getMatchLeaderboard
// ---------------------------------------------------------------------------

describe('getMatchLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: [], error: null }
    tableResults = new Map()
  })

  test('returns empty array when no standings exist', async () => {
    tableResults.set('v2_gang_fixture_standings', { data: [], error: null })

    const result = await getMatchLeaderboard('gang-1', 'fixture-1')

    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('v2_gang_fixture_standings')
  })

  test('returns empty array when standings data is null', async () => {
    tableResults.set('v2_gang_fixture_standings', { data: null, error: null })

    const result = await getMatchLeaderboard('gang-1', 'fixture-1')

    expect(result).toEqual([])
  })

  test('maps standings with profile and member status data', async () => {
    tableResults.set('v2_gang_fixture_standings', {
      data: [
        {
          user_id: 'user-1',
          predicted_count: 8,
          resolved_count: 6,
          correct_count: 5,
          points_earned: 42,
          rank: 1,
          last_submitted_at: '2026-04-10T10:00:00Z',
          v2_profiles: {
            display_name: 'Rajesh K',
            avatar_url: 'https://example.com/a1.jpg',
          },
        },
        {
          user_id: 'user-2',
          predicted_count: 8,
          resolved_count: 6,
          correct_count: 4,
          points_earned: 36,
          rank: 2,
          last_submitted_at: '2026-04-10T11:00:00Z',
          v2_profiles: { display_name: 'Virat K', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [
        { user_id: 'user-1', status: 'approved' },
        { user_id: 'user-2', status: 'approved' },
      ],
      error: null,
    })

    const result = await getMatchLeaderboard('gang-1', 'fixture-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      userId: 'user-1',
      predictedCount: 8,
      resolvedCount: 6,
      correctCount: 5,
      pointsEarned: 42,
      rank: 1,
      lastSubmittedAt: '2026-04-10T10:00:00Z',
      displayName: 'Rajesh K',
      avatarUrl: 'https://example.com/a1.jpg',
      memberStatus: 'approved',
    })
    expect(result[1]).toEqual({
      userId: 'user-2',
      predictedCount: 8,
      resolvedCount: 6,
      correctCount: 4,
      pointsEarned: 36,
      rank: 2,
      lastSubmittedAt: '2026-04-10T11:00:00Z',
      displayName: 'Virat K',
      avatarUrl: null,
      memberStatus: 'approved',
    })
  })

  test('sorts departed members to the end', async () => {
    tableResults.set('v2_gang_fixture_standings', {
      data: [
        {
          user_id: 'user-active',
          predicted_count: 5,
          resolved_count: 5,
          correct_count: 3,
          points_earned: 20,
          rank: 2,
          last_submitted_at: '2026-04-10T10:00:00Z',
          v2_profiles: { display_name: 'Active User', avatar_url: null },
        },
        {
          user_id: 'user-left',
          predicted_count: 8,
          resolved_count: 6,
          correct_count: 5,
          points_earned: 42,
          rank: 1,
          last_submitted_at: '2026-04-10T09:00:00Z',
          v2_profiles: { display_name: 'Left User', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [
        { user_id: 'user-active', status: 'approved' },
        { user_id: 'user-left', status: 'left' },
      ],
      error: null,
    })

    const result = await getMatchLeaderboard('gang-1', 'fixture-1')

    expect(result).toHaveLength(2)
    // Active member should be first despite departed member having rank 1
    expect(result[0]?.userId).toBe('user-active')
    expect(result[0]?.memberStatus).toBe('approved')
    expect(result[1]?.userId).toBe('user-left')
    expect(result[1]?.memberStatus).toBe('left')
  })

  test('handles null profile gracefully', async () => {
    tableResults.set('v2_gang_fixture_standings', {
      data: [
        {
          user_id: 'user-1',
          predicted_count: 3,
          resolved_count: 3,
          correct_count: 1,
          points_earned: 10,
          rank: 1,
          last_submitted_at: null,
          v2_profiles: null,
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [{ user_id: 'user-1', status: 'approved' }],
      error: null,
    })

    const result = await getMatchLeaderboard('gang-1', 'fixture-1')

    expect(result).toHaveLength(1)
    expect(result[0]?.displayName).toBeNull()
    expect(result[0]?.avatarUrl).toBeNull()
    expect(result[0]?.lastSubmittedAt).toBeNull()
  })

  test("defaults member status to 'removed' when not found", async () => {
    // Safer default than 'approved': if the standings row exists but the
    // membership record is missing (data drift), we dim the user rather
    // than falsely surface them as active.
    tableResults.set('v2_gang_fixture_standings', {
      data: [
        {
          user_id: 'user-unknown',
          predicted_count: 3,
          resolved_count: 0,
          correct_count: 0,
          points_earned: 0,
          rank: 1,
          last_submitted_at: '2026-04-10T10:00:00Z',
          v2_profiles: { display_name: 'Unknown', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [],
      error: null,
    })

    // Suppress the expected dev-only warning log.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await getMatchLeaderboard('gang-1', 'fixture-1')
    warnSpy.mockRestore()

    expect(result[0]?.memberStatus).toBe('removed')
  })

  test('queries correct tables with correct filters', async () => {
    tableResults.set('v2_gang_fixture_standings', { data: [], error: null })

    await getMatchLeaderboard('gang-1', 'fixture-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_gang_fixture_standings')
    expect(mockEq).toHaveBeenCalledWith('gang_id', 'gang-1')
    expect(mockEq).toHaveBeenCalledWith('fixture_id', 'fixture-1')
    expect(mockOrder).toHaveBeenCalledWith('rank', {
      ascending: true,
      nullsFirst: false,
    })
  })

  test('throws when standings query errors', async () => {
    tableResults.set('v2_gang_fixture_standings', {
      data: null,
      error: { message: 'standings error', code: '42P01' },
    })

    await expect(
      getMatchLeaderboard('gang-1', 'fixture-1'),
    ).rejects.toEqual(
      expect.objectContaining({ message: 'standings error' }),
    )
  })

  test('throws when members query errors', async () => {
    tableResults.set('v2_gang_fixture_standings', {
      data: [
        {
          user_id: 'user-1',
          predicted_count: 3,
          resolved_count: 0,
          correct_count: 0,
          points_earned: 0,
          rank: 1,
          last_submitted_at: '2026-04-10T10:00:00Z',
          v2_profiles: { display_name: 'User', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: null,
      error: { message: 'members error', code: '42P01' },
    })

    await expect(
      getMatchLeaderboard('gang-1', 'fixture-1'),
    ).rejects.toEqual(
      expect.objectContaining({ message: 'members error' }),
    )
  })

  test('handles removed members as departed', async () => {
    tableResults.set('v2_gang_fixture_standings', {
      data: [
        {
          user_id: 'user-removed',
          predicted_count: 4,
          resolved_count: 4,
          correct_count: 2,
          points_earned: 15,
          rank: 1,
          last_submitted_at: '2026-04-10T09:00:00Z',
          v2_profiles: { display_name: 'Removed User', avatar_url: null },
        },
      ],
      error: null,
    })
    tableResults.set('v2_gang_members', {
      data: [{ user_id: 'user-removed', status: 'removed' }],
      error: null,
    })

    const result = await getMatchLeaderboard('gang-1', 'fixture-1')

    expect(result[0]?.memberStatus).toBe('removed')
  })
})

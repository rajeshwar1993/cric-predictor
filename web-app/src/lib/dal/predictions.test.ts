import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { FixtureScenarioRow } from './predictions'
import type { MatchLeaderboardEntry } from './leaderboards'

// ---------------------------------------------------------------------------
// Mocks — chain-style to simulate Supabase PostgREST builder
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

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

/** The per-test resolved value for fixture scenarios query. */
let scenariosResult: { data: unknown; error: unknown }

/** The per-test resolved value for predictions query. */
let predictionsResult: { data: unknown; error: unknown }

/** The per-test resolved value for players query. */
let playersResult: { data: unknown; error: unknown }

/** The per-test resolved value for gang league season query. */
let gangLeagueSeasonResult: { data: unknown; error: unknown }

/** The per-test resolved value for v2_league_teams query. */
let leagueTeamsResult: { data: unknown; error: unknown }

/** The per-test resolved value for v2_players query. */
let leaguePlayersResult: { data: unknown; error: unknown }

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      mockFrom(table)
      if (table === 'v2_fixture_scenarios') {
        return chainBuilder(scenariosResult)
      }
      if (table === 'v2_predictions') {
        return chainBuilder(predictionsResult)
      }
      if (table === 'v2_league_season_team_players') {
        return chainBuilder(playersResult)
      }
      if (table === 'v2_gang_league_seasons') {
        return chainBuilder(gangLeagueSeasonResult)
      }
      if (table === 'v2_league_teams') {
        return chainBuilder(leagueTeamsResult)
      }
      if (table === 'v2_players') {
        return chainBuilder(leaguePlayersResult)
      }
      return chainBuilder({ data: null, error: null })
    },
  })),
}))

// Mock getMatchLeaderboard from leaderboards DAL — it creates its own
// server client so mocking the Supabase tables here would double-dispatch.
const mockGetMatchLeaderboard = vi.fn()
vi.mock('./leaderboards', () => ({
  getMatchLeaderboard: (gangId: string, fixtureId: string) =>
    mockGetMatchLeaderboard(gangId, fixtureId),
}))

// Import after mocks
const {
  getFixtureScenarios,
  getUserPredictions,
  getMatchPlayers,
  getGangLeagueSeason,
  groupScenariosByPhase,
  getMatchPredictions,
} = await import('./predictions')

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const SCENARIO_TOSS = {
  id: 'scenario-1',
  fixture_id: 'fixture-1',
  title: 'Who will win the toss?',
  slug: 'toss-winner',
  input_type: 'team_pick' as const,
  options: null,
  resolution_phase: 'toss' as const,
  correct_answer: null,
  points: 10,
}

const SCENARIO_FIRST_WICKET = {
  id: 'scenario-2',
  fixture_id: 'fixture-1',
  title: 'First wicket in which over?',
  slug: 'first-wicket-over',
  input_type: 'range' as const,
  options: ['1-2', '3-4', '5-6', '7+'],
  resolution_phase: 'first_wicket' as const,
  correct_answer: null,
  points: 15,
}

const SCENARIO_MATCH_END = {
  id: 'scenario-3',
  fixture_id: 'fixture-1',
  title: 'Who will win the match?',
  slug: 'match-winner',
  input_type: 'team_pick' as const,
  options: null,
  resolution_phase: 'end' as const,
  correct_answer: null,
  points: 20,
}

// ---------------------------------------------------------------------------
// Tests — getFixtureScenarios
// ---------------------------------------------------------------------------

describe('getFixtureScenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scenariosResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }
    playersResult = { data: [], error: null }
    gangLeagueSeasonResult = { data: null, error: null }
  })

  test('returns empty array when no scenarios exist', async () => {
    scenariosResult = { data: [], error: null }

    const result = await getFixtureScenarios('gang-1', 'fixture-1')

    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('v2_fixture_scenarios')
  })

  test('returns mapped scenarios when data exists', async () => {
    scenariosResult = {
      data: [SCENARIO_TOSS, SCENARIO_FIRST_WICKET],
      error: null,
    }

    const result = await getFixtureScenarios('gang-1', 'fixture-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'scenario-1',
      fixtureId: 'fixture-1',
      title: 'Who will win the toss?',
      inputType: 'team_pick',
      options: null,
      resolutionPhase: 'toss',
      correctAnswer: null,
      points: 10,
    })
    expect(result[1]).toEqual({
      id: 'scenario-2',
      fixtureId: 'fixture-1',
      title: 'First wicket in which over?',
      inputType: 'range',
      options: ['1-2', '3-4', '5-6', '7+'],
      resolutionPhase: 'first_wicket',
      correctAnswer: null,
      points: 15,
    })
  })

  test('throws on database error', async () => {
    scenariosResult = { data: null, error: { message: 'DB error', code: '500' } }

    await expect(getFixtureScenarios('gang-1', 'fixture-1')).rejects.toEqual({
      message: 'DB error',
      code: '500',
    })
  })

  test('returns empty array when data is null', async () => {
    scenariosResult = { data: null, error: null }

    const result = await getFixtureScenarios('gang-1', 'fixture-1')
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Tests — getUserPredictions
// ---------------------------------------------------------------------------

describe('getUserPredictions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scenariosResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }
    playersResult = { data: [], error: null }
    gangLeagueSeasonResult = { data: null, error: null }
  })

  test('returns empty array when no predictions exist', async () => {
    predictionsResult = { data: [], error: null }

    const result = await getUserPredictions('gang-1', 'fixture-1', 'user-1')
    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('v2_predictions')
  })

  test('returns mapped predictions when data exists', async () => {
    predictionsResult = {
      data: [
        {
          id: 'pred-1',
          scenario_id: 'scenario-1',
          value: 'team-mi',
          submitted_at: '2026-04-09T10:00:00Z',
        },
        {
          id: 'pred-2',
          scenario_id: 'scenario-2',
          value: '3-4',
          submitted_at: '2026-04-09T10:00:00Z',
        },
      ],
      error: null,
    }

    const result = await getUserPredictions('gang-1', 'fixture-1', 'user-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'pred-1',
      scenarioId: 'scenario-1',
      value: 'team-mi',
      submittedAt: '2026-04-09T10:00:00Z',
    })
  })

  test('throws on database error', async () => {
    predictionsResult = { data: null, error: { message: 'DB error', code: '500' } }

    await expect(getUserPredictions('gang-1', 'fixture-1', 'user-1')).rejects.toEqual({
      message: 'DB error',
      code: '500',
    })
  })
})

// ---------------------------------------------------------------------------
// Tests — getMatchPlayers
// ---------------------------------------------------------------------------

describe('getMatchPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scenariosResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }
    playersResult = { data: [], error: null }
    gangLeagueSeasonResult = { data: null, error: null }
  })

  test('returns empty array when no players found', async () => {
    playersResult = { data: [], error: null }

    const result = await getMatchPlayers('season-1', 'team-mi', 'team-csk')
    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('v2_league_season_team_players')
  })

  test('returns mapped players when data exists', async () => {
    playersResult = {
      data: [
        {
          team_id: 'team-mi',
          player: { id: 'player-1', name: 'Rohit Sharma', role: 'batsman' },
        },
        {
          team_id: 'team-csk',
          player: { id: 'player-2', name: 'MS Dhoni', role: 'wicketkeeper' },
        },
      ],
      error: null,
    }

    const result = await getMatchPlayers('season-1', 'team-mi', 'team-csk')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'player-1',
      name: 'Rohit Sharma',
      teamId: 'team-mi',
      role: 'batsman',
    })
    expect(result[1]).toEqual({
      id: 'player-2',
      name: 'MS Dhoni',
      teamId: 'team-csk',
      role: 'wicketkeeper',
    })
  })

  test('throws on database error', async () => {
    playersResult = { data: null, error: { message: 'DB error', code: '500' } }

    await expect(getMatchPlayers('season-1', 'team-mi', 'team-csk')).rejects.toEqual({
      message: 'DB error',
      code: '500',
    })
  })
})

// ---------------------------------------------------------------------------
// Tests — getGangLeagueSeason
// ---------------------------------------------------------------------------

describe('getGangLeagueSeason', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scenariosResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }
    playersResult = { data: [], error: null }
    gangLeagueSeasonResult = { data: null, error: null }
  })

  test('returns null when no active season exists', async () => {
    gangLeagueSeasonResult = {
      data: null,
      error: { code: 'PGRST116', message: 'no rows' },
    }

    const result = await getGangLeagueSeason('gang-1')
    expect(result).toBeNull()
  })

  test('returns season info when data exists', async () => {
    gangLeagueSeasonResult = {
      data: {
        league_id: 'league-1',
        season_id: 'season-1',
        prediction_deadline_mins: 30,
      },
      error: null,
    }

    const result = await getGangLeagueSeason('gang-1')

    expect(result).toEqual({
      leagueId: 'league-1',
      seasonId: 'season-1',
      predictionDeadlineMins: 30,
    })
  })

  test('defaults prediction_deadline_mins to 45 when null', async () => {
    gangLeagueSeasonResult = {
      data: {
        league_id: 'league-1',
        season_id: 'season-1',
        prediction_deadline_mins: null,
      },
      error: null,
    }

    const result = await getGangLeagueSeason('gang-1')

    expect(result?.predictionDeadlineMins).toBe(45)
  })

  test('throws on non-PGRST116 database error', async () => {
    gangLeagueSeasonResult = {
      data: null,
      error: { message: 'DB error', code: '500' },
    }

    await expect(getGangLeagueSeason('gang-1')).rejects.toEqual({
      message: 'DB error',
      code: '500',
    })
  })
})

// ---------------------------------------------------------------------------
// Tests — groupScenariosByPhase
// ---------------------------------------------------------------------------

describe('groupScenariosByPhase', () => {
  test('returns empty array when no scenarios', () => {
    const result = groupScenariosByPhase([])
    expect(result).toEqual([])
  })

  test('groups scenarios by phase in correct order', () => {
    const scenarios = [
      { ...mapped(SCENARIO_MATCH_END) },
      { ...mapped(SCENARIO_TOSS) },
      { ...mapped(SCENARIO_FIRST_WICKET) },
    ]

    const result = groupScenariosByPhase(scenarios)

    expect(result).toHaveLength(3)
    // Should be ordered: toss, first_wicket, end
    expect(result[0]!.phase).toBe('toss')
    expect(result[0]!.label).toBe('TOSS')
    expect(result[0]!.scenarios).toHaveLength(1)

    expect(result[1]!.phase).toBe('first_wicket')
    expect(result[1]!.label).toBe('FIRST WICKET')
    expect(result[1]!.scenarios).toHaveLength(1)

    expect(result[2]!.phase).toBe('end')
    expect(result[2]!.label).toBe('MATCH END')
    expect(result[2]!.scenarios).toHaveLength(1)
  })

  test('multiple scenarios in same phase are grouped together', () => {
    const scenarios = [
      { ...mapped(SCENARIO_TOSS) },
      {
        ...mapped(SCENARIO_TOSS),
        id: 'scenario-extra',
        title: 'Toss decision?',
        sortOrder: 2,
      },
    ]

    const result = groupScenariosByPhase(scenarios)

    expect(result).toHaveLength(1)
    expect(result[0]!.phase).toBe('toss')
    expect(result[0]!.scenarios).toHaveLength(2)
  })

  test('omits phases with no scenarios', () => {
    const scenarios = [{ ...mapped(SCENARIO_MATCH_END) }]

    const result = groupScenariosByPhase(scenarios)

    expect(result).toHaveLength(1)
    expect(result[0]!.phase).toBe('end')
  })
})

// ---------------------------------------------------------------------------
// Helper to convert raw DB row shape to mapped FixtureScenarioRow shape
// ---------------------------------------------------------------------------

function mapped(raw: {
  id: string
  fixture_id: string
  title: string
  input_type: string
  options: string[] | null
  resolution_phase: string
  correct_answer: string | null
  points: number
}): FixtureScenarioRow {
  return {
    id: raw.id,
    fixtureId: raw.fixture_id,
    title: raw.title,
    inputType: raw.input_type as FixtureScenarioRow['inputType'],
    options: raw.options,
    resolutionPhase: raw.resolution_phase as FixtureScenarioRow['resolutionPhase'],
    correctAnswer: raw.correct_answer,
    points: raw.points,
  }
}

// ---------------------------------------------------------------------------
// Tests — getMatchPredictions
// ---------------------------------------------------------------------------

function makeLeaderboardEntry(
  overrides: Partial<MatchLeaderboardEntry> & { userId: string },
): MatchLeaderboardEntry {
  return {
    predictedCount: 3,
    resolvedCount: 0,
    correctCount: 0,
    pointsEarned: 0,
    rank: 1,
    lastSubmittedAt: null,
    displayName: 'Player',
    avatarUrl: null,
    memberStatus: 'approved',
    ...overrides,
  }
}

/** Raw v2_fixture_scenarios row shape for `getMatchPredictions`. */
const RAW_SCENARIO_TOSS = {
  id: 'scenario-1',
  fixture_id: 'fixture-1',
  title: 'Who will win the toss?',
  description: null,
  input_type: 'team_pick' as const,
  options: null,
  points: 10,
  resolution_phase: 'toss' as const,
  correct_answer: 'team-mi',
  is_resolved: true,
  is_voided: false,
  sort_order: 1,
}

const RAW_SCENARIO_FIRST_WICKET = {
  id: 'scenario-2',
  fixture_id: 'fixture-1',
  title: 'First wicket in which over?',
  description: null,
  input_type: 'range' as const,
  options: null,
  points: 15,
  resolution_phase: 'first_wicket' as const,
  correct_answer: null,
  is_resolved: false,
  is_voided: false,
  sort_order: 2,
}

const RAW_SCENARIO_VOIDED = {
  id: 'scenario-3',
  fixture_id: 'fixture-1',
  title: 'Man of the match?',
  description: null,
  input_type: 'player_pick' as const,
  options: null,
  points: 25,
  resolution_phase: 'post_match' as const,
  correct_answer: null,
  is_resolved: false,
  is_voided: true,
  sort_order: 5,
}

describe('getMatchPredictions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scenariosResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }
    playersResult = { data: [], error: null }
    gangLeagueSeasonResult = { data: null, error: null }
    leagueTeamsResult = { data: [], error: null }
    leaguePlayersResult = { data: [], error: null }
    mockGetMatchLeaderboard.mockReset()
    mockGetMatchLeaderboard.mockResolvedValue([])
  })

  test('returns empty structure when there are no members', async () => {
    mockGetMatchLeaderboard.mockResolvedValue([])
    scenariosResult = { data: [], error: null }
    predictionsResult = { data: [], error: null }

    const result = await getMatchPredictions('gang-1', 'fixture-1')

    expect(result.members).toEqual([])
    expect(result.phases).toEqual([])
    expect(result.teamsById).toEqual({})
    expect(result.playersById).toEqual({})
    expect(result.predictionsByScenarioByUser.size).toBe(0)
    expect(mockGetMatchLeaderboard).toHaveBeenCalledWith('gang-1', 'fixture-1')
  })

  test('returns phases and scenario matrix when data exists', async () => {
    mockGetMatchLeaderboard.mockResolvedValue([
      makeLeaderboardEntry({
        userId: 'user-1',
        displayName: 'Alice',
        avatarUrl: null,
        rank: 1,
      }),
      makeLeaderboardEntry({
        userId: 'user-2',
        displayName: 'Bob',
        avatarUrl: null,
        rank: 2,
      }),
    ])

    scenariosResult = {
      data: [RAW_SCENARIO_TOSS, RAW_SCENARIO_FIRST_WICKET],
      error: null,
    }

    predictionsResult = {
      data: [
        {
          user_id: 'user-1',
          scenario_id: 'scenario-1',
          value: 'team-mi',
          is_correct: true,
          points_earned: 10,
        },
        {
          user_id: 'user-2',
          scenario_id: 'scenario-1',
          value: 'team-csk',
          is_correct: false,
          points_earned: 0,
        },
        {
          user_id: 'user-1',
          scenario_id: 'scenario-2',
          value: '3-4',
          is_correct: null,
          points_earned: 0,
        },
      ],
      error: null,
    }

    leagueTeamsResult = {
      data: [
        { id: 'team-mi', code: 'MI', name: 'Mumbai Indians', color: '#004BA0' },
        { id: 'team-csk', code: 'CSK', name: 'Chennai Super Kings', color: '#FDB913' },
      ],
      error: null,
    }

    const result = await getMatchPredictions('gang-1', 'fixture-1')

    // Members ordered by leaderboard rank
    expect(result.members).toHaveLength(2)
    expect(result.members[0]).toMatchObject({
      userId: 'user-1',
      displayName: 'Alice',
      rank: 1,
    })
    expect(result.members[1]).toMatchObject({
      userId: 'user-2',
      displayName: 'Bob',
      rank: 2,
    })

    // Phases grouped in order
    expect(result.phases).toHaveLength(2)
    expect(result.phases[0]?.phase).toBe('toss')
    expect(result.phases[0]?.label).toBe('TOSS')
    expect(result.phases[0]?.scenarios).toHaveLength(1)
    expect(result.phases[0]?.scenarios[0]).toMatchObject({
      id: 'scenario-1',
      title: 'Who will win the toss?',
      points: 10,
      inputType: 'team_pick',
      correctAnswer: 'team-mi',
      isResolved: true,
      isVoided: false,
    })
    expect(result.phases[1]?.phase).toBe('first_wicket')
    expect(result.phases[1]?.scenarios[0]?.isResolved).toBe(false)

    // Predictions map
    const tossCells = result.predictionsByScenarioByUser.get('scenario-1')
    expect(tossCells?.get('user-1')).toEqual({
      value: 'team-mi',
      isCorrect: true,
      pointsEarned: 10,
    })
    expect(tossCells?.get('user-2')).toEqual({
      value: 'team-csk',
      isCorrect: false,
      pointsEarned: 0,
    })

    const firstWicketCells = result.predictionsByScenarioByUser.get('scenario-2')
    expect(firstWicketCells?.get('user-1')).toEqual({
      value: '3-4',
      isCorrect: null,
      pointsEarned: 0,
    })
    expect(firstWicketCells?.get('user-2')).toBeUndefined()

    // Teams resolved
    expect(result.teamsById['team-mi']).toEqual({
      code: 'MI',
      name: 'Mumbai Indians',
      color: '#004BA0',
    })
    expect(result.teamsById['team-csk']).toEqual({
      code: 'CSK',
      name: 'Chennai Super Kings',
      color: '#FDB913',
    })

    // No players in this test
    expect(Object.keys(result.playersById)).toHaveLength(0)
  })

  test('resolves player UUIDs via v2_players batch lookup', async () => {
    mockGetMatchLeaderboard.mockResolvedValue([
      makeLeaderboardEntry({ userId: 'user-1', displayName: 'Alice' }),
    ])

    scenariosResult = {
      data: [
        {
          ...RAW_SCENARIO_VOIDED,
          is_voided: false,
          is_resolved: true,
          correct_answer: 'player-1',
        },
      ],
      error: null,
    }

    predictionsResult = {
      data: [
        {
          user_id: 'user-1',
          scenario_id: 'scenario-3',
          value: 'player-2',
          is_correct: false,
          points_earned: 0,
        },
      ],
      error: null,
    }

    leaguePlayersResult = {
      data: [
        { id: 'player-1', name: 'Rohit Sharma' },
        { id: 'player-2', name: 'MS Dhoni' },
      ],
      error: null,
    }

    const result = await getMatchPredictions('gang-1', 'fixture-1')

    expect(result.playersById['player-1']).toEqual({ name: 'Rohit Sharma' })
    expect(result.playersById['player-2']).toEqual({ name: 'MS Dhoni' })
  })

  test('preserves voided scenarios in the output', async () => {
    mockGetMatchLeaderboard.mockResolvedValue([
      makeLeaderboardEntry({ userId: 'user-1', displayName: 'Alice' }),
    ])

    scenariosResult = { data: [RAW_SCENARIO_VOIDED], error: null }
    predictionsResult = {
      data: [
        {
          user_id: 'user-1',
          scenario_id: 'scenario-3',
          value: 'player-7',
          is_correct: null,
          points_earned: 0,
        },
      ],
      error: null,
    }
    leaguePlayersResult = {
      data: [{ id: 'player-7', name: 'Some Player' }],
      error: null,
    }

    const result = await getMatchPredictions('gang-1', 'fixture-1')

    expect(result.phases).toHaveLength(1)
    expect(result.phases[0]?.scenarios[0]?.isVoided).toBe(true)
    expect(result.phases[0]?.scenarios[0]?.isResolved).toBe(false)
  })

  test('throws when scenarios query errors', async () => {
    mockGetMatchLeaderboard.mockResolvedValue([
      makeLeaderboardEntry({ userId: 'user-1' }),
    ])
    scenariosResult = { data: null, error: { message: 'scenarios fail', code: '500' } }

    await expect(getMatchPredictions('gang-1', 'fixture-1')).rejects.toEqual(
      expect.objectContaining({ message: 'scenarios fail' }),
    )
  })

  test('throws when predictions query errors', async () => {
    mockGetMatchLeaderboard.mockResolvedValue([
      makeLeaderboardEntry({ userId: 'user-1' }),
    ])
    scenariosResult = { data: [RAW_SCENARIO_TOSS], error: null }
    predictionsResult = {
      data: null,
      error: { message: 'predictions fail', code: '500' },
    }
    leagueTeamsResult = {
      data: [{ id: 'team-mi', code: 'MI', name: 'Mumbai Indians', color: '#004BA0' }],
      error: null,
    }

    await expect(getMatchPredictions('gang-1', 'fixture-1')).rejects.toEqual(
      expect.objectContaining({ message: 'predictions fail' }),
    )
  })

  test('skips team/player lookup when no UUIDs to resolve', async () => {
    mockGetMatchLeaderboard.mockResolvedValue([
      makeLeaderboardEntry({ userId: 'user-1' }),
    ])
    scenariosResult = {
      data: [
        {
          ...RAW_SCENARIO_FIRST_WICKET,
          // range only, no team/player UUIDs
        },
      ],
      error: null,
    }
    predictionsResult = {
      data: [
        {
          user_id: 'user-1',
          scenario_id: 'scenario-2',
          value: '3-4',
          is_correct: null,
          points_earned: 0,
        },
      ],
      error: null,
    }

    const result = await getMatchPredictions('gang-1', 'fixture-1')

    expect(result.teamsById).toEqual({})
    expect(result.playersById).toEqual({})
    expect(mockFrom).not.toHaveBeenCalledWith('v2_league_teams')
    expect(mockFrom).not.toHaveBeenCalledWith('v2_players')
  })

  test('handles solo member with no predictions', async () => {
    mockGetMatchLeaderboard.mockResolvedValue([
      makeLeaderboardEntry({ userId: 'user-1', displayName: 'Lonely', rank: 1 }),
    ])
    scenariosResult = { data: [RAW_SCENARIO_TOSS], error: null }
    predictionsResult = { data: [], error: null }
    leagueTeamsResult = {
      data: [{ id: 'team-mi', code: 'MI', name: 'Mumbai Indians', color: '#004BA0' }],
      error: null,
    }

    const result = await getMatchPredictions('gang-1', 'fixture-1')

    expect(result.members).toHaveLength(1)
    expect(result.phases).toHaveLength(1)
    // No predictions map entries since no predictions
    const tossCells = result.predictionsByScenarioByUser.get('scenario-1')
    expect(tossCells?.size ?? 0).toBe(0)
  })
})

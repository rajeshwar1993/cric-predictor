import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { FixtureScenarioRow } from './predictions'

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
      return chainBuilder({ data: null, error: null })
    },
  })),
}))

// Import after mocks
const {
  getFixtureScenarios,
  getUserPredictions,
  getMatchPlayers,
  getGangLeagueSeason,
  groupScenariosByPhase,
} = await import('./predictions')

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const SCENARIO_TOSS = {
  id: 'scenario-1',
  fixture_id: 'fixture-1',
  title: 'Who will win the toss?',
  description: null,
  input_type: 'team_select' as const,
  options: null,
  resolution_phase: 'toss' as const,
  correct_answer: null,
  points_weight: 10,
  sort_order: 1,
}

const SCENARIO_FIRST_WICKET = {
  id: 'scenario-2',
  fixture_id: 'fixture-1',
  title: 'First wicket in which over?',
  description: 'Predict the over when the first wicket falls',
  input_type: 'over_range' as const,
  options: ['1-2', '3-4', '5-6', '7+'],
  resolution_phase: 'first_wicket' as const,
  correct_answer: null,
  points_weight: 15,
  sort_order: 2,
}

const SCENARIO_MATCH_END = {
  id: 'scenario-3',
  fixture_id: 'fixture-1',
  title: 'Who will win the match?',
  description: null,
  input_type: 'team_select' as const,
  options: null,
  resolution_phase: 'end' as const,
  correct_answer: null,
  points_weight: 20,
  sort_order: 10,
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

    const result = await getFixtureScenarios('fixture-1')

    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('v2_fixture_scenarios')
  })

  test('returns mapped scenarios when data exists', async () => {
    scenariosResult = {
      data: [SCENARIO_TOSS, SCENARIO_FIRST_WICKET],
      error: null,
    }

    const result = await getFixtureScenarios('fixture-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'scenario-1',
      fixtureId: 'fixture-1',
      title: 'Who will win the toss?',
      description: null,
      inputType: 'team_select',
      options: null,
      resolutionPhase: 'toss',
      correctAnswer: null,
      pointsWeight: 10,
      sortOrder: 1,
    })
    expect(result[1]).toEqual({
      id: 'scenario-2',
      fixtureId: 'fixture-1',
      title: 'First wicket in which over?',
      description: 'Predict the over when the first wicket falls',
      inputType: 'over_range',
      options: ['1-2', '3-4', '5-6', '7+'],
      resolutionPhase: 'first_wicket',
      correctAnswer: null,
      pointsWeight: 15,
      sortOrder: 2,
    })
  })

  test('throws on database error', async () => {
    scenariosResult = { data: null, error: { message: 'DB error', code: '500' } }

    await expect(getFixtureScenarios('fixture-1')).rejects.toEqual({
      message: 'DB error',
      code: '500',
    })
  })

  test('returns empty array when data is null', async () => {
    scenariosResult = { data: null, error: null }

    const result = await getFixtureScenarios('fixture-1')
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
          answer: 'team-mi',
          updated_at: '2026-04-09T10:00:00Z',
        },
        {
          id: 'pred-2',
          scenario_id: 'scenario-2',
          answer: '3-4',
          updated_at: '2026-04-09T10:00:00Z',
        },
      ],
      error: null,
    }

    const result = await getUserPredictions('gang-1', 'fixture-1', 'user-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'pred-1',
      scenarioId: 'scenario-1',
      answer: 'team-mi',
      updatedAt: '2026-04-09T10:00:00Z',
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
  description: string | null
  input_type: string
  options: string[] | null
  resolution_phase: string
  correct_answer: string | null
  points_weight: number
  sort_order: number
}): FixtureScenarioRow {
  return {
    id: raw.id,
    fixtureId: raw.fixture_id,
    title: raw.title,
    description: raw.description,
    inputType: raw.input_type as FixtureScenarioRow['inputType'],
    options: raw.options,
    resolutionPhase: raw.resolution_phase as FixtureScenarioRow['resolutionPhase'],
    correctAnswer: raw.correct_answer,
    pointsWeight: raw.points_weight,
    sortOrder: raw.sort_order,
  }
}

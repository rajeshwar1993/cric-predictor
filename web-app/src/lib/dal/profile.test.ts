import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — chainable builder that returns per-table results
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()

/**
 * Build a chainable mock that records every method call and resolves to
 * `resolvedValue` at the end of the chain.
 *
 * The `then` method delegates to a real `Promise.resolve(...).then(fn)` so
 * the mock behaves exactly like an actual thenable. Returning the raw
 * `fn(resolvedValue)` would break chained `.then()`/`.catch()` handlers
 * and cause rejected-value tests to silently swallow the error.
 */
function chainBuilder(resolvedValue: {
  data?: unknown
  error: unknown
  count?: number | null
}) {
  const chain = {
    select(..._args: unknown[]) {
      return chain
    },
    eq(..._args: unknown[]) {
      return chain
    },
    // Make it thenable so `await` resolves it — delegate to a real Promise
    // so all Promise semantics (chaining, rejection, microtask order) work.
    then(
      fn: (v: { data?: unknown; error: unknown; count?: number | null }) => unknown,
    ) {
      return Promise.resolve(resolvedValue).then(fn)
    },
  }
  return chain
}

/** Per-table query results. */
let tableResults: Map<
  string,
  { data?: unknown; error: unknown; count?: number | null }
>

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      mockFrom(table)
      const result = tableResults.get(table) ?? { data: [], error: null }
      return chainBuilder(result)
    },
  })),
}))

// Import after mocks
const { getProfileStats } = await import('./profile')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getProfileStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tableResults = new Map()
  })

  test('returns all zeros for a brand-new user with no gangs and no standings', async () => {
    tableResults.set('v2_gang_members', { count: 0, error: null })
    tableResults.set('v2_gang_season_standings', { data: [], error: null })

    const result = await getProfileStats('user-1')

    expect(result).toEqual({
      gangsCount: 0,
      totalPredicted: 0,
      accuracy: 0,
      totalPoints: 0,
    })
  })

  test('handles null data (no standings) as zeros', async () => {
    tableResults.set('v2_gang_members', { count: 2, error: null })
    tableResults.set('v2_gang_season_standings', { data: null, error: null })

    const result = await getProfileStats('user-1')

    expect(result).toEqual({
      gangsCount: 2,
      totalPredicted: 0,
      accuracy: 0,
      totalPoints: 0,
    })
  })

  test('handles null count as 0 gangs', async () => {
    tableResults.set('v2_gang_members', { count: null, error: null })
    tableResults.set('v2_gang_season_standings', { data: [], error: null })

    const result = await getProfileStats('user-1')

    expect(result.gangsCount).toBe(0)
  })

  test('sums totals across multiple gangs', async () => {
    tableResults.set('v2_gang_members', { count: 3, error: null })
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          total_points: 50,
          matches_predicted: 10,
          total_correct: 7,
          total_resolved: 10,
        },
        {
          total_points: 30,
          matches_predicted: 6,
          total_correct: 4,
          total_resolved: 6,
        },
        {
          total_points: 20,
          matches_predicted: 4,
          total_correct: 3,
          total_resolved: 4,
        },
      ],
      error: null,
    })

    const result = await getProfileStats('user-1')

    expect(result.gangsCount).toBe(3)
    expect(result.totalPoints).toBe(100)
    expect(result.totalPredicted).toBe(20)
    // 14 correct / 20 resolved = 70%
    expect(result.accuracy).toBe(70)
  })

  test('returns accuracy 0 when totalResolved is 0 (division-by-zero guard)', async () => {
    tableResults.set('v2_gang_members', { count: 1, error: null })
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          total_points: 0,
          matches_predicted: 5,
          total_correct: 0,
          total_resolved: 0,
        },
      ],
      error: null,
    })

    const result = await getProfileStats('user-1')

    expect(result.accuracy).toBe(0)
    expect(result.totalPredicted).toBe(5)
    expect(result.totalPoints).toBe(0)
  })

  test('computes accuracy correctly with a single gang', async () => {
    tableResults.set('v2_gang_members', { count: 1, error: null })
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          total_points: 85,
          matches_predicted: 20,
          total_correct: 17,
          total_resolved: 20,
        },
      ],
      error: null,
    })

    const result = await getProfileStats('user-1')

    // 17/20 = 85%
    expect(result.accuracy).toBe(85)
  })

  test('tolerates null numeric fields inside standings rows', async () => {
    tableResults.set('v2_gang_members', { count: 1, error: null })
    tableResults.set('v2_gang_season_standings', {
      data: [
        {
          total_points: null,
          matches_predicted: null,
          total_correct: null,
          total_resolved: null,
        },
        {
          total_points: 10,
          matches_predicted: 2,
          total_correct: 1,
          total_resolved: 2,
        },
      ],
      error: null,
    })

    const result = await getProfileStats('user-1')

    expect(result.totalPoints).toBe(10)
    expect(result.totalPredicted).toBe(2)
    // 1/2 = 50%
    expect(result.accuracy).toBe(50)
  })

  test('throws when the gang-members query fails', async () => {
    const originalError = { message: 'db error' }
    tableResults.set('v2_gang_members', {
      count: null,
      error: originalError,
    })
    tableResults.set('v2_gang_season_standings', { data: [], error: null })

    // Expect an Error instance (not a POJO) so middleware / error
    // boundaries get a proper stack trace. The original Supabase error
    // is attached as the `cause`.
    await expect(getProfileStats('user-1')).rejects.toBeInstanceOf(Error)
    await expect(getProfileStats('user-1')).rejects.toThrow(/db error/)
  })

  test('throws when the standings query fails', async () => {
    const originalError = { message: 'db error' }
    tableResults.set('v2_gang_members', { count: 1, error: null })
    tableResults.set('v2_gang_season_standings', {
      data: null,
      error: originalError,
    })

    await expect(getProfileStats('user-1')).rejects.toBeInstanceOf(Error)
    await expect(getProfileStats('user-1')).rejects.toThrow(/db error/)
  })

  test('queries both tables', async () => {
    tableResults.set('v2_gang_members', { count: 0, error: null })
    tableResults.set('v2_gang_season_standings', { data: [], error: null })

    await getProfileStats('user-1')

    expect(mockFrom).toHaveBeenCalledWith('v2_gang_members')
    expect(mockFrom).toHaveBeenCalledWith('v2_gang_season_standings')
  })
})

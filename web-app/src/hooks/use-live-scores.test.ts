import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useLiveScores } from './use-live-scores'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    from: mockFrom,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXTURE_ID = 'fixture-123'

function makeLiveScoreData(overrides: Record<string, unknown> = {}) {
  return {
    fixture_id: FIXTURE_ID,
    home_team_score: '186/4',
    away_team_score: '142/3',
    home_team_overs: 20,
    away_team_overs: 15.4,
    batting_team_id: 'team-away',
    current_run_rate: 9.3,
    last_6_balls: '1 4 W 0 6 2',
    striker_name: 'Rohit',
    striker_score: '45(32)',
    non_striker_name: 'Ishan',
    non_striker_score: '23(18)',
    current_bowler: 'Bumrah',
    current_partnership: '78(52)',
    raw_scorecard_json: null,
    last_polled_at: new Date().toISOString(),
    home_team_max_overs_seen: 20,
    away_team_max_overs_seen: 15.4,
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLiveScores', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()

    // Default: return valid data
    mockSingle.mockResolvedValue({ data: makeLiveScoreData(), error: null })

    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches live scores on mount', async () => {
    const { result } = renderHook(() => useLiveScores(FIXTURE_ID))

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).not.toBeNull()
    expect(result.current.data?.home_team_score).toBe('186/4')
    expect(result.current.error).toBeNull()
    expect(result.current.isStale).toBe(false)
  })

  it('queries the correct table and fixture_id', async () => {
    renderHook(() => useLiveScores(FIXTURE_ID))

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('v2_fixture_live_scores')
    })
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('fixture_id', FIXTURE_ID)
  })

  it('polls every 15 seconds', async () => {
    const { result } = renderHook(() => useLiveScores(FIXTURE_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // First call on mount
    expect(mockSingle).toHaveBeenCalledTimes(1)

    // Advance by 15 seconds
    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    await waitFor(() => {
      expect(mockSingle).toHaveBeenCalledTimes(2)
    })
  })

  it('reports isStale when last_polled_at is older than 1 minute', async () => {
    const staleTime = new Date(Date.now() - 2 * 60_000).toISOString()
    mockSingle.mockResolvedValue({
      data: makeLiveScoreData({ last_polled_at: staleTime }),
      error: null,
    })

    const { result } = renderHook(() => useLiveScores(FIXTURE_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isStale).toBe(true)
  })

  it('reports isStale=false when last_polled_at is within 1 minute', async () => {
    const freshTime = new Date(Date.now() - 30_000).toISOString()
    mockSingle.mockResolvedValue({
      data: makeLiveScoreData({ last_polled_at: freshTime }),
      error: null,
    })

    const { result } = renderHook(() => useLiveScores(FIXTURE_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isStale).toBe(false)
  })

  it('handles fetch error gracefully', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: '500', message: 'Server error' },
    })

    const { result } = renderHook(() => useLiveScores(FIXTURE_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Server error')
    expect(result.current.data).toBeNull()
  })

  it('treats PGRST116 (no rows) as null data, not an error', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    const { result } = renderHook(() => useLiveScores(FIXTURE_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('does not poll when tab is hidden', async () => {
    const { result } = renderHook(() => useLiveScores(FIXTURE_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Make tab hidden
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })

    const callCountBeforeInterval = mockSingle.mock.calls.length

    // Advance timer — should NOT trigger poll
    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    expect(mockSingle).toHaveBeenCalledTimes(callCountBeforeInterval)
  })

  it('clears interval on unmount', async () => {
    const { result, unmount } = renderHook(() => useLiveScores(FIXTURE_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const callCountBeforeUnmount = mockSingle.mock.calls.length
    unmount()

    // Advance timer — should NOT trigger more polls
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    expect(mockSingle).toHaveBeenCalledTimes(callCountBeforeUnmount)
  })
})

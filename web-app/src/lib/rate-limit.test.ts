import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// Mock server-only to avoid the build guard in test environment
vi.mock('server-only', () => ({}))

// Mock the Supabase server client
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockSingle = vi.fn()

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    }),
  ),
}))

// Mock analytics to verify RATE_LIMIT_HIT event is fired
const mockTrackEvent = vi.fn()
vi.mock('@/lib/analytics/server', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

import { rateLimit } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T12:00:00Z'))

    // Reset mocks
    vi.clearAllMocks()

    // Default chain for select query
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, single: mockSingle })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('allows request when under the limit (no existing row)', async () => {
    // No existing row
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    // Insert returns count = 1
    mockInsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { count: 1 }, error: null }),
      }),
    })

    const result = await rateLimit('user-1', 'magic_link', {
      max: 5,
      windowSeconds: 60,
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('allows request when under the limit (existing row)', async () => {
    // Existing row with count = 2
    mockMaybeSingle.mockResolvedValue({ data: { count: 2 }, error: null })

    // Update returns count = 3
    mockUpdate.mockReturnValue({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { count: 3 }, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await rateLimit('user-1', 'magic_link', {
      max: 5,
      windowSeconds: 60,
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('denies request when at the limit', async () => {
    // Existing row with count = 5 (at max)
    mockMaybeSingle.mockResolvedValue({ data: { count: 5 }, error: null })

    // Update returns count = 6
    mockUpdate.mockReturnValue({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { count: 6 }, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await rateLimit('user-1', 'magic_link', {
      max: 5,
      windowSeconds: 60,
    })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  test('fires RATE_LIMIT_HIT event when exceeded', async () => {
    // Existing row with count = 5
    mockMaybeSingle.mockResolvedValue({ data: { count: 5 }, error: null })

    // Update returns count = 6
    mockUpdate.mockReturnValue({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { count: 6 }, error: null }),
            }),
          }),
        }),
      }),
    })

    await rateLimit('user-1', 'magic_link', {
      max: 5,
      windowSeconds: 60,
    })

    expect(mockTrackEvent).toHaveBeenCalledWith('user-1', 'rate_limit_hit', {
      action: 'magic_link',
      max: 5,
      window_seconds: 60,
      count: 6,
    })
  })

  test('returns remaining = 0 when over the limit', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { count: 10 }, error: null })

    mockUpdate.mockReturnValue({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { count: 11 }, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await rateLimit('user-1', 'magic_link', {
      max: 5,
      windowSeconds: 60,
    })

    expect(result.remaining).toBe(0)
  })

  test('allows exactly at the max count', async () => {
    // First request in a fresh window
    mockMaybeSingle.mockResolvedValue({ data: { count: 4 }, error: null })

    // Update to count = 5 (which equals max)
    mockUpdate.mockReturnValue({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { count: 5 }, error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await rateLimit('user-1', 'magic_link', {
      max: 5,
      windowSeconds: 60,
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })
})

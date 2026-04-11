import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ANALYTICS_EVENTS } from './events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

const mockTrackEvent = vi.fn()

vi.mock('./server', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

// Import after the mock is set up so withTiming binds the mocked trackEvent.
const { withTiming } = await import('./timing')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('withTiming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the wrapped function result on success', async () => {
    const result = await withTiming('myAction', 'user-123', async () => 'ok')
    expect(result).toBe('ok')
  })

  test('fires SERVER_ACTION_DURATION with action_name and duration_ms on success', async () => {
    await withTiming('createGang', 'user-123', async () => {
      // Simulate ~50ms of work
      vi.advanceTimersByTime(50)
      return { success: true }
    })

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-123',
      ANALYTICS_EVENTS.SERVER_ACTION_DURATION,
      expect.objectContaining({
        action_name: 'createGang',
        duration_ms: expect.any(Number),
      }),
    )

    const firstCall = mockTrackEvent.mock.calls[0]!
    const props = firstCall[2] as { duration_ms: number }
    expect(props.duration_ms).toBeGreaterThanOrEqual(50)
  })

  test('still fires SERVER_ACTION_DURATION when the wrapped function throws', async () => {
    const boom = new Error('boom')

    await expect(
      withTiming('failingAction', 'user-456', async () => {
        vi.advanceTimersByTime(20)
        throw boom
      }),
    ).rejects.toThrow('boom')

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-456',
      ANALYTICS_EVENTS.SERVER_ACTION_DURATION,
      expect.objectContaining({
        action_name: 'failingAction',
        duration_ms: expect.any(Number),
      }),
    )

    const firstCall = mockTrackEvent.mock.calls[0]!
    const props = firstCall[2] as { duration_ms: number }
    expect(props.duration_ms).toBeGreaterThanOrEqual(20)
  })

  test('uses the provided actionName as the event property', async () => {
    await withTiming('updateDisplayName', 'user-789', async () => 'done')

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'user-789',
      ANALYTICS_EVENTS.SERVER_ACTION_DURATION,
      expect.objectContaining({ action_name: 'updateDisplayName' }),
    )
  })

  test('uses the provided userId as the distinctId', async () => {
    await withTiming('myAction', 'specific-user-id', async () => 'ok')

    const firstCall = mockTrackEvent.mock.calls[0]!
    expect(firstCall[0]).toBe('specific-user-id')
  })

  test('preserves the wrapped function return type', async () => {
    const result = await withTiming<{ count: number }>(
      'myAction',
      'user-123',
      async () => ({ count: 42 }),
    )
    expect(result).toEqual({ count: 42 })
  })
})

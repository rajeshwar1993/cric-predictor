import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ANALYTICS_EVENTS } from './events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

const mockCapture = vi.fn()
const mockIdentify = vi.fn()
const mockFlush = vi.fn().mockResolvedValue(undefined)
const mockShutdown = vi.fn().mockResolvedValue(undefined)

vi.mock('posthog-node', () => {
  // posthog-node is consumed via `new PostHog(...)`. Vitest hoists vi.mock,
  // so we declare a real class here that closes over the spies above.
  class PostHog {
    capture(...args: unknown[]) {
      mockCapture(...args)
    }
    identify(...args: unknown[]) {
      mockIdentify(...args)
    }
    flush() {
      return mockFlush()
    }
    shutdown() {
      return mockShutdown()
    }
  }
  return { PostHog }
})

// Set the env var BEFORE importing server.ts so the lazy singleton init
// sees the key. The production code reads `process.env.NEXT_PUBLIC_POSTHOG_KEY`
// directly so it works on serverless without an `env.ts` round-trip.
process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com'

const { trackEvent, captureServerError } = await import('./server')

// ---------------------------------------------------------------------------
// trackEvent
// ---------------------------------------------------------------------------

describe('trackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('forwards distinctId, event, and properties to posthog.capture', async () => {
    await trackEvent('user-1', ANALYTICS_EVENTS.GANG_CREATED, { gang_name: 'Bulls' })

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-1',
      event: ANALYTICS_EVENTS.GANG_CREATED,
      properties: { gang_name: 'Bulls' },
    })
  })

  test('works without properties', async () => {
    await trackEvent('user-1', ANALYTICS_EVENTS.SIGNED_OUT)

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-1',
      event: ANALYTICS_EVENTS.SIGNED_OUT,
      properties: undefined,
    })
  })

  test('calls capture synchronously inside the trackEvent stack (R-001)', async () => {
    // The capture call must run before any await — that's how the
    // production fix guarantees the event is queued before the lambda
    // freezes. Calling trackEvent without awaiting it should still
    // produce a synchronous capture call.
    const promise = trackEvent('user-2', ANALYTICS_EVENTS.SIGNED_OUT)
    expect(mockCapture).toHaveBeenCalledTimes(1)
    await promise
  })

  test('flushes after capture so serverless invocations push the event before suspending', async () => {
    await trackEvent('user-1', ANALYTICS_EVENTS.SIGNED_OUT)

    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockFlush).toHaveBeenCalledTimes(1)
  })

  test('swallows flush errors so analytics never break action flow', async () => {
    mockFlush.mockRejectedValueOnce(new Error('network down'))

    await expect(
      trackEvent('user-1', ANALYTICS_EVENTS.SIGNED_OUT),
    ).resolves.toBeUndefined()

    expect(mockCapture).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// captureServerError
// ---------------------------------------------------------------------------

describe('captureServerError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('forwards Error message, stack, source, and metadata', async () => {
    const error = new Error('something failed')
    await captureServerError('user-123', error, {
      source: 'createGang',
      metadata: { gang_name: 'Bulls' },
    })

    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'user-123',
        event: ANALYTICS_EVENTS.ERROR_LOGGED,
        properties: expect.objectContaining({
          error_message: 'something failed',
          error_stack: expect.any(String),
          source: 'createGang',
          gang_name: 'Bulls',
        }),
      }),
    )
  })

  test('handles non-Error values by stringifying them', async () => {
    await captureServerError('user-1', 'string error', { source: 'someAction' })

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          error_message: 'string error',
          error_stack: undefined,
          source: 'someAction',
        }),
      }),
    )
  })

  test('captures error without metadata', async () => {
    const error = new Error('boom')
    await captureServerError('user-1', error, { source: 'withoutMeta' })

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          source: 'withoutMeta',
          error_message: 'boom',
        }),
      }),
    )
  })

  test('uses provided userId as distinctId', async () => {
    await captureServerError('specific-user', new Error('boom'), {
      source: 'src',
    })
    const firstCall = mockCapture.mock.calls[0]!
    const payload = firstCall[0] as { distinctId: string }
    expect(payload.distinctId).toBe('specific-user')
  })
})

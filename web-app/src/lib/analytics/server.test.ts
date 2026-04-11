import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ANALYTICS_EVENTS } from './events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

const mockCapture = vi.fn()
const mockIdentify = vi.fn()
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
    shutdown() {
      return mockShutdown()
    }
  }
  return { PostHog }
})

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: 'test-key',
    NEXT_PUBLIC_POSTHOG_HOST: 'https://test.posthog.com',
  },
}))

const { trackEvent, captureServerError } = await import('./server')

// ---------------------------------------------------------------------------
// trackEvent
// ---------------------------------------------------------------------------

describe('trackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('forwards distinctId, event, and properties to posthog.capture', () => {
    trackEvent('user-1', ANALYTICS_EVENTS.GANG_CREATED, { gang_name: 'Bulls' })

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-1',
      event: ANALYTICS_EVENTS.GANG_CREATED,
      properties: { gang_name: 'Bulls' },
    })
  })

  test('works without properties', () => {
    trackEvent('user-1', ANALYTICS_EVENTS.SIGNED_OUT)

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-1',
      event: ANALYTICS_EVENTS.SIGNED_OUT,
      properties: undefined,
    })
  })
})

// ---------------------------------------------------------------------------
// captureServerError
// ---------------------------------------------------------------------------

describe('captureServerError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('forwards Error message, stack, source, and metadata', () => {
    const error = new Error('something failed')
    captureServerError('user-123', error, {
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

  test('handles non-Error values by stringifying them', () => {
    captureServerError('user-1', 'string error', { source: 'someAction' })

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

  test('captures error without metadata', () => {
    const error = new Error('boom')
    captureServerError('user-1', error, { source: 'withoutMeta' })

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          source: 'withoutMeta',
          error_message: 'boom',
        }),
      }),
    )
  })

  test('uses provided userId as distinctId', () => {
    captureServerError('specific-user', new Error('boom'), {
      source: 'src',
    })
    const firstCall = mockCapture.mock.calls[0]!
    const payload = firstCall[0] as { distinctId: string }
    expect(payload.distinctId).toBe('specific-user')
  })
})

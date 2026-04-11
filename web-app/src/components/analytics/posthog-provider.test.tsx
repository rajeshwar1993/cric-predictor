import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
//
// We mock both posthog-js and posthog-js/react so the module-level
// `posthog.init()` call inside `PHProvider` is a no-op in jsdom. The
// production code already guards top-level init with
// `process.env.NODE_ENV !== 'test'`, but the mock is the second line of
// defense — and it lets us assert nothing leaks into a real PostHog client.

const mockPosthogInit = vi.fn()
const mockPosthogCapture = vi.fn()
const mockPosthogIdentify = vi.fn()

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => mockPosthogInit(...args),
    capture: (...args: unknown[]) => mockPosthogCapture(...args),
    identify: (...args: unknown[]) => mockPosthogIdentify(...args),
    __loaded: true,
  },
}))

vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockCaptureError = vi.fn()

vi.mock('@/lib/analytics/error-handler', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}))

// Import after mocks
const { PHProvider } = await import('./posthog-provider')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PHProvider — global error listeners', () => {
  beforeEach(() => {
    // Vitest does NOT auto-call @testing-library cleanup between tests.
    // Without an explicit cleanup, the previous test's PHProvider stays
    // mounted and its `window.error` listeners pile up, multiplying the
    // captureError call count on every subsequent dispatch.
    cleanup()
    mockCaptureError.mockClear()
    mockPosthogInit.mockClear()
    mockPosthogCapture.mockClear()
    mockPosthogIdentify.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  test('forwards window error events to captureError with source=window.error', () => {
    render(
      <PHProvider>
        <div>child</div>
      </PHProvider>,
    )

    const errorEvent = new ErrorEvent('error', {
      error: new Error('boom'),
      message: 'boom',
      filename: 'app.js',
      lineno: 42,
      colno: 7,
    })

    window.dispatchEvent(errorEvent)

    expect(mockCaptureError).toHaveBeenCalledTimes(1)
    const [errorArg, contextArg] = mockCaptureError.mock.calls[0]!
    expect(errorArg).toBeInstanceOf(Error)
    expect((errorArg as Error).message).toBe('boom')
    expect(contextArg).toMatchObject({
      source: 'window.error',
      metadata: expect.objectContaining({
        filename: 'app.js',
        lineno: 42,
        colno: 7,
      }),
    })
  })

  test('falls back to event.message when ErrorEvent has no error object', () => {
    render(
      <PHProvider>
        <div>child</div>
      </PHProvider>,
    )

    const errorEvent = new ErrorEvent('error', {
      message: 'no-error-object',
      filename: 'app.js',
      lineno: 1,
      colno: 1,
    })

    window.dispatchEvent(errorEvent)

    expect(mockCaptureError).toHaveBeenCalledTimes(1)
    const [errorArg] = mockCaptureError.mock.calls[0]!
    expect(errorArg).toBeInstanceOf(Error)
    expect((errorArg as Error).message).toBe('no-error-object')
  })

  test('forwards unhandledrejection with an Error reason to captureError', () => {
    render(
      <PHProvider>
        <div>child</div>
      </PHProvider>,
    )

    const rejection = new Error('async boom')

    // jsdom does not implement PromiseRejectionEvent constructor
    // semantically — fabricate the minimum surface the listener needs.
    const event = new Event('unhandledrejection') as Event & {
      reason: unknown
      promise: Promise<unknown>
    }
    event.reason = rejection
    event.promise = Promise.reject(rejection)
    // Prevent the unhandled rejection itself from leaking into the test
    // runner's failure reporter.
    event.promise.catch(() => {})

    window.dispatchEvent(event)

    expect(mockCaptureError).toHaveBeenCalledTimes(1)
    const [errorArg, contextArg] = mockCaptureError.mock.calls[0]!
    expect(errorArg).toBeInstanceOf(Error)
    expect((errorArg as Error).message).toBe('async boom')
    expect(contextArg).toMatchObject({
      source: 'unhandledrejection',
    })
  })

  test('wraps non-Error rejection reasons before forwarding', () => {
    render(
      <PHProvider>
        <div>child</div>
      </PHProvider>,
    )

    const event = new Event('unhandledrejection') as Event & {
      reason: unknown
      promise: Promise<unknown>
    }
    event.reason = 'string reason'
    event.promise = Promise.reject('string reason')
    event.promise.catch(() => {})

    window.dispatchEvent(event)

    expect(mockCaptureError).toHaveBeenCalledTimes(1)
    const [errorArg] = mockCaptureError.mock.calls[0]!
    expect(errorArg).toBeInstanceOf(Error)
    expect((errorArg as Error).message).toBe('string reason')
  })

  test('removes listeners on unmount so capture does not fire after teardown', () => {
    const { unmount } = render(
      <PHProvider>
        <div>child</div>
      </PHProvider>,
    )

    unmount()
    mockCaptureError.mockClear()

    // We dispatch an ErrorEvent WITHOUT a real `error` payload — just a
    // message — because jsdom rethrows the `error` field as a vitest
    // unhandled exception, which surfaces as a noisy false positive in
    // the runner. The listener is detached anyway, so the dispatch is
    // purely to confirm the absence of a captureError call.
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'after-unmount' }),
    )

    expect(mockCaptureError).not.toHaveBeenCalled()
  })
})

import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
//
// We capture whatever callback the component passes into
// `useReportWebVitals` so the test can drive it with synthetic
// metrics. The mock is declared BEFORE the SUT import so vi.mock's
// hoisting lines up with the component's `import { useReportWebVitals }`.

let capturedReporter: ((metric: unknown) => void) | null = null

vi.mock('next/web-vitals', () => ({
  useReportWebVitals: (fn: (metric: unknown) => void) => {
    capturedReporter = fn
  },
}))

const mockTrackEvent = vi.fn()

vi.mock('@/lib/analytics/client', () => ({
  trackEvent: (...args: unknown[]) => {
    mockTrackEvent(...args)
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

function setNodeEnv(value: string) {
  // process.env.NODE_ENV is typed readonly; cast via index form so the
  // TS strict config is satisfied without @ts-ignore.
  ;(process.env as Record<string, string>).NODE_ENV = value
}

async function importReporter() {
  // Dynamic import so module state (and the mocked NODE_ENV read inside
  // the component) is re-evaluated per test.
  vi.resetModules()
  const mod = await import('./web-vitals-reporter')
  return mod.WebVitalsReporter
}

beforeEach(() => {
  capturedReporter = null
  mockTrackEvent.mockClear()
})

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV ?? 'test')
})

// ---------------------------------------------------------------------------
// Production behaviour
// ---------------------------------------------------------------------------

describe('WebVitalsReporter (production)', () => {
  beforeEach(() => {
    setNodeEnv('production')
  })

  test('registers a callback with useReportWebVitals and renders nothing', async () => {
    const WebVitalsReporter = await importReporter()

    const { container } = render(<WebVitalsReporter />)

    expect(capturedReporter).toBeTypeOf('function')
    expect(container.firstChild).toBeNull()
  })

  test('forwards LCP metric to trackEvent with the full property contract', async () => {
    const WebVitalsReporter = await importReporter()
    render(<WebVitalsReporter />)

    // Stub location for page property
    Object.defineProperty(window, 'location', {
      value: { pathname: '/test-page' },
      writable: true,
    })

    capturedReporter?.({
      name: 'LCP',
      value: 1234.56,
      rating: 'good',
      id: 'v4-lcp-1',
    })

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.WEB_VITALS,
      {
        metric_name: 'LCP',
        metric_value: 1234.56,
        metric_rating: 'good',
        metric_id: 'v4-lcp-1',
        page: '/test-page',
      },
    )
  })

  test('forwards INP and CLS metrics', async () => {
    const WebVitalsReporter = await importReporter()
    render(<WebVitalsReporter />)

    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard' },
      writable: true,
    })

    capturedReporter?.({
      name: 'INP',
      value: 180,
      rating: 'good',
      id: 'v4-inp-1',
    })
    capturedReporter?.({
      name: 'CLS',
      value: 0.05,
      rating: 'good',
      id: 'v4-cls-1',
    })

    expect(mockTrackEvent).toHaveBeenCalledTimes(2)
    expect(mockTrackEvent).toHaveBeenNthCalledWith(
      1,
      ANALYTICS_EVENTS.WEB_VITALS,
      expect.objectContaining({ metric_name: 'INP', metric_value: 180 }),
    )
    expect(mockTrackEvent).toHaveBeenNthCalledWith(
      2,
      ANALYTICS_EVENTS.WEB_VITALS,
      expect.objectContaining({ metric_name: 'CLS', metric_value: 0.05 }),
    )
  })
})

// ---------------------------------------------------------------------------
// Non-production no-op
// ---------------------------------------------------------------------------

describe('WebVitalsReporter (non-production)', () => {
  test('does not subscribe in development', async () => {
    setNodeEnv('development')

    const WebVitalsReporter = await importReporter()
    const { container } = render(<WebVitalsReporter />)

    expect(capturedReporter).toBeNull()
    expect(container.firstChild).toBeNull()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  test('does not subscribe in test', async () => {
    setNodeEnv('test')

    const WebVitalsReporter = await importReporter()
    render(<WebVitalsReporter />)

    expect(capturedReporter).toBeNull()
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})

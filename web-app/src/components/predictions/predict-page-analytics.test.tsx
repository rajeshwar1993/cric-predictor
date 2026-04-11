import { render } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockTrackEvent = vi.fn()

vi.mock('@/lib/analytics/client', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

const { PredictPageAnalytics } = await import('./predict-page-analytics')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GANG_ID = 'gang-1'
const FIXTURE_ID_A = 'fixture-a'
const FIXTURE_ID_B = 'fixture-b'

beforeEach(() => {
  mockTrackEvent.mockClear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PredictPageAnalytics', () => {
  test('fires PREDICT_PAGE_VIEWED with the full property contract when lastSubmittedAt is null', () => {
    render(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_A}
        lastSubmittedAt={null}
      />,
    )

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.PREDICT_PAGE_VIEWED,
      {
        gang_id: GANG_ID,
        fixture_id: FIXTURE_ID_A,
        last_submitted_at: null,
      },
    )
  })

  test('fires PREDICT_PAGE_REVISITED when lastSubmittedAt is set', () => {
    const submittedAt = '2026-04-10T12:00:00.000Z'

    render(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_A}
        lastSubmittedAt={submittedAt}
      />,
    )

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.PREDICT_PAGE_REVISITED,
      {
        gang_id: GANG_ID,
        fixture_id: FIXTURE_ID_A,
        last_submitted_at: submittedAt,
      },
    )
  })

  test('does NOT re-fire when re-rendered with the same gangId/fixtureId', () => {
    const { rerender } = render(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_A}
        lastSubmittedAt={null}
      />,
    )

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)

    rerender(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_A}
        lastSubmittedAt={null}
      />,
    )

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
  })

  test('does NOT re-fire when only lastSubmittedAt changes (same fixture)', () => {
    const { rerender } = render(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_A}
        lastSubmittedAt={null}
      />,
    )

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)

    rerender(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_A}
        lastSubmittedAt={'2026-04-10T12:00:00.000Z'}
      />,
    )

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
  })

  test('DOES re-fire when fixtureId changes (R-015 regression)', () => {
    const { rerender } = render(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_A}
        lastSubmittedAt={null}
      />,
    )

    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      ANALYTICS_EVENTS.PREDICT_PAGE_VIEWED,
      expect.objectContaining({ fixture_id: FIXTURE_ID_A }),
    )

    rerender(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_B}
        lastSubmittedAt={null}
      />,
    )

    expect(mockTrackEvent).toHaveBeenCalledTimes(2)
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      ANALYTICS_EVENTS.PREDICT_PAGE_VIEWED,
      expect.objectContaining({ fixture_id: FIXTURE_ID_B }),
    )
  })

  test('renders nothing visible', () => {
    const { container } = render(
      <PredictPageAnalytics
        gangId={GANG_ID}
        fixtureId={FIXTURE_ID_A}
        lastSubmittedAt={null}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})

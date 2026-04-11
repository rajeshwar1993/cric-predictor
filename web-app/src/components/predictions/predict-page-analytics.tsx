'use client'

import { useEffect, useRef } from 'react'

import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

interface PredictPageAnalyticsProps {
  /** The gang id the predict page is scoped to. */
  gangId: string
  /** The fixture id the predict page is scoped to. */
  fixtureId: string
  /** ISO timestamp of the user's last submission, or null if they have never submitted. */
  lastSubmittedAt: string | null
}

/**
 * Pure analytics client island for the predict page.
 *
 * Fires PREDICT_PAGE_VIEWED on mount when the user has never submitted a
 * prediction for this fixture (lastSubmittedAt === null), or
 * PREDICT_PAGE_REVISITED otherwise.
 *
 * The fired-key ref is keyed by `${gangId}:${fixtureId}` so that a client
 * navigation from one fixture to another (which keeps the React subtree
 * mounted and only updates props) correctly fires a fresh event for the
 * new fixture. A bare boolean ref would be preserved across the param
 * change and the second fixture's view event would be silently dropped.
 * Renders nothing.
 */
export function PredictPageAnalytics({
  gangId,
  fixtureId,
  lastSubmittedAt,
}: PredictPageAnalyticsProps) {
  const firedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const key = `${gangId}:${fixtureId}`
    if (firedKeyRef.current === key) return
    firedKeyRef.current = key

    const event =
      lastSubmittedAt === null
        ? ANALYTICS_EVENTS.PREDICT_PAGE_VIEWED
        : ANALYTICS_EVENTS.PREDICT_PAGE_REVISITED

    trackEvent(event, {
      gang_id: gangId,
      fixture_id: fixtureId,
      last_submitted_at: lastSubmittedAt,
    })
  }, [gangId, fixtureId, lastSubmittedAt])

  return null
}

'use client'

import { useEffect } from 'react'
import { useMatchPredictions } from '@/hooks/use-match-predictions'
import type { MatchPredictionsDataset } from '@/lib/dal/predictions-shared'
import { PredictionReveal } from './prediction-reveal'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PredictionRevealLiveProps {
  /** The gang/group ID. */
  gangId: string
  /** The fixture ID. */
  fixtureId: string
  /** Whether the fixture is currently live (enables polling). */
  isLive: boolean
  /** Initial server-fetched reveal dataset. */
  initialData: MatchPredictionsDataset
  /** The current authenticated user's ID (for column highlighting). */
  currentUserId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PredictionRevealLive — client wrapper that enables live polling of the
 * prediction reveal dataset during live fixtures.
 *
 * When the fixture is live, polls every 30 seconds for updated rows. Falls
 * back to the initial server-fetched data until the first poll completes.
 *
 * When the fixture is not live, simply renders the static server data.
 *
 * @see docs/stories/LDB-002-prediction-reveal.md
 */
export function PredictionRevealLive({
  gangId,
  fixtureId,
  isLive,
  initialData,
  currentUserId,
}: PredictionRevealLiveProps) {
  const { data: polledData, error } = useMatchPredictions(
    gangId,
    fixtureId,
    isLive,
  )

  // Log polling errors in development for debugging — production surfaces
  // the banner below without spamming the console.
  useEffect(() => {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[PredictionRevealLive] polling error:', error)
    }
  }, [error])

  // Use polled data once available, otherwise fall back to server data.
  // Stale data stays visible when a poll fails — the banner signals retry.
  const data = isLive && polledData ? polledData : initialData

  return (
    <>
      {isLive && error && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 font-body text-caption text-warning"
        >
          Updates paused — retrying...
        </div>
      )}
      <PredictionReveal data={data} currentUserId={currentUserId} />
    </>
  )
}

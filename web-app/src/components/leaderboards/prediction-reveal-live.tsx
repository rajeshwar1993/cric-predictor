'use client'

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
  const { data: polledData } = useMatchPredictions(gangId, fixtureId, isLive)

  // Use polled data once available, otherwise fall back to server data.
  const data = isLive && polledData ? polledData : initialData

  return <PredictionReveal data={data} currentUserId={currentUserId} />
}

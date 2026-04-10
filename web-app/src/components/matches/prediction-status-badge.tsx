import { PREDICTION_WINDOW_MS } from '@/lib/constants'
import type { MatchStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Prediction status types
// ---------------------------------------------------------------------------

export type PredictionStatus = 'predict' | 'predicted' | 'locked' | 'live' | 'not_open'

interface PredictionStatusBadgeProps {
  /** The calculated prediction status */
  status: PredictionStatus
  /** Optional additional CSS class names */
  className?: string
}

// ---------------------------------------------------------------------------
// Status calculation helper
// ---------------------------------------------------------------------------

/**
 * Calculate the prediction status for a fixture.
 *
 * Logic:
 * 1. If match is live → 'live'
 * 2. If deadline has passed → 'locked'
 * 3. If user has already predicted → 'predicted'
 * 4. If prediction window hasn't opened (>12h before start) → 'not_open'
 * 5. Otherwise → 'predict' (window open, not yet predicted)
 */
export function getPredictionStatus(
  fixtureStatus: MatchStatus,
  startDatetime: string,
  predictionDeadlineMins: number,
  hasPredicted: boolean,
): PredictionStatus {
  // Guard: any status other than upcoming/live is already decided
  if (fixtureStatus !== 'upcoming' && fixtureStatus !== 'live') return 'locked'

  if (fixtureStatus === 'live') return 'live'

  const now = new Date()
  const startTime = new Date(startDatetime)

  // Deadline = start_datetime minus prediction_deadline_mins
  const deadline = new Date(startTime.getTime() - predictionDeadlineMins * 60 * 1000)
  if (now >= deadline) return 'locked'

  if (hasPredicted) return 'predicted'

  // Window opens PREDICTION_WINDOW_HOURS before start
  const windowOpens = new Date(startTime.getTime() - PREDICTION_WINDOW_MS)
  if (now < windowOpens) return 'not_open'

  return 'predict'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a badge indicating the prediction status for a match.
 *
 * - PREDICT (lime) — window open, user hasn't predicted
 * - PREDICTED (default + check icon) — user submitted
 * - LOCKED (default) — deadline passed
 * - LIVE (lime + pulsing dot) — match is live
 * - not_open — hidden (no badge shown)
 */
export function PredictionStatusBadge({
  status,
  className,
}: PredictionStatusBadgeProps) {
  if (status === 'not_open') return null

  switch (status) {
    case 'predict':
      return (
        <Badge variant="lime" className={className}>
          PREDICT
        </Badge>
      )

    case 'predicted':
      return (
        <Badge variant="default" className={className}>
          <Check className="size-3" aria-hidden="true" />
          PREDICTED
        </Badge>
      )

    case 'locked':
      return (
        <Badge variant="default" className={className}>
          LOCKED
        </Badge>
      )

    case 'live':
      return (
        <Badge variant="lime" className={cn('gap-1.5', className)}>
          <span
            className="size-2 rounded-full bg-success motion-safe:animate-pulse"
            aria-hidden="true"
          />
          LIVE
        </Badge>
      )
  }
}

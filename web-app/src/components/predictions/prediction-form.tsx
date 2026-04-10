'use client'

import { useState, useCallback, useRef } from 'react'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import type { ScenarioGroupData } from '@/components/predictions/scenario-list'
import { ScenarioList } from '@/components/predictions/scenario-list'
import { SubmitBar } from '@/components/predictions/submit-bar'
import { LastSubmittedIndicator } from '@/components/predictions/last-submitted-indicator'
import { submitPredictions } from '@/lib/actions/predictions'
import { toast } from '@/components/ui/toast'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PredictionFormProps {
  /** The gang ID for this prediction set */
  gangId: string
  /** The fixture ID for this prediction set */
  fixtureId: string
  /** Scenario groups (already sorted by phase) */
  groups: ScenarioGroupData[]
  /** Home team info */
  homeTeam: FixtureTeam
  /** Away team info */
  awayTeam: FixtureTeam
  /** Players grouped by team */
  players: { home: MatchPlayer[]; away: MatchPlayer[] }
  /** Initial prediction values from existing submissions: scenarioId → answer */
  initialPredictions: Record<string, string>
  /** ISO string of when predictions were last submitted, or null */
  lastSubmittedAt: string | null
  /** Total number of scenarios across all groups */
  totalScenarios: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PredictionForm — client component wrapping ScenarioList with form submission.
 *
 * Manages prediction state via ScenarioList's onPredictionsChange callback,
 * tracks picked count for progress display, and provides a sticky SubmitBar
 * for batch-submitting predictions via the submitPredictions server action.
 *
 * Shows last submitted timestamp when user has previously submitted.
 *
 * @see docs/stories/PRED-003-prediction-submit.md
 */
export function PredictionForm({
  gangId,
  fixtureId,
  groups,
  homeTeam,
  awayTeam,
  players,
  initialPredictions,
  lastSubmittedAt,
  totalScenarios,
}: PredictionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(lastSubmittedAt)

  // Track predictions in a ref to avoid re-rendering ScenarioList on every change
  // while still having access to the latest state for submission.
  const predictionsRef = useRef<Record<string, string>>(initialPredictions)

  // Synchronous guard against double-click / concurrent submissions.
  // React state updates are async, so two rapid clicks can both see
  // isSubmitting === false. This ref blocks the second call immediately.
  const submittingRef = useRef(false)

  // Count picked predictions for the progress bar.
  // This needs to be state so SubmitBar re-renders on changes.
  const [pickedCount, setPickedCount] = useState(() =>
    Object.values(initialPredictions).filter(Boolean).length,
  )

  const handlePredictionsChange = useCallback(
    (predictions: Record<string, string>) => {
      predictionsRef.current = predictions
      setPickedCount(Object.values(predictions).filter(Boolean).length)
    },
    [],
  )

  const handleSubmit = useCallback(async () => {
    // Synchronous double-click guard
    if (submittingRef.current) return
    submittingRef.current = true

    const current = predictionsRef.current
    const picksArray = Object.entries(current)
      .filter(([, value]) => value !== '')
      .map(([scenarioId, value]) => ({ scenarioId, value }))

    if (picksArray.length === 0) {
      submittingRef.current = false
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitPredictions(gangId, fixtureId, picksArray)
      if (result.success) {
        toast.success('Predictions saved!')
        setSubmittedAt(new Date().toISOString())
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }, [gangId, fixtureId])

  return (
    <>
      {/* Last submitted indicator */}
      {submittedAt && (
        <div className="mb-4 text-center">
          <LastSubmittedIndicator submittedAt={submittedAt} />
        </div>
      )}

      {/* Scenario list with pickers */}
      <ScenarioList
        groups={groups}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        players={players}
        initialPredictions={initialPredictions}
        onPredictionsChange={handlePredictionsChange}
      />

      {/* Sticky submit bar with bottom padding for the bar itself */}
      <div className="h-20" aria-hidden="true" />
      <SubmitBar
        pickedCount={pickedCount}
        totalCount={totalScenarios}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        disabled={pickedCount === 0}
      />
    </>
  )
}

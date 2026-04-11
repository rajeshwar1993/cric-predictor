'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import type { ScenarioGroupData } from '@/components/predictions/scenario-list'
import { ScenarioList } from '@/components/predictions/scenario-list'
import { SubmitBar } from '@/components/predictions/submit-bar'
import { LastSubmittedIndicator } from '@/components/predictions/last-submitted-indicator'
import { submitPredictions } from '@/lib/actions/predictions'
import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { toast } from '@/components/ui/toast'

/**
 * Debounce window (ms) for PICK_CHANGED. The user often clicks several
 * options in rapid succession while figuring out a scenario; we only want
 * to record the last value they settle on.
 */
const PICK_CHANGED_DEBOUNCE_MS = 500

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

  // Debounced PICK_CHANGED state. We keep the most recent (scenarioId,value)
  // pair pending until the debounce window expires, then fire a single
  // analytics event. The previous snapshot lets us detect which scenario
  // changed when the form re-emits its full predictions map.
  const previousPredictionsRef = useRef<Record<string, string>>(initialPredictions)
  const pendingPickRef = useRef<{ scenarioId: string; value: string } | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Count picked predictions for the progress bar.
  // This needs to be state so SubmitBar re-renders on changes.
  const [pickedCount, setPickedCount] = useState(() =>
    Object.values(initialPredictions).filter(Boolean).length,
  )

  // Clear any pending PICK_CHANGED timer on unmount so a stale fire
  // cannot reach trackEvent after the component is gone.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [])

  const handlePredictionsChange = useCallback(
    (predictions: Record<string, string>) => {
      // Detect which scenario changed by diffing against the previous
      // snapshot. If multiple changed in one tick (rare but possible) we
      // record the first diff — the debounced fire will only ever capture
      // the most recent value anyway.
      const previous = previousPredictionsRef.current
      let changed: { scenarioId: string; value: string } | null = null
      for (const [scenarioId, value] of Object.entries(predictions)) {
        if (previous[scenarioId] !== value) {
          changed = { scenarioId, value }
          break
        }
      }

      previousPredictionsRef.current = predictions
      predictionsRef.current = predictions
      setPickedCount(Object.values(predictions).filter(Boolean).length)

      if (!changed) return

      // Coalesce rapid edits to the same / different scenarios into a
      // single event using a 500ms trailing-edge debounce.
      pendingPickRef.current = changed
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        const pending = pendingPickRef.current
        debounceTimerRef.current = null
        pendingPickRef.current = null
        if (!pending) return
        trackEvent(ANALYTICS_EVENTS.PICK_CHANGED, {
          scenario_id: pending.scenarioId,
          gang_id: gangId,
          fixture_id: fixtureId,
          value: pending.value,
        })
      }, PICK_CHANGED_DEBOUNCE_MS)
    },
    [gangId, fixtureId],
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

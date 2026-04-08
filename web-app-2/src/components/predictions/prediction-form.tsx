'use client'

import { useState, useTransition, useCallback } from 'react'
import { Lock, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitPredictions } from '@/lib/actions/predictions'
import type { FixtureScenario, UserPrediction, Player } from '@/lib/dal/predictions'
import type { ResolutionPhase } from '@/lib/dal/predictions'
import type { Team } from './team-pick'
import { ScenarioCard } from './scenario-card'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Display labels for resolution phases */
const PHASE_LABELS: Record<ResolutionPhase, string> = {
  toss: 'Toss',
  first_wicket: 'First Strike',
  team_powerplay_end: 'Powerplay',
  mid_match: 'Mid-Match',
  team_innings_end: 'Innings Break',
  end: 'Final Ball',
  post_match: 'After Stumps',
}

/** Phase display order */
const PHASE_ORDER: ResolutionPhase[] = [
  'toss',
  'first_wicket',
  'team_powerplay_end',
  'mid_match',
  'team_innings_end',
  'end',
  'post_match',
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PredictionFormProps {
  gangId: string
  fixtureId: string
  scenarios: FixtureScenario[]
  existingPredictions: UserPrediction[]
  players: Player[]
  isLocked: boolean
  homeTeam: Team
  awayTeam: Team
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByPhase(scenarios: FixtureScenario[]): Map<ResolutionPhase, FixtureScenario[]> {
  const groups = new Map<ResolutionPhase, FixtureScenario[]>()

  for (const phase of PHASE_ORDER) {
    const matched = scenarios.filter((s) => s.resolutionPhase === phase)
    if (matched.length > 0) {
      groups.set(phase, matched)
    }
  }

  return groups
}

function buildInitialPicks(predictions: UserPrediction[]): Record<string, string> {
  const picks: Record<string, string> = {}
  for (const p of predictions) {
    picks[p.scenarioId] = p.value
  }
  return picks
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PredictionForm({
  gangId,
  fixtureId,
  scenarios,
  existingPredictions,
  players,
  isLocked,
  homeTeam,
  awayTeam,
}: PredictionFormProps) {
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    buildInitialPicks(existingPredictions),
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  const groupedScenarios = groupByPhase(scenarios)
  const totalCount = scenarios.length
  const pickedCount = Object.values(picks).filter((v) => v.length > 0).length

  const handlePickChange = useCallback(
    (scenarioId: string, value: string) => {
      if (isLocked) return
      setPicks((prev) => ({ ...prev, [scenarioId]: value }))
      setFeedback(null)
    },
    [isLocked],
  )

  const handleSubmit = useCallback(() => {
    if (isLocked || pickedCount === 0) return

    const picksArray = Object.entries(picks)
      .filter(([, value]) => value.length > 0)
      .map(([scenarioId, value]) => ({ scenarioId, value }))

    startTransition(async () => {
      const result = await submitPredictions(gangId, fixtureId, picksArray)
      if (result.success) {
        setFeedback({ type: 'success', message: 'Saved!' })
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    })
  }, [isLocked, pickedCount, picks, gangId, fixtureId])

  return (
    <div className="flex flex-col gap-[var(--sp-6)] pb-36">
      {/* Locked banner */}
      {isLocked && (
        <div
          className="flex items-center gap-[var(--sp-2)] rounded-[length:var(--radius-ds-md)] border px-[var(--sp-4)] py-[var(--sp-3)]"
          style={{
            borderColor: 'var(--prediction-locked)',
            backgroundColor: 'var(--bg-overlay)',
          }}
          role="alert"
        >
          <Lock
            size={16}
            strokeWidth={1.5}
            style={{ color: 'var(--prediction-locked)' }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Predictions locked
          </span>
        </div>
      )}

      {/* Scenario groups by phase */}
      {PHASE_ORDER.map((phase) => {
        const phaseScenarios = groupedScenarios.get(phase)
        if (phaseScenarios === undefined) return null

        return (
          <section key={phase} className="flex flex-col gap-[var(--sp-3)]">
            <h3
              className="text-sm font-semibold uppercase tracking-[0.05em]"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            >
              {PHASE_LABELS[phase]}
            </h3>
            <div className="flex flex-col gap-[var(--sp-3)]">
              {phaseScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  teamA={homeTeam}
                  teamB={awayTeam}
                  players={players}
                  value={picks[scenario.id] ?? null}
                  onChange={(value) => {
                    handlePickChange(scenario.id, value)
                  }}
                  disabled={isLocked}
                />
              ))}
            </div>
          </section>
        )
      })}

      {/* Sticky submit bar */}
      {!isLocked && (
        <div
          className="fixed right-0 bottom-0 left-0 z-40 border-t"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'color-mix(in srgb, var(--bg-base) 95%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="mx-auto flex w-full max-w-[480px] flex-col gap-[var(--sp-2)] px-[var(--sp-5)] py-[var(--sp-3)] pb-[max(var(--sp-3),env(safe-area-inset-bottom))]">
            {/* Progress + feedback */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {pickedCount}/{totalCount} picked
              </span>
              {feedback !== null && (
                <span
                  className={cn(
                    'inline-flex items-center gap-[var(--sp-1)] text-sm font-medium',
                    feedback.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--error)]',
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {feedback.type === 'success' && (
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                  )}
                  {feedback.message}
                </span>
              )}
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={pickedCount === 0 || isPending}
              className="w-full"
              aria-label={
                isPending ? 'Saving predictions...' : `Save ${String(pickedCount)} predictions`
              }
            >
              {isPending ? (
                <>
                  <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Save Predictions'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

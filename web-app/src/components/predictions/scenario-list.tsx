'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ResolutionPhase, ScenarioInputType } from '@/types'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import type { Json } from '@/types/database'
import { ScenarioCard } from '@/components/predictions/scenario-card'
import { ScenarioGroup } from '@/components/predictions/scenario-group'
import { ScenarioInput } from '@/components/predictions/scenario-input'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Scenario data passed from the server page. */
export interface ScenarioData {
  id: string
  title: string
  description: string | null
  inputType: ScenarioInputType
  options: Json | null
  pointsWeight: number
}

/** A group of scenarios with phase metadata. */
export interface ScenarioGroupData {
  phase: ResolutionPhase
  label: string
  scenarios: ScenarioData[]
}

export interface ScenarioListProps {
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
  /** Whether the picker inputs are disabled (e.g., locked predictions) */
  disabled?: boolean
  /** Callback fired whenever predictions change — receives the full predictions map */
  onPredictionsChange?: (predictions: Record<string, string>) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse scenario options from Json | null to string[].
 * The options column stores a JSON array of strings for range scenarios.
 */
function parseOptions(options: Json | null): string[] {
  if (!options) return []
  if (Array.isArray(options)) {
    return options.filter((o): o is string => typeof o === 'string')
  }
  return []
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ScenarioList — client component managing prediction state for all scenarios.
 *
 * Renders ScenarioCard + ScenarioInput for each scenario, grouped by phase.
 * Manages local state for selected values per scenario. Initial values come
 * from existing predictions (if any).
 *
 * Full form submission and state persistence will be added in PRED-003.
 *
 * @see docs/stories/PRED-002-scenario-pickers.md
 */
export function ScenarioList({
  groups,
  homeTeam,
  awayTeam,
  players,
  initialPredictions,
  disabled = false,
  onPredictionsChange,
}: ScenarioListProps) {
  // Local state: scenarioId → selected value
  const [predictions, setPredictions] = useState<Record<string, string>>(
    initialPredictions,
  )

  // Skip the initial mount — parent already knows the initial values
  const isFirstRender = useRef(true)

  const handleChange = useCallback((scenarioId: string, value: string) => {
    setPredictions((prev) => ({ ...prev, [scenarioId]: value }))
  }, [])

  // Notify parent after state settles — avoids side-effects inside updater
  // which can double-fire in React 18+ concurrent mode.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onPredictionsChange?.(predictions)
  }, [predictions, onPredictionsChange])

  return (
    <>
      {groups.map((group) => (
        <ScenarioGroup key={group.phase} phase={group.phase} label={group.label}>
          {group.scenarios.map((scenario) => {
            const value = predictions[scenario.id] ?? ''
            return (
              <ScenarioCard
                key={scenario.id}
                title={scenario.title}
                description={scenario.description}
                pointsWeight={scenario.pointsWeight}
                isPicked={value !== ''}
              >
                <ScenarioInput
                  inputType={scenario.inputType}
                  options={parseOptions(scenario.options)}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  players={players}
                  value={value}
                  onChange={(v) => handleChange(scenario.id, v)}
                  disabled={disabled}
                />
              </ScenarioCard>
            )
          })}
        </ScenarioGroup>
      ))}
    </>
  )
}

'use client'

import type { FixtureTeam } from '@/lib/dal/fixtures'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TeamPickerProps {
  /** Home team info */
  homeTeam: FixtureTeam
  /** Away team info */
  awayTeam: FixtureTeam
  /** Currently selected team UUID, or empty string for no selection */
  value: string
  /** Callback when a team is selected */
  onChange: (teamId: string) => void
  /** Whether the picker is disabled (e.g., locked predictions) */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TeamPicker — two team buttons side by side for team selection scenarios.
 *
 * Each button shows the team code with team color and the team name below.
 * Selected team has a lime border/highlight. Selection is sticky (tapping the
 * same team again does NOT deselect).
 *
 * @see docs/stories/PRED-002-scenario-pickers.md
 */
export function TeamPicker({
  homeTeam,
  awayTeam,
  value,
  onChange,
  disabled = false,
}: TeamPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Select a team">
      {[homeTeam, awayTeam].map((team) => {
        const isSelected = value === team.id
        return (
          <button
            key={team.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Select ${team.name}`}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center rounded-md border-2 p-4 transition-all duration-[var(--duration-state)] ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bragg-lime focus-visible:ring-offset-2 focus-visible:ring-offset-concrete-black',
              isSelected
                ? 'border-bragg-lime bg-lime-wash'
                : 'border-wire bg-dark-concrete hover:border-light-concrete',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => {
              if (!disabled) {
                onChange(team.id)
              }
            }}
          >
            <span
              className="font-display text-lg font-bold"
              style={{ color: team.color }}
            >
              {team.code}
            </span>
            <span className="mt-1 text-xs text-text-secondary">
              {team.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

'use client'

import { cn } from '@/lib/utils'
import type { FixtureScenario } from '@/lib/dal/predictions'
import type { Player } from '@/lib/dal/predictions'
import type { Team } from './team-pick'
import { TeamPick } from './team-pick'
import { PlayerPick } from './player-pick'
import { RangePick } from './range-pick'
import { YesNoPick } from './yes-no-pick'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScenarioCardProps {
  scenario: FixtureScenario
  teamA: Team
  teamB: Team
  players: Player[]
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScenarioCard({
  scenario,
  teamA,
  teamB,
  players,
  value,
  onChange,
  disabled = false,
}: ScenarioCardProps) {
  const hasPick = value !== null && value.length > 0

  return (
    <div
      className={cn(
        'flex flex-col gap-[var(--sp-3)] rounded-[length:var(--radius-ds-lg)] border p-[var(--sp-4)] transition-colors',
        hasPick
          ? 'border-[var(--brand)] bg-[var(--bg-raised)]'
          : 'border-[var(--border-default)] bg-[var(--bg-raised)]',
      )}
      role="group"
      aria-label={scenario.title}
    >
      {/* Header: title + points */}
      <div className="flex items-start justify-between gap-[var(--sp-2)]">
        <h4
          className="text-base font-medium leading-snug"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
        >
          {scenario.title}
        </h4>
        <span
          className="inline-flex shrink-0 items-center rounded-[length:var(--radius-ds-sm)] px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: 'var(--brand-muted)',
            color: 'var(--brand)',
          }}
        >
          {scenario.points} pts
        </span>
      </div>

      {/* Picked indicator */}
      {hasPick && (
        <div className="flex items-center gap-[var(--sp-1)]">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'var(--brand)' }}
            aria-hidden="true"
          />
          <span className="text-xs font-medium" style={{ color: 'var(--brand)' }}>
            Picked
          </span>
        </div>
      )}

      {/* Input component based on input_type */}
      <div>
        {scenario.inputType === 'team_pick' && (
          <TeamPick
            teamA={teamA}
            teamB={teamB}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        )}
        {scenario.inputType === 'player_pick' && (
          <PlayerPick
            players={players}
            value={value}
            onChange={onChange}
            disabled={disabled}
            title={scenario.title}
          />
        )}
        {scenario.inputType === 'range' && scenario.options !== null && (
          <RangePick
            options={scenario.options}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        )}
        {scenario.inputType === 'yes_no' && (
          <YesNoPick value={value} onChange={onChange} disabled={disabled} />
        )}
      </div>
    </div>
  )
}

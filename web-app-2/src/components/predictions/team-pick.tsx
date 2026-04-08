'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Team {
  id: string
  code: string
  color?: string
}

interface TeamPickProps {
  teamA: Team
  teamB: Team
  value: string | null
  onChange: (teamId: string) => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeamPick({ teamA, teamB, value, onChange, disabled = false }: TeamPickProps) {
  return (
    <div className="grid grid-cols-2 gap-[var(--sp-2)]" role="radiogroup" aria-label="Pick a team">
      {[teamA, teamB].map((team) => {
        const isSelected = value === team.id
        return (
          <button
            key={team.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Pick ${team.code}`}
            disabled={disabled}
            onClick={() => {
              onChange(team.id)
            }}
            className={cn(
              'flex h-12 items-center justify-center rounded-[length:var(--radius-ds-md)] border text-base font-semibold transition-all',
              'focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:outline-none',
              'active:scale-[0.97]',
              'disabled:pointer-events-none disabled:opacity-40',
              isSelected
                ? 'border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]'
                : 'border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] hover:border-[var(--border-strong)]',
            )}
            style={
              isSelected && team.color !== undefined
                ? { borderColor: team.color, color: team.color }
                : undefined
            }
          >
            {team.code}
          </button>
        )
      })}
    </div>
  )
}

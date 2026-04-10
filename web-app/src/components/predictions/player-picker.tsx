'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlayerPickerProps {
  /** Players grouped by team */
  players: { home: MatchPlayer[]; away: MatchPlayer[] }
  /** Home team info (for group heading) */
  homeTeam: FixtureTeam
  /** Away team info (for group heading) */
  awayTeam: FixtureTeam
  /** Currently selected player UUID, or empty string for no selection */
  value: string
  /** Callback when a player is selected */
  onChange: (playerId: string) => void
  /** Whether the picker is disabled (e.g., locked predictions) */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format role for display (e.g., "batsman" → "Batsman"). */
function formatRole(role: string | null): string | null {
  if (!role) return null
  return role.charAt(0).toUpperCase() + role.slice(1)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PlayerPicker — searchable dropdown for player selection scenarios.
 *
 * Uses shadcn Popover + Command (combobox pattern). Players are grouped
 * by team with a search input for filtering. Each player shows their name
 * and role.
 *
 * @see docs/stories/PRED-002-scenario-pickers.md
 */
export function PlayerPicker({
  players,
  homeTeam,
  awayTeam,
  value,
  onChange,
  disabled = false,
}: PlayerPickerProps) {
  const [open, setOpen] = useState(false)

  // O(1) player lookup by ID — built once and cached
  const playerMap = useMemo(() => {
    const map = new Map<string, MatchPlayer>()
    for (const p of players.home) map.set(p.id, p)
    for (const p of players.away) map.set(p.id, p)
    return map
  }, [players])

  const selectedPlayer = value ? playerMap.get(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a player"
          disabled={disabled}
          className={cn(
            'w-full justify-between border-2 bg-dark-concrete font-body text-sm font-normal',
            value ? 'border-bragg-lime/30 text-text-primary' : 'border-wire text-text-muted',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {selectedPlayer ? selectedPlayer.name : 'Select player...'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] border-wire bg-mid-concrete p-0"
        align="start"
      >
        <Command className="bg-mid-concrete text-text-primary">
          <CommandInput
            placeholder="Search players..."
            className="text-text-primary placeholder:text-text-muted"
          />
          <CommandList>
            <CommandEmpty className="text-text-muted">
              No player found.
            </CommandEmpty>
            {players.home.length > 0 && (
              <CommandGroup
                heading={`${homeTeam.code} Players`}
                className="[&_[cmdk-group-heading]]:text-text-muted"
              >
                {players.home.map((player) => (
                  <CommandItem
                    key={player.id}
                    value={`${player.name} ${player.role ?? ''}`}
                    onSelect={() => {
                      onChange(player.id)
                      setOpen(false)
                    }}
                    className="text-text-secondary data-[selected=true]:bg-light-concrete data-[selected=true]:text-text-primary"
                  >
                    <div className="flex flex-1 items-center justify-between">
                      <span>{player.name}</span>
                      {player.role && (
                        <span className="text-xs text-text-muted">
                          {formatRole(player.role)}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        'ml-2 size-4 text-bragg-lime',
                        value === player.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {players.away.length > 0 && (
              <CommandGroup
                heading={`${awayTeam.code} Players`}
                className="[&_[cmdk-group-heading]]:text-text-muted"
              >
                {players.away.map((player) => (
                  <CommandItem
                    key={player.id}
                    value={`${player.name} ${player.role ?? ''}`}
                    onSelect={() => {
                      onChange(player.id)
                      setOpen(false)
                    }}
                    className="text-text-secondary data-[selected=true]:bg-light-concrete data-[selected=true]:text-text-primary"
                  >
                    <div className="flex flex-1 items-center justify-between">
                      <span>{player.name}</span>
                      {player.role && (
                        <span className="text-xs text-text-muted">
                          {formatRole(player.role)}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        'ml-2 size-4 text-bragg-lime',
                        value === player.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

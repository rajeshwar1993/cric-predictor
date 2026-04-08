'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Player } from '@/lib/dal/predictions'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerPickProps {
  players: Player[]
  value: string | null
  onChange: (playerId: string) => void
  disabled?: boolean
  title?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlayerPick({
  players,
  value,
  onChange,
  disabled = false,
  title = 'Select a player',
}: PlayerPickProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedPlayer = value !== null ? (players.find((p) => p.id === value) ?? null) : null

  const filteredPlayers =
    search.length === 0
      ? players
      : players.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.teamCode.toLowerCase().includes(search.toLowerCase()),
        )

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current !== null && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
    return undefined
  }, [isOpen])

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current !== null) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleToggle = useCallback(() => {
    if (disabled) return
    setIsOpen((prev) => !prev)
    setSearch('')
  }, [disabled])

  const handleSelect = useCallback(
    (playerId: string) => {
      onChange(playerId)
      setIsOpen(false)
      setSearch('')
    },
    [onChange],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    }
    if (e.key === 'ArrowDown' && listRef.current !== null) {
      e.preventDefault()
      const firstButton = listRef.current.querySelector('button')
      if (firstButton !== null) {
        firstButton.focus()
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={selectedPlayer !== null ? `Selected: ${selectedPlayer.name}` : title}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-[var(--radius-ds-md)] border px-[var(--sp-4)] text-left text-base transition-all',
          'focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:outline-none',
          'disabled:pointer-events-none disabled:opacity-40',
          isOpen
            ? 'border-[var(--border-focus)] bg-[var(--bg-inset)]'
            : 'border-[var(--border-default)] bg-[var(--bg-inset)] hover:border-[var(--border-strong)]',
        )}
      >
        <span
          className={cn(
            'truncate',
            selectedPlayer !== null ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]',
          )}
        >
          {selectedPlayer !== null ? `${selectedPlayer.name} (${selectedPlayer.teamCode})` : title}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={cn(
            'shrink-0 text-[var(--text-tertiary)] transition-transform',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-[calc(100%+var(--sp-1))] left-0 z-50 w-full overflow-hidden rounded-[var(--radius-ds-md)] border border-[var(--border-default)] bg-[var(--bg-overlay)] shadow-lg"
          role="listbox"
          aria-label="Player list"
        >
          {/* Search */}
          <div className="flex items-center gap-[var(--sp-2)] border-b border-[var(--border-default)] px-[var(--sp-3)] py-[var(--sp-2)]">
            <Search
              size={16}
              strokeWidth={1.5}
              className="text-[var(--text-tertiary)]"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              className="h-8 w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
              aria-label="Search players"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Player list */}
          <div ref={listRef} className="max-h-60 overflow-y-auto py-[var(--sp-1)]">
            {filteredPlayers.length === 0 ? (
              <div className="px-[var(--sp-3)] py-[var(--sp-4)] text-center text-sm text-[var(--text-tertiary)]">
                No players found
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const isSelected = value === player.id
                return (
                  <button
                    key={player.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      handleSelect(player.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        const next = e.currentTarget.nextElementSibling as HTMLElement | null
                        if (next !== null) next.focus()
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        const prev = e.currentTarget.previousElementSibling as HTMLElement | null
                        if (prev !== null) prev.focus()
                      }
                      if (e.key === 'Escape') {
                        setIsOpen(false)
                        setSearch('')
                      }
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-[var(--sp-3)] py-[var(--sp-2)] text-left text-sm transition-colors outline-none',
                      'focus-visible:bg-[var(--bg-raised)]',
                      isSelected
                        ? 'bg-[var(--brand-muted)] text-[var(--brand)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-raised)]',
                    )}
                  >
                    <span className="truncate">
                      {player.name}{' '}
                      <span className="text-[var(--text-secondary)]">({player.teamCode})</span>
                    </span>
                    {isSelected && (
                      <span className="ml-[var(--sp-2)] text-[var(--brand)]" aria-hidden="true">
                        &#10003;
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

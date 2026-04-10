'use client'

import * as React from 'react'
import { ChevronDown, Trophy } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { GangStandingEntry } from '@/lib/dal/leaderboards'
import { LeaderboardRow } from './leaderboard-row'
import { EmptyState } from '@/components/ui/empty-state'
import { LeaderboardRowSkeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SeasonStandingsTableProps {
  /** Standings entries, pre-sorted: active members by rank, departed at end */
  entries: GangStandingEntry[]
  /** The current authenticated user's ID, for highlighting their row */
  currentUserId: string
  /** Whether the standings data is currently loading */
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPARTED_STATUSES = new Set(['left', 'removed'])

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SeasonStandingsTable — displays the ranked season standings for a gang.
 *
 * Desktop (md+): LeaderboardRow with extra stat columns (MP, PPM, Acc%) inline.
 * Mobile (<md): LeaderboardRow with expandable detail row for stats.
 *
 * Uses the `LeaderboardRow` component for each entry. Highlights the current
 * user's row and grays out departed members at the bottom.
 *
 * @see docs/stories/LDB-003-season-standings.md
 */
export function SeasonStandingsTable({
  entries,
  currentUserId,
  isLoading = false,
}: SeasonStandingsTableProps) {
  if (isLoading) {
    return <SeasonStandingsSkeleton />
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        headline="No predictions yet this season"
        description="Start predicting to climb the leaderboard!"
      />
    )
  }

  return (
    <section aria-label="Season standings">
      {/* Desktop table header — hidden on mobile */}
      <DesktopHeader />

      <div className="flex flex-col" role="list">
        {entries.map((entry) => {
          const isDeparted = DEPARTED_STATUSES.has(entry.memberStatus)
          const isCurrentUser = entry.userId === currentUserId

          return (
            <StandingsRow
              key={entry.userId}
              entry={entry}
              isCurrentUser={isCurrentUser}
              isDeparted={isDeparted}
            />
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// DesktopHeader
// ---------------------------------------------------------------------------

function DesktopHeader() {
  return (
    <div
      className="mb-1 hidden items-center gap-3 px-3 md:flex"
      aria-hidden="true"
    >
      {/* Spacer matching rank + avatar + name area of LeaderboardRow */}
      <span className="flex-1" />
      <span className="w-12 text-right font-body text-caption uppercase tracking-wider text-text-muted">
        MP
      </span>
      <span className="w-14 text-right font-body text-caption uppercase tracking-wider text-text-muted">
        PPM
      </span>
      <span className="w-14 text-right font-body text-caption uppercase tracking-wider text-text-muted">
        Acc%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StandingsRow — expandable on mobile
// ---------------------------------------------------------------------------

interface StandingsRowProps {
  entry: GangStandingEntry
  isCurrentUser: boolean
  isDeparted: boolean
}

function StandingsRow({ entry, isCurrentUser, isDeparted }: StandingsRowProps) {
  const [expanded, setExpanded] = React.useState(false)

  const subtitle = buildSubtitle(entry)
  const ariaLabel = buildAriaLabel(entry, isCurrentUser, isDeparted)

  return (
    <div role="listitem">
      {/* ---------------------------------------------------------------- */}
      {/* Desktop: LeaderboardRow + extra stat columns side-by-side         */}
      {/* ---------------------------------------------------------------- */}
      <div className="hidden items-center gap-3 md:flex">
        <LeaderboardRow
          rank={entry.rank}
          displayName={entry.displayName ?? 'Unknown'}
          score={entry.totalPoints}
          isCurrentUser={isCurrentUser}
          isDeparted={isDeparted}
          avatar={entry.avatarUrl ?? undefined}
          subtitle={subtitle}
          className="flex-1"
          aria-label={ariaLabel}
        />
        <span
          className={cn(
            'w-12 text-right font-body text-body-sm tabular-nums',
            isDeparted ? 'text-text-muted' : 'text-text-secondary',
          )}
        >
          {entry.matchesPredicted}
        </span>
        <span
          className={cn(
            'w-14 text-right font-display text-body-sm font-medium tabular-nums',
            isDeparted ? 'text-text-muted' : 'text-text-secondary',
          )}
        >
          {entry.pointsPerMatch.toFixed(1)}
        </span>
        <span
          className={cn(
            'w-14 text-right font-body text-body-sm tabular-nums',
            isDeparted ? 'text-text-muted' : 'text-text-secondary',
          )}
        >
          {entry.accuracyPct.toFixed(1)}%
        </span>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile: LeaderboardRow + expandable detail row                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="md:hidden">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={`${ariaLabel}. Tap to ${expanded ? 'collapse' : 'expand'} details.`}
        >
          <LeaderboardRow
            rank={entry.rank}
            displayName={entry.displayName ?? 'Unknown'}
            score={entry.totalPoints}
            isCurrentUser={isCurrentUser}
            isDeparted={isDeparted}
            avatar={entry.avatarUrl ?? undefined}
            subtitle={subtitle}
            aria-label=""
          />

          {/* Expand indicator */}
          <div
            className={cn(
              'flex items-center justify-center pb-1',
              isDeparted && 'opacity-60',
            )}
          >
            <ChevronDown
              className={cn(
                'size-4 text-text-muted transition-transform duration-150',
                expanded && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Expanded detail stats */}
        {expanded && (
          <div
            className={cn(
              'flex gap-4 border-b-2 border-mid-concrete bg-mid-concrete px-4 py-3',
              isCurrentUser && 'bg-lime-wash',
              isDeparted && 'opacity-60',
            )}
          >
            <StatPill label="Matches" value={String(entry.matchesPredicted)} />
            <StatPill label="PPM" value={entry.pointsPerMatch.toFixed(1)} />
            <StatPill
              label="Accuracy"
              value={`${entry.accuracyPct.toFixed(1)}%`}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatPill — small stat display for mobile expanded row
// ---------------------------------------------------------------------------

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="font-body text-caption uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="font-display text-body font-bold tabular-nums text-text-primary">
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSubtitle(entry: GangStandingEntry): string {
  if (entry.matchesPredicted === 0) {
    return 'No predictions'
  }

  return `${entry.matchesPredicted} matches`
}

function buildAriaLabel(
  entry: GangStandingEntry,
  isCurrentUser: boolean,
  isDeparted: boolean,
): string {
  const parts = [
    entry.rank !== null ? `Rank ${entry.rank}` : 'Unranked',
    entry.displayName ?? 'Unknown',
    `${entry.totalPoints} points`,
    `${entry.matchesPredicted} matches predicted`,
    `${entry.pointsPerMatch.toFixed(1)} points per match`,
    `${entry.accuracyPct.toFixed(1)}% accuracy`,
  ]

  if (isCurrentUser) parts.push('(you)')
  if (isDeparted) parts.push('(departed)')

  return parts.join(', ')
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SeasonStandingsSkeleton() {
  return (
    <div
      className="flex flex-col"
      role="status"
      aria-label="Loading season standings"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </div>
  )
}

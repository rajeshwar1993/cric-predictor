import { Trophy } from 'lucide-react'
import type { MatchLeaderboardEntry } from '@/lib/dal/leaderboards'
import { LeaderboardRow } from './leaderboard-row'
import { EmptyState } from '@/components/ui/empty-state'
import { LeaderboardRowSkeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MatchLeaderboardProps {
  /** Leaderboard entries, pre-sorted: active members by rank, departed at end */
  entries: MatchLeaderboardEntry[]
  /** The current authenticated user's ID, for highlighting their row */
  currentUserId: string
  /** Whether the leaderboard data is currently loading */
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
 * MatchLeaderboard — displays the ranked standings table for a specific match.
 *
 * Uses the `LeaderboardRow` component for each entry. Highlights the current
 * user's row and grays out departed members at the bottom.
 *
 * @see docs/stories/LDB-001-match-leaderboard.md
 */
export function MatchLeaderboard({
  entries,
  currentUserId,
  isLoading = false,
}: MatchLeaderboardProps) {
  if (isLoading) {
    return <MatchLeaderboardSkeleton />
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        headline="No predictions yet"
        description="No one has predicted for this match yet. Be the first to make your predictions!"
      />
    )
  }

  return (
    <section aria-label="Match leaderboard">
      <h2 className="mb-3 font-display text-h3 font-bold uppercase text-text-primary">
        Leaderboard
      </h2>
      <div className="flex flex-col" role="list" aria-label="Match standings">
        {entries.map((entry) => {
          const isDeparted = DEPARTED_STATUSES.has(entry.memberStatus)
          const isCurrentUser = entry.userId === currentUserId
          const subtitle = buildSubtitle(entry)

          return (
            <div key={entry.userId} role="listitem">
              <LeaderboardRow
                rank={isDeparted ? null : entry.rank}
                displayName={entry.displayName ?? 'Unknown'}
                score={entry.pointsEarned}
                isCurrentUser={isCurrentUser}
                isDeparted={isDeparted}
                avatar={entry.avatarUrl ?? undefined}
                subtitle={subtitle}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSubtitle(entry: MatchLeaderboardEntry): string {
  if (entry.resolvedCount === 0 && entry.predictedCount === 0) {
    return 'No predictions'
  }

  if (entry.resolvedCount === 0) {
    return `${entry.predictedCount} predicted`
  }

  return `${entry.correctCount}/${entry.resolvedCount} correct`
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function MatchLeaderboardSkeleton() {
  return (
    <div className="flex flex-col" role="status" aria-label="Loading leaderboard">
      {Array.from({ length: 5 }, (_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </div>
  )
}

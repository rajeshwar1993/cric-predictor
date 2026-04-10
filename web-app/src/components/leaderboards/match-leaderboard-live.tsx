'use client'

import { useMatchLeaderboard } from '@/hooks/use-match-leaderboard'
import type { MatchLeaderboardEntry } from '@/lib/dal/leaderboards'
import { MatchLeaderboard } from './match-leaderboard'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MatchLeaderboardLiveProps {
  /** The gang/group ID */
  gangId: string
  /** The fixture ID */
  fixtureId: string
  /** Whether the fixture is currently live (enables polling) */
  isLive: boolean
  /** Initial server-fetched leaderboard data */
  initialEntries: MatchLeaderboardEntry[]
  /** The current authenticated user's ID */
  currentUserId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MatchLeaderboardLive — client wrapper that enables live polling of the
 * match leaderboard during live fixtures.
 *
 * When the fixture is live, polls every 30 seconds for updated standings.
 * Falls back to the initial server-fetched data until the first poll completes.
 *
 * When the fixture is not live, simply renders the static server data.
 *
 * @see docs/stories/LDB-001-match-leaderboard.md
 */
export function MatchLeaderboardLive({
  gangId,
  fixtureId,
  isLive,
  initialEntries,
  currentUserId,
}: MatchLeaderboardLiveProps) {
  const { data: polledData, isLoading } = useMatchLeaderboard(
    gangId,
    fixtureId,
    isLive,
  )

  // Use polled data when available, fall back to initial server data
  const entries = isLive && polledData ? polledData : initialEntries

  return (
    <MatchLeaderboard
      entries={entries}
      currentUserId={currentUserId}
      isLoading={isLive && isLoading && !polledData}
    />
  )
}

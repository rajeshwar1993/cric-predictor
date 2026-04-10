'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LeaderboardCountdown } from './leaderboard-countdown'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LeaderboardCountdownWithRefreshProps {
  /** ISO 8601 datetime string for the prediction deadline */
  deadline: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * LeaderboardCountdownWithRefresh — thin client wrapper around
 * `LeaderboardCountdown` that triggers a Next.js server re-fetch
 * when the countdown expires.
 *
 * This is needed because the parent page is a Server Component. When
 * the countdown reaches zero, calling `router.refresh()` re-runs the
 * server gating logic so the leaderboard appears without a manual
 * browser reload.
 *
 * @see docs/stories/LDB-001-match-leaderboard.md
 */
export function LeaderboardCountdownWithRefresh({
  deadline,
}: LeaderboardCountdownWithRefreshProps) {
  const router = useRouter()

  const handleExpire = useCallback(() => {
    router.refresh()
  }, [router])

  return <LeaderboardCountdown deadline={deadline} onExpire={handleExpire} />
}

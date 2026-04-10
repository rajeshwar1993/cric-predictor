'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { MatchLeaderboardEntry } from '@/lib/dal/leaderboards'
import type { MemberStatus } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Polling interval in milliseconds (30 seconds — less frequent than live scores) */
const POLL_INTERVAL_MS = 30_000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseMatchLeaderboardResult {
  /** The leaderboard data, or null if not yet loaded */
  data: MatchLeaderboardEntry[] | null
  /** True during the initial fetch before any data is returned */
  isLoading: boolean
  /** Error message if the last fetch failed */
  error: string | null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Polls `v2_gang_fixture_standings` every 30 seconds for a given gang + fixture.
 *
 * - Only polls when `enabled` is true (should only poll during live matches).
 * - Pauses polling when the browser tab is not visible.
 * - Immediately re-polls when the tab becomes visible again.
 * - Cleans up the interval and event listener on unmount.
 *
 * @param gangId - The gang to fetch standings for
 * @param fixtureId - The fixture to fetch standings for
 * @param enabled - Whether polling should be active (true when fixture is live)
 */
export function useMatchLeaderboard(
  gangId: string,
  fixtureId: string,
  enabled: boolean,
): UseMatchLeaderboardResult {
  const [data, setData] = useState<MatchLeaderboardEntry[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use a ref for the supabase client so it persists across renders
  const supabaseRef = useRef(createBrowserClient())

  // Guard against concurrent in-flight requests
  const isPollingRef = useRef(false)

  const poll = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }

    if (isPollingRef.current) return
    isPollingRef.current = true

    try {
      // Query 1: fixture standings joined with profiles
      const { data: standings, error: standingsError } = await supabaseRef.current
        .from('v2_gang_fixture_standings')
        .select(
          `
          user_id, predicted_count, resolved_count, correct_count, points_earned, rank, last_submitted_at,
          v2_profiles (display_name, avatar_url)
        `,
        )
        .eq('gang_id', gangId)
        .eq('fixture_id', fixtureId)
        .order('rank', { ascending: true, nullsFirst: false })

      if (standingsError) {
        setError(standingsError.message)
        return
      }

      if (!standings || standings.length === 0) {
        setData([])
        setError(null)
        return
      }

      // Query 2: member statuses
      const userIds = standings.map((s) => s.user_id)
      const { data: members, error: membersError } = await supabaseRef.current
        .from('v2_gang_members')
        .select('user_id, status')
        .eq('gang_id', gangId)
        .in('user_id', userIds)

      if (membersError) {
        setError(membersError.message)
        return
      }

      const memberStatusMap = new Map<string, MemberStatus>(
        (members ?? []).map((m) => [m.user_id, m.status]),
      )

      const departedStatuses: MemberStatus[] = ['left', 'removed']

      type ProfileShape = { display_name: string | null; avatar_url: string | null } | null

      const entries: MatchLeaderboardEntry[] = standings.map((row) => {
        const profile = row.v2_profiles as unknown as ProfileShape
        const status = memberStatusMap.get(row.user_id) ?? 'approved'

        return {
          userId: row.user_id,
          predictedCount: row.predicted_count,
          resolvedCount: row.resolved_count,
          correctCount: row.correct_count,
          pointsEarned: row.points_earned,
          rank: row.rank,
          lastSubmittedAt: row.last_submitted_at,
          displayName: profile?.display_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          memberStatus: status,
        }
      })

      // Sort active first, departed at end
      const active = entries.filter((e) => !departedStatuses.includes(e.memberStatus))
      const departed = entries.filter((e) => departedStatuses.includes(e.memberStatus))

      setData([...active, ...departed])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard')
    } finally {
      isPollingRef.current = false
      setIsLoading(false)
    }
  }, [gangId, fixtureId])

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    let active = true

    const wrappedPoll = async () => {
      if (!active) return
      await poll()
    }

    // Initial fetch
    wrappedPoll()

    // Set up polling interval
    const intervalId = setInterval(wrappedPoll, POLL_INTERVAL_MS)

    // Re-poll immediately when tab becomes visible
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        wrappedPoll()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [poll, enabled])

  return { data, isLoading, error }
}

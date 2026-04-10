'use client'

// ---------------------------------------------------------------------------
// DAL duplication invariant — READ BEFORE EDITING
// ---------------------------------------------------------------------------
//
// The query shape in this hook is INTENTIONALLY duplicated with the server
// DAL in `src/lib/dal/leaderboards.ts#getMatchLeaderboard`.
//
// Why:
//   - Client hooks cannot import server-only modules (the DAL creates its
//     Supabase client via `next/headers`, which is forbidden in Client
//     Components).
//   - The initial render uses the server DAL for SSR, while this hook owns
//     the 30s polling path once the fixture goes live.
//
// Invariant:
//   - Any change to the SELECT clause, table names, joins, ordering, member
//     status fallback, or sort behaviour in `getMatchLeaderboard` MUST be
//     mirrored here, or polling will silently return stale/wrong data.
//   - The `MatchLeaderboardEntry` shape is the shared contract — do not add
//     fields on only one side.
//
// TODO: consolidate both implementations into a single Postgres RPC (or a
// route handler) once the v2 schema stabilises so there is only one source
// of truth.

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { MatchLeaderboardEntry } from '@/lib/dal/leaderboards'
import type { MemberStatus } from '@/types'
import { isDeparted } from '@/lib/member-status'
import { LEADERBOARD_POLL_INTERVAL_MS } from '@/lib/constants'

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

  // Guard against setState after unmount (in-flight poll resolving late).
  const isMountedRef = useRef(true)

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
        if (isMountedRef.current) setError(standingsError.message)
        return
      }

      if (!standings || standings.length === 0) {
        if (isMountedRef.current) {
          setData([])
          setError(null)
        }
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
        if (isMountedRef.current) setError(membersError.message)
        return
      }

      const memberStatusMap = new Map<string, MemberStatus>(
        (members ?? []).map((m) => [m.user_id, m.status]),
      )

      type ProfileShape = { display_name: string | null; avatar_url: string | null } | null

      const entries: MatchLeaderboardEntry[] = standings.map((row) => {
        const profile = row.v2_profiles as unknown as ProfileShape
        const status = memberStatusMap.get(row.user_id)
        if (status === undefined && process.env.NODE_ENV !== 'production') {
          console.warn(
            `[useMatchLeaderboard] user ${row.user_id} has standings row but no membership record — defaulting to 'removed'`,
          )
        }
        // Safer default: dim the user rather than surface them as active.
        const resolvedStatus: MemberStatus = status ?? 'removed'

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
          memberStatus: resolvedStatus,
        }
      })

      // Sort active first, departed at end
      const active = entries.filter((e) => !isDeparted(e.memberStatus))
      const departed = entries.filter((e) => isDeparted(e.memberStatus))

      if (isMountedRef.current) {
        setData([...active, ...departed])
        setError(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard')
      }
    } finally {
      isPollingRef.current = false
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [gangId, fixtureId])

  useEffect(() => {
    // Re-arm the mount flag on every enabled change so StrictMode double
    // invocation and prop changes don't leave us permanently unmounted.
    isMountedRef.current = true

    if (!enabled) {
      setIsLoading(false)
      return () => {
        isMountedRef.current = false
      }
    }

    let active = true

    const wrappedPoll = async () => {
      if (!active) return
      await poll()
    }

    // Initial fetch
    wrappedPoll()

    // Set up polling interval
    const intervalId = setInterval(wrappedPoll, LEADERBOARD_POLL_INTERVAL_MS)

    // Re-poll immediately when tab becomes visible
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        wrappedPoll()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      isMountedRef.current = false
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [poll, enabled])

  return { data, isLoading, error }
}

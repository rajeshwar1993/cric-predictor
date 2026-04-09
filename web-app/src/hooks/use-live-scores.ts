'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { FixtureLiveScore } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Polling interval in milliseconds (15 seconds) */
const POLL_INTERVAL_MS = 15_000

/** Stale threshold in milliseconds (1 minute) */
const STALE_THRESHOLD_MS = 60_000

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseLiveScoresResult {
  /** The live score data, or null if not yet loaded */
  data: FixtureLiveScore | null
  /** True during the initial fetch before any data is returned */
  isLoading: boolean
  /** Error message if the last fetch failed */
  error: string | null
  /** True when last_polled_at is more than 1 minute ago */
  isStale: boolean
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Polls `v2_fixture_live_scores` every 15 seconds for a given fixture.
 *
 * - Pauses polling when the browser tab is not visible.
 * - Immediately re-polls when the tab becomes visible again.
 * - Cleans up the interval and event listener on unmount.
 * - Reports staleness when `last_polled_at` exceeds 1 minute.
 *
 * @param fixtureId - The fixture to fetch live scores for
 */
export function useLiveScores(fixtureId: string): UseLiveScoresResult {
  const [data, setData] = useState<FixtureLiveScore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use a ref for the supabase client so it persists across renders
  // but doesn't trigger re-renders
  const supabaseRef = useRef(createBrowserClient())

  const poll = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }

    try {
      const { data: scoreData, error: fetchError } = await supabaseRef.current
        .from('v2_fixture_live_scores')
        .select('*')
        .eq('fixture_id', fixtureId)
        .single()

      if (fetchError) {
        // PGRST116 = no rows — not an error, just no live data yet
        if (fetchError.code === 'PGRST116') {
          setData(null)
          setError(null)
        } else {
          setError(fetchError.message)
        }
      } else if (scoreData) {
        setData(scoreData)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch live scores')
    } finally {
      setIsLoading(false)
    }
  }, [fixtureId])

  useEffect(() => {
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
  }, [poll])

  // Compute staleness from the latest data
  const isStale = data?.last_polled_at
    ? Date.now() - new Date(data.last_polled_at).getTime() > STALE_THRESHOLD_MS
    : false

  return { data, isLoading, error, isStale }
}

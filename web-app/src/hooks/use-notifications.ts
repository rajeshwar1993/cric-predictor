'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default number of notifications returned by the panel fetch.
 * Mirrors `DEFAULT_NOTIFICATION_LIMIT` in the DAL so both server and
 * client paths return the same window.
 */
const DEFAULT_NOTIFICATION_LIMIT = 20

/**
 * How long the "new notification" pulse animation stays active after
 * a realtime INSERT event. Matches one Tailwind `animate-pulse` cycle
 * (2s) so the bell settles at the end of a clean cycle.
 */
const PULSE_DURATION_MS = 2000

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseNotificationsResult {
  /** Latest notifications (newest first). Up to 20. */
  notifications: Notification[]
  /** Unread count for the badge. */
  unreadCount: number
  /** True during the initial unread-count fetch. */
  isLoadingCount: boolean
  /** True during a panel notifications fetch. */
  isLoadingList: boolean
  /** Error message from the last fetch, if any. */
  error: string | null
  /** True briefly after a realtime INSERT so the bell can pulse. */
  pulse: boolean
  /** Imperative: fetch the latest 20 notifications for the panel. */
  fetchList: () => Promise<void>
  /** Imperative: clear the pulse animation flag (e.g. when the bell is opened). */
  clearPulse: () => void
  /** Optimistically flip a single notification to read in local state. */
  markReadLocally: (id: string) => void
  /**
   * Revert a previous `markReadLocally` call for a single notification.
   * Used when the server action fails and we need to restore the unread
   * state in local state.
   */
  revertMarkReadLocally: (id: string) => void
  /** Optimistically flip every notification to read in local state. */
  markAllReadLocally: () => void
  /**
   * Restore a full unread snapshot after a failed `markAllNotificationsAsRead`.
   * Takes the list and count captured before the optimistic flip so the
   * panel can roll back cleanly.
   */
  restoreNotifications: (
    previousNotifications: Notification[],
    previousUnreadCount: number,
  ) => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribe to the current user's notifications in realtime.
 *
 * - Seeds `unreadCount` from an initial fetch (or a server-provided baseline).
 * - Subscribes to `postgres_changes` on `v2_notifications` filtered by
 *   `user_id = eq.{userId}` so INSERT / UPDATE / DELETE events refresh
 *   the unread count.
 * - Sets a `pulse` flag for `PULSE_DURATION_MS` after any INSERT so the
 *   bell can animate once, then settle.
 * - Exposes `fetchList()` for the panel, which populates `notifications`
 *   with the latest 20 rows in descending order.
 * - Exposes `markReadLocally` / `markAllReadLocally` for optimistic UI
 *   updates so clicks feel instant.
 *
 * All reads run as the logged-in user via the browser Supabase client,
 * so RLS enforces that only the user's own rows are visible.
 *
 * @see docs/architecture.md §"Notifications (Realtime)"
 * @see docs/stories/NTF-001-notification-bell-panel.md
 */
export function useNotifications(
  userId: string,
  initialUnreadCount: number = 0,
): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoadingCount, setIsLoadingCount] = useState(true)
  // Start as `true` so the panel shows the skeleton on first open instead
  // of flashing the empty state for one paint before the fetch resolves.
  // The first call to `fetchList` flips this to `false` on completion.
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)

  // Stable Supabase client across renders so we don't churn realtime
  // channels when the component re-renders.
  const supabaseRef = useRef(createBrowserClient())
  // Guard against setting state after unmount.
  const activeRef = useRef(true)

  // ----- fetchUnreadCount (internal) -------------------------------------

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count, error: countError } = await supabaseRef.current
        .from('v2_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (!activeRef.current) return

      if (countError) {
        setError(countError.message)
        return
      }
      setUnreadCount(count ?? 0)
      setError(null)
    } catch (err) {
      if (!activeRef.current) return
      setError(
        err instanceof Error ? err.message : 'Failed to fetch unread count',
      )
    } finally {
      if (activeRef.current) setIsLoadingCount(false)
    }
  }, [userId])

  // ----- fetchList (public) ----------------------------------------------

  const fetchList = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const { data, error: listError } = await supabaseRef.current
        .from('v2_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(DEFAULT_NOTIFICATION_LIMIT)

      if (!activeRef.current) return

      if (listError) {
        setError(listError.message)
        return
      }
      setNotifications(data ?? [])
      setError(null)
    } catch (err) {
      if (!activeRef.current) return
      setError(
        err instanceof Error ? err.message : 'Failed to fetch notifications',
      )
    } finally {
      if (activeRef.current) setIsLoadingList(false)
    }
  }, [userId])

  // ----- Optimistic helpers ----------------------------------------------

  const markReadLocally = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )
    setUnreadCount((current) => Math.max(0, current - 1))
  }, [])

  const revertMarkReadLocally = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, is_read: false } : n)),
    )
    setUnreadCount((current) => current + 1)
  }, [])

  const markAllReadLocally = useCallback(() => {
    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  const restoreNotifications = useCallback(
    (previousNotifications: Notification[], previousUnreadCount: number) => {
      setNotifications(previousNotifications)
      setUnreadCount(previousUnreadCount)
    },
    [],
  )

  const clearPulse = useCallback(() => {
    setPulse(false)
  }, [])

  // ----- Realtime subscription -------------------------------------------

  useEffect(() => {
    activeRef.current = true
    const supabase = supabaseRef.current

    // Seed the unread count. We always refetch on mount even when the
    // caller passed `initialUnreadCount` because the SSR value may be
    // stale by the time the client hydrates.
    fetchUnreadCount()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'v2_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!activeRef.current) return

          // Merge realtime rows into local `notifications` state so an
          // open panel reflects the event immediately. INSERT prepends
          // the new row (deduped, capped at DEFAULT_NOTIFICATION_LIMIT),
          // UPDATE merges payload.new into the matching row.
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as Notification
            setNotifications((current) => {
              if (current.some((n) => n.id === newRow.id)) return current
              return [newRow, ...current].slice(0, DEFAULT_NOTIFICATION_LIMIT)
            })
            setPulse(true)
            window.setTimeout(() => {
              if (activeRef.current) setPulse(false)
            }, PULSE_DURATION_MS)
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Notification
            setNotifications((current) =>
              current.map((n) => (n.id === updated.id ? updated : n)),
            )
          }

          // Refresh the count on any change.
          fetchUnreadCount()
        },
      )
      .subscribe()

    // Re-sync the unread count when the tab becomes visible again so we
    // catch any events that might have been dropped while hidden. The
    // list is not re-fetched here — it only hydrates on panel open.
    const handleVisibilityChange = () => {
      if (!activeRef.current) return
      if (document.visibilityState === 'visible') {
        void fetchUnreadCount()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      activeRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [userId, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    isLoadingCount,
    isLoadingList,
    error,
    pulse,
    fetchList,
    clearPulse,
    markReadLocally,
    revertMarkReadLocally,
    markAllReadLocally,
    restoreNotifications,
  }
}

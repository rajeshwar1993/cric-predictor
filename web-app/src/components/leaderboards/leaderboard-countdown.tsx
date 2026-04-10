'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LeaderboardCountdownProps {
  /** ISO 8601 datetime string for the prediction deadline */
  deadline: string
  /** Called when the countdown reaches zero */
  onExpire?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TimeRemaining {
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

function getTimeRemaining(deadline: string): TimeRemaining {
  const diff = new Date(deadline).getTime() - Date.now()

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true }
  }

  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { hours, minutes, seconds, isExpired: false }
}

function padTwo(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * Format a TimeRemaining into the displayed string (H:MM:SS or MM:SS). Used
 * both for the initial render and to throttle setState in the tick loop.
 */
function formatTimeString(t: TimeRemaining): string {
  return t.hours > 0
    ? `${t.hours}:${padTwo(t.minutes)}:${padTwo(t.seconds)}`
    : `${padTwo(t.minutes)}:${padTwo(t.seconds)}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * LeaderboardCountdown — shown before predictions lock.
 *
 * Displays a countdown timer to the prediction deadline with a message
 * explaining that the leaderboard becomes visible when predictions lock.
 *
 * When the countdown expires, shows a "Predictions are now locked" message
 * with a refresh button, and fires the optional `onExpire` callback.
 *
 * @see docs/stories/LDB-001-match-leaderboard.md
 */
export function LeaderboardCountdown({ deadline, onExpire }: LeaderboardCountdownProps) {
  // Lazy initializer: compute the initial snapshot once per mount and reuse
  // it for both `remaining` and `hasExpired` (was previously computed twice).
  const [remaining, setRemaining] = useState<TimeRemaining>(() =>
    getTimeRemaining(deadline),
  )
  const [hasExpired, setHasExpired] = useState<boolean>(
    () => getTimeRemaining(deadline).isExpired,
  )
  // Screen reader announcement — only updated at meaningful intervals (every minute)
  const [srAnnouncement, setSrAnnouncement] = useState('')

  // Refs used to throttle re-renders: only re-render when the displayed
  // string actually changes, not on every 1s tick. Initialized to null and
  // seeded inside the tick effect — we never read them during render.
  const lastDisplayedRef = useRef<string | null>(null)
  const lastMinuteRef = useRef<number | null>(null)

  useEffect(() => {
    if (hasExpired) return

    // Seed the throttling refs from the current snapshot before the first
    // tick. Doing this inside the effect keeps the render pass pure.
    const seed = getTimeRemaining(deadline)
    lastDisplayedRef.current = formatTimeString(seed)
    lastMinuteRef.current = seed.minutes

    const tick = () => {
      const next = getTimeRemaining(deadline)

      if (next.isExpired) {
        setHasExpired(true)
        setRemaining(next)
        return
      }

      // Throttle: only setState when the visible string has changed.
      // Because the display shows seconds, this means once per second when
      // visible — but it avoids setState churn if a future change makes
      // the display coarser (e.g., dropping seconds).
      const nextString = formatTimeString(next)
      if (nextString !== lastDisplayedRef.current) {
        lastDisplayedRef.current = nextString
        setRemaining(next)
      }

      // Screen-reader announcement: only fire when the minutes tier changes
      // so aria-live stays quiet. Also announce the final 30s heads-up.
      const totalSecs = next.hours * 3600 + next.minutes * 60 + next.seconds
      const minuteChanged = next.minutes !== lastMinuteRef.current
      if (minuteChanged || totalSecs === 30) {
        lastMinuteRef.current = next.minutes
        const parts: string[] = []
        if (next.hours > 0) parts.push(`${next.hours} hour${next.hours !== 1 ? 's' : ''}`)
        if (next.minutes > 0) parts.push(`${next.minutes} minute${next.minutes !== 1 ? 's' : ''}`)
        if (parts.length === 0) parts.push(`${next.seconds} seconds`)
        setSrAnnouncement(`${parts.join(' and ')} until predictions lock`)
      }
    }

    const intervalId = setInterval(tick, 1000)
    return () => clearInterval(intervalId)
  }, [deadline, hasExpired])

  // Fire onExpire callback once when countdown reaches zero
  useEffect(() => {
    if (hasExpired && onExpire) {
      onExpire()
    }
  }, [hasExpired, onExpire])

  const handleRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  if (hasExpired) {
    return (
      <Card
        className="flex flex-col items-center gap-4 py-8"
        role="status"
        aria-label="Predictions locked"
      >
        <Clock className="size-10 text-text-muted" aria-hidden="true" />

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-display text-h3 font-bold uppercase text-text-primary">
            Predictions are now locked
          </p>
          <p className="text-body-sm text-text-muted">
            Refresh to see the leaderboard
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 size-4" aria-hidden="true" />
          Refresh page
        </Button>
      </Card>
    )
  }

  const timeString = formatTimeString(remaining)

  return (
    <Card
      className="flex flex-col items-center gap-4 py-8"
      role="status"
      aria-label="Leaderboard countdown"
    >
      <Clock className="size-10 text-text-muted" aria-hidden="true" />

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-display text-h3 font-bold uppercase text-text-primary">
          Leaderboard locked
        </p>
        <p className="text-body-sm text-text-muted">
          Leaderboard visible when predictions lock
        </p>
      </div>

      <div className="font-display text-2xl font-bold tabular-nums text-sunburst-yellow">
        {timeString}
      </div>

      {/* Hidden screen reader announcement — updates only at minute boundaries */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </span>
    </Card>
  )
}

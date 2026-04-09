'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StaleDataBadgeProps {
  /** The ISO timestamp when the data was last polled */
  lastPolledAt: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * StaleDataBadge — shows a yellow warning badge when live score data
 * is older than expected. Displays "Last updated Xm ago".
 *
 * Uses a 30s interval to keep the displayed time fresh. This is a
 * client component because it needs `Date.now()` which is impure.
 *
 * @see docs/stories/MTCH-002-live-scorecard.md
 */
export function StaleDataBadge({ lastPolledAt }: StaleDataBadgeProps) {
  const [minutesAgo, setMinutesAgo] = useState(() =>
    Math.floor((Date.now() - new Date(lastPolledAt).getTime()) / 60_000),
  )

  useEffect(() => {
    // Recompute every 30 seconds so the badge stays up-to-date
    const update = () => {
      setMinutesAgo(
        Math.floor((Date.now() - new Date(lastPolledAt).getTime()) / 60_000),
      )
    }
    update()
    const intervalId = setInterval(update, 30_000)
    return () => clearInterval(intervalId)
  }, [lastPolledAt])

  return (
    <Badge
      variant="yellow"
      aria-label={`Data last updated ${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`}
    >
      Last updated {minutesAgo}m ago
    </Badge>
  )
}

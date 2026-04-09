'use client'

import { formatMatchTime } from '@/lib/format-date'

interface MatchTimeProps {
  /** ISO 8601 datetime string */
  datetime: string
  /** Optional additional CSS class names */
  className?: string
}

/**
 * Client Component that renders a formatted match time.
 *
 * Must be client-side because `formatMatchTime()` depends on the
 * browser's timezone to show "Today", "Tomorrow", or the full date
 * with the user's local time.
 */
export function MatchTime({ datetime, className }: MatchTimeProps) {
  return (
    <time dateTime={datetime} className={className}>
      {formatMatchTime(datetime)}
    </time>
  )
}

'use client'

import { formatDeadline } from '@/lib/format-date'

interface MatchDeadlineProps {
  /** ISO 8601 datetime string for the relevant time (window open or deadline close) */
  deadline: string
  /** The label prefix to display before the formatted time */
  label: 'Opens at' | 'Closes at'
  /** Optional additional CSS class names */
  className?: string
}

/**
 * Client Component that renders the prediction deadline / window time.
 *
 * Must be client-side because `formatDeadline()` depends on the
 * browser's timezone for time display.
 *
 * - "Opens at {time}" — prediction window hasn't opened yet
 * - "Closes at {time}" — prediction window is open
 */
export function MatchDeadline({ deadline, label, className }: MatchDeadlineProps) {
  return (
    <span className={className}>
      {label} {formatDeadline(deadline)}
    </span>
  )
}

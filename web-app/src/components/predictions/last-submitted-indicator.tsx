'use client'

import { formatMatchTime } from '@/lib/format-date'

/**
 * Displays when predictions were last submitted.
 *
 * Must be a client component because date formatting depends on
 * the browser's timezone/locale — rendering on the server would
 * produce a different string and cause a hydration mismatch.
 */
export function LastSubmittedIndicator({ submittedAt }: { submittedAt: string }) {
  return (
    <span className="text-caption text-text-muted">
      Last saved{' '}
      <time dateTime={submittedAt}>
        {formatMatchTime(submittedAt)}
      </time>
    </span>
  )
}

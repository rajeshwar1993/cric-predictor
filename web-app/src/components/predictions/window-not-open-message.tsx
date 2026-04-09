'use client'

import Link from 'next/link'
import { formatMatchTime } from '@/lib/format-date'
import { Button } from '@/components/ui/button'

/**
 * Displayed when the prediction window hasn't opened yet.
 *
 * Must be a client component because date formatting depends on
 * the browser's timezone/locale — rendering on the server would
 * produce a different string and cause a hydration mismatch.
 */
export function WindowNotOpenMessage({
  opensAt,
  gangId,
}: {
  opensAt: string
  gangId: string
}) {
  return (
    <div className="mt-12 flex flex-col items-center gap-4 text-center">
      <p className="text-body text-text-secondary">
        Predictions open at{' '}
        <time dateTime={opensAt} className="font-semibold text-text-primary">
          {formatMatchTime(opensAt)}
        </time>
      </p>
      <Link href={`/group/${gangId}`}>
        <Button variant="secondary" size="sm">
          Back to gang
        </Button>
      </Link>
    </div>
  )
}

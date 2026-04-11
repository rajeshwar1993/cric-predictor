'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { captureError } from '@/lib/analytics/error-handler'

/**
 * Global error boundary.
 *
 * Next.js App Router automatically renders this component whenever an
 * uncaught error escapes any route segment that doesn't declare its own
 * `error.tsx`. Must be a Client Component per the App Router conventions
 * so it can receive the `reset` callback and subscribe to effects.
 *
 * Standalone shell (no nav / no footer) mirrors the 404 page — we can't
 * assume the (app) layout loaded successfully when this fires, so we
 * render a self-contained recovery screen: BRAGG wordmark + `EmptyState`
 * with a "Try again" button (calls `reset()`) and a "Dashboard" escape
 * hatch for persistent failures.
 *
 * Fires `captureError` to PostHog so the failure is visible in analytics.
 * The `digest` field (when present) is the server-side request id Next.js
 * attaches to the error, useful for cross-referencing server logs.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 * @see docs/stories/PUB-003-error-pages.md
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureError(error, {
      source: 'GlobalErrorPage',
      metadata: { digest: error.digest },
    })
  }, [error])

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-concrete-black p-4"
      role="alert"
      aria-live="polite"
    >
      <p className="text-h1 text-bragg-lime">BRAGG</p>

      <EmptyState
        icon={AlertTriangle}
        headline="Something went wrong"
        description="We couldn't load this page. Please try again."
        action={
          <div className="flex gap-3">
            <Button type="button" variant="default" onClick={reset}>
              Try again
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}

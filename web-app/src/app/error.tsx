'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

import { BraggWordmark } from '@/components/ui/bragg-wordmark'
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
 * render a self-contained recovery screen. The BRAGG wordmark IS the
 * page `<h1>` so screen-reader users land on a single meaningful heading.
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
  const pathname = usePathname()

  useEffect(() => {
    captureError(error, {
      source: 'GlobalErrorPage',
      metadata: { digest: error.digest, pathname },
    })
  }, [error, pathname])

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-8 p-4"
      role="alert"
      aria-live="polite"
    >
      <BraggWordmark as="h1" />

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
    </main>
  )
}

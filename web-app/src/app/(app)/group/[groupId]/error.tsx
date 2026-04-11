'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { captureError } from '@/lib/analytics/error-handler'

/** After this many failed resets we stop offering Try Again and surface a
 *  dashboard escape hatch so the user can't get stuck in a reset loop. */
const MAX_RESET_ATTEMPTS = 2

/**
 * Route-level error boundary for `/group/[groupId]`.
 *
 * Next.js App Router automatically renders this component when any server
 * code inside the group segment (page, layout, or data fetch) throws. Must
 * be a Client Component per the App Router conventions.
 *
 * Scoped to the group segment so the (app) layout — and its NavBar — stay
 * mounted while the error UI renders. Uses `PageWrapper` (not a standalone
 * full-viewport shell) so the NavBar remains accessible and the user can
 * navigate away without a hard reload.
 *
 * Reset-loop protection: after `MAX_RESET_ATTEMPTS` consecutive failures we
 * stop offering the Try Again button so the user can always escape a
 * persistent failure via the "Back to Dashboard" link.
 *
 * Fires `captureError` to PostHog with the server-side `digest` (if
 * present) so the failure is visible in analytics and cross-referenceable
 * with server logs.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 * @see web-app/src/app/(app)/profile/error.tsx — sibling pattern
 * @see docs/stories/PUB-003-error-pages.md
 */
export default function GroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Track reset attempts across re-renders. A ref keeps the count stable
  // without causing an extra render loop, and a state counter re-renders
  // once we hit the limit so the fallback UI can swap in.
  const attemptsRef = useRef(0)
  const [attempts, setAttempts] = useState(0)
  const hasExhaustedResets = attempts >= MAX_RESET_ATTEMPTS

  useEffect(() => {
    captureError(error, {
      source: 'GroupError',
      metadata: { digest: error.digest },
    })
  }, [error])

  function handleReset() {
    attemptsRef.current += 1
    setAttempts(attemptsRef.current)
    reset()
  }

  return (
    <PageWrapper className="py-8">
      <section
        className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
        role="alert"
        aria-live="polite"
      >
        <EmptyState
          icon={AlertTriangle}
          headline="Something went wrong"
          description={
            hasExhaustedResets
              ? "We've tried a few times and it keeps failing. Head back to the dashboard and try again later."
              : "We couldn't load this gang. Please try again."
          }
          action={
            <div className="flex gap-3">
              {hasExhaustedResets ? null : (
                <Button type="button" variant="default" onClick={handleReset}>
                  Try again
                </Button>
              )}
              <Button variant="secondary" asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          }
        />
      </section>
    </PageWrapper>
  )
}

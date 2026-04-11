'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { useResetAttempts } from '@/hooks/use-reset-attempts'
import { captureError } from '@/lib/analytics/error-handler'

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
 * Reset-loop protection via the shared `useResetAttempts` hook: after the
 * default max attempts we stop offering "Try again" so the user can always
 * escape via "Back to Dashboard". The description copy moves through three
 * states (initial → mid-retry → exhausted) so the user always knows where
 * they are in the loop.
 *
 * Fires `captureError` to PostHog with the server-side `digest` and the
 * current pathname (so triage can attribute the failure to a specific
 * gang / sub-route without grepping logs).
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
  const pathname = usePathname()
  const { attempts, hasExhausted, handleReset } = useResetAttempts(reset)

  useEffect(() => {
    captureError(error, {
      source: 'GroupError',
      metadata: { digest: error.digest, pathname },
    })
  }, [error, pathname])

  let description: string
  if (hasExhausted) {
    description =
      "We've tried a few times and it keeps failing. Head back to the dashboard and try again later."
  } else if (attempts > 0) {
    description =
      "Still failing. One more try and we'll point you back to the dashboard."
  } else {
    description = "We couldn't load this gang. Please try again."
  }

  return (
    <PageWrapper className="pt-8">
      <section
        className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
        role="alert"
        aria-live="polite"
      >
        <EmptyState
          icon={AlertTriangle}
          headline="Something went wrong"
          description={description}
          action={
            <div className="flex gap-3">
              {hasExhausted ? null : (
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

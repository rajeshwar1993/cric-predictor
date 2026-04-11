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
 * Route-level error boundary for `/profile`.
 *
 * Next.js App Router automatically renders this component when any server
 * code inside the `/profile` segment (page, layout, or data fetch) throws.
 * Must be a Client Component per the App Router conventions.
 *
 * Uses design-system primitives (PageWrapper, EmptyState, Button) and tokens
 * only — no hardcoded colors. The `reset()` callback re-runs the segment so
 * a transient failure (network blip, Supabase hiccup) can recover without a
 * full page reload.
 *
 * Reset-loop protection via the shared `useResetAttempts` hook: after the
 * default max attempts we stop offering "Try again" and surface a dashboard
 * escape hatch instead, so the user can always recover from a persistent
 * failure.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 * @see docs/stories/PRF-001-profile-page.md
 */
export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const { hasExhausted, handleReset } = useResetAttempts(reset)

  useEffect(() => {
    // captureError already console.errors in development with the source
    // prefix (`[ProfileError]`), so a separate console.error here would
    // duplicate the dev output. The digest (if present) is the server-side
    // request id Next.js attaches to the error — useful for cross-
    // referencing server logs.
    captureError(error, {
      source: 'ProfileError',
      metadata: { digest: error.digest, pathname },
    })
  }, [error, pathname])

  return (
    <PageWrapper className="py-8">
      <h1 className="text-h1 text-text-primary">PROFILE</h1>

      <section
        className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
        role="alert"
        aria-live="polite"
      >
        <EmptyState
          icon={AlertTriangle}
          headline="Couldn't load your profile"
          description={
            hasExhausted
              ? "We've tried a few times and it keeps failing. Head back to the dashboard and try again later."
              : "Something went sideways on our end. Give it another shot — if it keeps failing, refresh the page."
          }
          action={
            hasExhausted ? (
              <Button type="button" variant="default" asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <Button type="button" variant="default" onClick={handleReset}>
                Try again
              </Button>
            )
          }
        />
      </section>
    </PageWrapper>
  )
}

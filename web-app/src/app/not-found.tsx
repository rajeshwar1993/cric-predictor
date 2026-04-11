import Link from 'next/link'
import { SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/**
 * Global 404 Not Found page.
 *
 * Rendered by Next.js App Router whenever a request falls through without
 * matching any route segment, or when server code calls `notFound()`. This
 * file lives at the root of `app/` so it catches ALL unmatched routes and
 * returns an HTTP 404 status automatically.
 *
 * Standalone shell (no nav / no footer) so the user sees a clean recovery
 * screen regardless of which segment they landed in. Matches the visual
 * language of the login / landing pages — BRAGG wordmark above an
 * `EmptyState` with a single "Go to Dashboard" escape hatch.
 *
 * Server Component: 404s are expected, so no client interactivity or
 * error-capture telemetry is needed here.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 * @see docs/stories/PUB-003-error-pages.md
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-concrete-black p-4">
      <p className="text-h1 text-bragg-lime">BRAGG</p>

      <EmptyState
        icon={SearchX}
        headline="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}

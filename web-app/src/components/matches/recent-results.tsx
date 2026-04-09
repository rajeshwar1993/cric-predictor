import { Trophy } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { getRecentResults } from '@/lib/dal/fixtures'
import { EmptyState } from '@/components/ui/empty-state'
import { ResultCard } from './result-card'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecentResultsProps {
  /** The gang ID to fetch results for */
  gangId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RecentResults — server component that fetches and displays
 * the last 3 completed/resolved/abandoned/no_result fixtures as ResultCards.
 *
 * Shows an empty state when no recent results are available.
 *
 * @see docs/stories/MTCH-003-recent-results.md
 */
export async function RecentResults({ gangId }: RecentResultsProps) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const fixtures = await getRecentResults(gangId, user.id)

  if (fixtures.length === 0) {
    return (
      <section className="mt-8" aria-label="Recent results">
        <h2 className="text-caption text-text-muted mb-4">RECENT RESULTS</h2>
        <EmptyState
          icon={Trophy}
          headline="No results yet"
          description="Completed matches and your predictions will show up here."
        />
      </section>
    )
  }

  return (
    <section className="mt-8" aria-label="Recent results">
      <h2 className="text-caption text-text-muted mb-4">RECENT RESULTS</h2>
      <div className="flex flex-col gap-4">
        {fixtures.map((fixture) => (
          <ResultCard
            key={fixture.id}
            fixture={fixture}
            gangId={gangId}
          />
        ))}
      </div>
    </section>
  )
}

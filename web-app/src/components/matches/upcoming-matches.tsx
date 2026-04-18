import { Calendar } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { getUpcomingFixtures } from '@/lib/dal/fixtures'
import { EmptyState } from '@/components/ui/empty-state'
import { MatchCard } from './match-card'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UpcomingMatchesProps {
  /** The gang ID to fetch fixtures for */
  gangId: string
  /** Total approved members in the gang */
  totalMembers: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * UpcomingMatches — server component that fetches and displays
 * the next 3 upcoming/live fixtures as MatchCards.
 *
 * Shows an empty state when no upcoming matches are available.
 *
 * `hasPredicted` is derived from the `predictedMembers` array returned by
 * the DAL — no separate v2_predictions query is needed.
 *
 * @see docs/stories/MTCH-001-upcoming-matches.md
 */
export async function UpcomingMatches({
  gangId,
  totalMembers,
}: UpcomingMatchesProps) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const fixtures = await getUpcomingFixtures(gangId)

  if (fixtures.length === 0) {
    return (
      <section className="mt-8" aria-label="Upcoming matches">
        <h2 className="text-caption text-text-muted mb-4">UPCOMING MATCHES</h2>
        <EmptyState
          icon={Calendar}
          headline="No upcoming matches"
          description="Check back later for the next fixtures."
        />
      </section>
    )
  }

  return (
    <section className="mt-8" aria-label="Upcoming matches">
      <h2 className="text-caption text-text-muted mb-4">UPCOMING MATCHES</h2>
      <div className="flex flex-col gap-4">
        {fixtures.map((fixture, i) => {
          // Derive hasPredicted from the predictedMembers array
          const hasPredicted = user
            ? fixture.predictedMembers.some((m) => m.userId === user.id)
            : false

          return (
            <div
              key={fixture.id}
              className="motion-safe:stagger-item"
              style={{ '--stagger-index': i } as React.CSSProperties}
            >
              <MatchCard
                fixture={fixture}
                gangId={gangId}
                hasPredicted={hasPredicted}
                totalMembers={totalMembers}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

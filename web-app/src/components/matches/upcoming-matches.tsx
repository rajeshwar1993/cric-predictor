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

  // Check which fixtures the current user has predicted for.
  // We look at the predicted user IDs that come from the RPC — but since
  // the DAL doesn't return per-user prediction status, we need a quick check.
  // For now, we'll query predictions for the current user across all fixture IDs.
  let predictedFixtureIds = new Set<string>()
  if (user) {
    try {
      const fixtureIds = fixtures.map((f) => f.id)
      const { data: predictions } = await supabase
        .from('v2_predictions')
        .select('fixture_id')
        .eq('user_id', user.id)
        .eq('gang_id', gangId)
        .in('fixture_id', fixtureIds)

      if (predictions) {
        predictedFixtureIds = new Set(predictions.map((p) => p.fixture_id))
      }
    } catch {
      // Non-critical: if we can't fetch predictions, show as unpredicted
    }
  }

  return (
    <section className="mt-8" aria-label="Upcoming matches">
      <h2 className="text-caption text-text-muted mb-4">UPCOMING MATCHES</h2>
      <div className="flex flex-col gap-4">
        {fixtures.map((fixture, i) => (
          <div
            key={fixture.id}
            className="motion-safe:stagger-item"
            style={{ '--stagger-index': i } as React.CSSProperties}
          >
            <MatchCard
              fixture={fixture}
              gangId={gangId}
              hasPredicted={predictedFixtureIds.has(fixture.id)}
              totalMembers={totalMembers}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

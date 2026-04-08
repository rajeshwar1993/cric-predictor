import { Calendar } from 'lucide-react'
import { getUpcomingMatchesForGang, type UpcomingMatch } from '@/lib/actions/dal-matches'
import { EmptyState } from '@/components/ui/empty-state'
import { UpcomingMatchCard } from '@/components/matches/upcoming-match-card'
import { PredictionStatusIndicator } from '@/components/matches/prediction-status-indicator'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UpcomingMatchesSectionProps {
  gangId: string
  /** Approved gang members for prediction status indicator */
  members?: Array<{ userId: string; displayName: string }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWindowOpenAndPreDeadline(
  startDatetime: string,
  predictionDeadlineMins: number,
): boolean {
  const start = new Date(startDatetime)
  const deadline = new Date(start.getTime() - predictionDeadlineMins * 60 * 1000)
  const windowOpensAt = new Date(start.getTime() - 12 * 60 * 60 * 1000)
  const now = new Date()
  return now >= windowOpensAt && now < deadline
}

/**
 * Returns the fixtureId of the first match if prediction status should be shown,
 * or null otherwise.
 */
function computeFirstFixtureIdForStatus(
  matches: UpcomingMatch[],
  resolvedMembers: Array<{ userId: string; displayName: string }>,
): string | null {
  if (matches.length === 0 || resolvedMembers.length === 0) return null
  const first = matches[0]
  if (first === undefined) return null
  if (first.status !== 'upcoming') return null
  if (!isWindowOpenAndPreDeadline(first.startDatetime, first.predictionDeadlineMins)) return null
  return first.fixtureId
}

// ---------------------------------------------------------------------------
// Server Component
// ---------------------------------------------------------------------------

export async function UpcomingMatchesSection({ gangId, members }: UpcomingMatchesSectionProps) {
  const matches = await getUpcomingMatchesForGang(gangId)

  // Determine if we should show prediction status for the first match
  const resolvedMembers = members ?? []
  const firstFixtureId = computeFirstFixtureIdForStatus(matches, resolvedMembers)

  return (
    <section aria-label="Upcoming matches" className="flex flex-col gap-[var(--sp-3)]">
      <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
        Upcoming Matches
      </h2>

      {matches.length === 0 ? (
        <EmptyState
          icon={<Calendar size={32} strokeWidth={1.5} />}
          title="No matches on the horizon"
          description="Sit tight"
        />
      ) : (
        <div className="flex flex-col gap-[var(--sp-3)]">
          {matches.map((match, index) => (
            <UpcomingMatchCard
              key={match.fixtureId}
              match={match}
              gangId={gangId}
              statusIndicator={
                index === 0 && firstFixtureId !== null ? (
                  <PredictionStatusIndicator
                    gangId={gangId}
                    fixtureId={firstFixtureId}
                    members={resolvedMembers}
                    isVisible={true}
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}

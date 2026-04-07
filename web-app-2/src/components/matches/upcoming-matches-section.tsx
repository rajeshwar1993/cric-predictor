import { Calendar } from 'lucide-react'
import { getUpcomingMatchesForGang } from '@/lib/actions/dal-matches'
import { EmptyState } from '@/components/ui/empty-state'
import { UpcomingMatchCard } from '@/components/matches/upcoming-match-card'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UpcomingMatchesSectionProps {
  gangId: string
}

// ---------------------------------------------------------------------------
// Server Component
// ---------------------------------------------------------------------------

export async function UpcomingMatchesSection({ gangId }: UpcomingMatchesSectionProps) {
  const matches = await getUpcomingMatchesForGang(gangId)

  return (
    <section aria-label="Upcoming matches" className="flex flex-col gap-[var(--sp-3)]">
      <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
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
          {matches.map((match) => (
            <UpcomingMatchCard key={match.fixtureId} match={match} gangId={gangId} />
          ))}
        </div>
      )}
    </section>
  )
}

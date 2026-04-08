import { getRecentResultsForGang } from '@/lib/actions/dal-matches'
import { ResultCard } from './result-card'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecentResultsSectionProps {
  gangId: string
  userId: string
}

// ---------------------------------------------------------------------------
// Server Component
// ---------------------------------------------------------------------------

export async function RecentResultsSection({ gangId, userId }: RecentResultsSectionProps) {
  const results = await getRecentResultsForGang(gangId, userId, 3)

  if (results.length === 0) {
    return null
  }

  return (
    <section aria-label="Recent results" className="flex flex-col gap-[var(--sp-3)]">
      <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
        Recent Results
      </h2>

      <div className="flex flex-col gap-[var(--sp-3)]">
        {results.map((result) => (
          <ResultCard key={result.fixtureId} result={result} gangId={gangId} />
        ))}
      </div>
    </section>
  )
}

import type { RateLimitOverview } from '@/lib/dal/admin/rate-limits'

interface RateLimitOverviewCardsProps {
  overview: RateLimitOverview
}

export function RateLimitOverviewCards({
  overview,
}: RateLimitOverviewCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-wire bg-dark-concrete p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Total Entries
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary">
            {overview.totalEntries.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-wire bg-dark-concrete p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Active (Last Hour)
          </p>
          <p className="mt-1 text-2xl font-bold text-bragg-lime">
            {overview.activeEntries.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="rounded-md border border-mid-concrete bg-concrete-black px-4 py-3">
        <p className="text-xs text-text-muted">
          Rate limiting uses a database-backed sliding window approach. Each
          entry tracks a user action within a time window. Active entries are
          those with a window_start within the last hour. Historical entries are
          retained for audit purposes.
        </p>
      </div>
    </div>
  )
}

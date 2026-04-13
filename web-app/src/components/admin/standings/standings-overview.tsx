import type { StandingsOverview } from '@/lib/dal/admin/standings'

interface StandingsOverviewCardsProps {
  overview: StandingsOverview
}

export function StandingsOverviewCards({ overview }: StandingsOverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border border-wire bg-dark-concrete p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Season Standings Rows
        </p>
        <p className="mt-1 text-2xl font-bold text-text-primary">
          {overview.seasonStandingsRows.toLocaleString()}
        </p>
      </div>
      <div className="rounded-lg border border-wire bg-dark-concrete p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Fixture Standings Rows
        </p>
        <p className="mt-1 text-2xl font-bold text-text-primary">
          {overview.fixtureStandingsRows.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

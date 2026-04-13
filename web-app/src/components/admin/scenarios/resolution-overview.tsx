import type { ResolutionOverview } from '@/lib/dal/admin/scenarios'
import { cn } from '@/lib/utils'

interface ResolutionOverviewCardsProps {
  overview: ResolutionOverview
}

const cards = [
  { key: 'total' as const, label: 'Total Scenarios', color: 'text-text-primary' },
  { key: 'resolved' as const, label: 'Resolved', color: 'text-green-400' },
  { key: 'voided' as const, label: 'Voided', color: 'text-yellow-400' },
  { key: 'pending' as const, label: 'Pending', color: 'text-orange-400' },
] as const

export function ResolutionOverviewCards({ overview }: ResolutionOverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-lg border border-wire bg-dark-concrete p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {card.label}
          </p>
          <p className={cn('mt-1 text-2xl font-bold', card.color)}>
            {overview[card.key].toLocaleString()}
          </p>
        </div>
      ))}
      <div className="rounded-lg border border-wire bg-dark-concrete p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Resolution Rate
        </p>
        <p className="mt-1 text-2xl font-bold text-bragg-lime">
          {overview.resolutionRate}%
        </p>
      </div>
    </div>
  )
}

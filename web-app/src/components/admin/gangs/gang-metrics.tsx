import type { GangMetrics } from '@/lib/dal/admin/gangs'

interface GangMetricsCardsProps {
  metrics: GangMetrics
}

const cards = [
  { key: 'total' as const, label: 'Total Gangs', color: 'text-text-primary' },
  { key: 'active' as const, label: 'Active', color: 'text-green-400' },
  { key: 'deleted' as const, label: 'Deleted', color: 'text-red-400' },
  { key: 'autoAcceptEnabled' as const, label: 'Auto-Accept On', color: 'text-bragg-lime' },
] as const

export function GangMetricsCards({ metrics }: GangMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {card.label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.color}`}>
            {metrics[card.key].toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}

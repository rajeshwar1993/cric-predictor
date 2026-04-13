import type { UserMetrics } from '@/lib/dal/admin/users'

interface UserMetricsCardsProps {
  metrics: UserMetrics
}

const cards = [
  { key: 'total' as const, label: 'Total Users', color: 'text-text-primary' },
  { key: 'active' as const, label: 'Active', color: 'text-green-400' },
  { key: 'notOnboarded' as const, label: 'Not Onboarded', color: 'text-yellow-400' },
  { key: 'deleted' as const, label: 'Deleted', color: 'text-red-400' },
  { key: 'neverPredicted' as const, label: 'Never Predicted', color: 'text-orange-400' },
] as const

export function UserMetricsCards({ metrics }: UserMetricsCardsProps) {
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
          <p className={`mt-1 text-2xl font-bold ${card.color}`}>
            {metrics[card.key].toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}

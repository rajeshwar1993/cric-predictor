import type { PredictionVolume } from '@/lib/dal/admin/predictions'

interface PredictionVolumeCardsProps {
  volume: PredictionVolume
}

const cards = [
  { key: 'total' as const, label: 'Total Predictions', color: 'text-text-primary' },
  { key: 'today' as const, label: 'Today', color: 'text-bragg-lime' },
  { key: 'thisWeek' as const, label: 'This Week', color: 'text-green-400' },
] as const

export function PredictionVolumeCards({ volume }: PredictionVolumeCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-lg border border-wire bg-dark-concrete p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {card.label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.color}`}>
            {volume[card.key].toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}

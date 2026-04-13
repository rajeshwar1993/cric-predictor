import type { NotificationVolume } from '@/lib/dal/admin/notifications'

interface NotificationVolumeCardsProps {
  volume: NotificationVolume
}

const cards = [
  { key: 'total' as const, label: 'Total Notifications', color: 'text-text-primary' },
  { key: 'today' as const, label: 'Today', color: 'text-bragg-lime' },
  { key: 'unread' as const, label: 'Unread', color: 'text-orange-400' },
] as const

export function NotificationVolumeCards({
  volume,
}: NotificationVolumeCardsProps) {
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

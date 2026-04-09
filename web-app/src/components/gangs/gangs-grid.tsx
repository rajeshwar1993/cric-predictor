import { Users } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { GangCard } from '@/components/gangs/gang-card'
import type { UserGang } from '@/lib/dal/gangs'

export interface GangsGridProps {
  /** Array of gangs the user belongs to */
  gangs: UserGang[]
}

/**
 * Renders a responsive grid of gang cards, or an empty state
 * when the user has no gangs.
 *
 * @see docs/stories/DASH-001-dashboard-page.md
 */
export function GangsGrid({ gangs }: GangsGridProps) {
  if (gangs.length === 0) {
    return (
      <EmptyState
        icon={Users}
        headline="No gangs yet"
        description="Create a gang or join one with an invite code to start predicting."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {gangs.map((gang) => (
        <GangCard
          key={gang.id}
          id={gang.id}
          name={gang.name}
          role={gang.role}
          memberCount={gang.memberCount}
        />
      ))}
    </div>
  )
}

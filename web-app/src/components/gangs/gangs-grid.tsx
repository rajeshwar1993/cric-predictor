import { Users } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { GangCard } from '@/components/gangs/gang-card'
import { CreateGangForm } from '@/components/gangs/create-gang-form'
import type { UserGang } from '@/lib/dal/gangs'

export interface GangsGridProps {
  /** Array of gangs the user belongs to */
  gangs: UserGang[]
}

/**
 * Renders a responsive grid of gang cards, or an empty state
 * when the user has no gangs. The create gang form is prominently
 * shown in the empty state, and below the grid when gangs exist.
 *
 * @see docs/stories/DASH-001-dashboard-page.md
 * @see docs/stories/DASH-002-create-gang.md
 */
export function GangsGrid({ gangs }: GangsGridProps) {
  if (gangs.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <EmptyState
          icon={Users}
          headline="No gangs yet"
          description="Create a gang to start predicting with your friends."
          action={
            <div className="w-full max-w-sm">
              <CreateGangForm />
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
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

      {/* Create gang form below the grid */}
      <section aria-labelledby="create-gang-heading">
        <h2
          id="create-gang-heading"
          className="text-h3 mb-3 text-text-primary"
        >
          Start a new gang
        </h2>
        <div className="max-w-sm">
          <CreateGangForm />
        </div>
      </section>
    </div>
  )
}

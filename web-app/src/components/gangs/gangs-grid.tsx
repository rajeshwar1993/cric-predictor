import { Users } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { GangCard } from '@/components/gangs/gang-card'
import { CreateGangForm } from '@/components/gangs/create-gang-form'
import { JoinGangForm } from '@/components/gangs/join-gang-form'
import type { UserGang } from '@/lib/dal/gangs'

export interface GangsGridProps {
  /** Array of gangs the user belongs to */
  gangs: UserGang[]
}

/**
 * Renders a responsive grid of gang cards, or an empty state
 * when the user has no gangs. The create and join gang forms are
 * prominently shown in the empty state, and below the grid when gangs exist.
 *
 * @see docs/stories/DASH-001-dashboard-page.md
 * @see docs/stories/DASH-002-create-gang.md
 * @see docs/stories/DASH-003-join-gang.md
 */
export function GangsGrid({ gangs }: GangsGridProps) {
  if (gangs.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <EmptyState
          icon={Users}
          headline="No gangs yet"
          description="Create a gang or join one with an invite code to start predicting."
          action={
            <div className="flex w-full max-w-sm flex-col gap-6">
              <CreateGangForm />
              <div className="border-t border-wire pt-4">
                <JoinGangForm />
              </div>
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

      {/* Create and join gang forms below the grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

        <section aria-labelledby="join-gang-heading">
          <h2
            id="join-gang-heading"
            className="text-h3 mb-3 text-text-primary"
          >
            Join a gang
          </h2>
          <div className="max-w-sm">
            <JoinGangForm />
          </div>
        </section>
      </div>
    </div>
  )
}

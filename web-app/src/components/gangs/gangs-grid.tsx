import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
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
            <div className="flex w-full max-w-md flex-col gap-6">
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
    <div className="flex flex-col gap-12">
      <div className={cn(
        'grid grid-cols-1 gap-4',
        gangs.length > 1 && 'sm:grid-cols-2'
      )}>
        {gangs.map((gang, i) => (
          <div
            key={gang.id}
            className="motion-safe:stagger-item"
            style={{ '--stagger-index': i } as React.CSSProperties}
          >
            <GangCard
              id={gang.id}
              name={gang.name}
              role={gang.role}
              memberCount={gang.memberCount}
            />
          </div>
        ))}
      </div>

      {/* Divider between gang list and action forms */}
      <div className="border-t border-wire" />

      {/* Create and join gang forms */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section
          aria-labelledby="create-gang-heading"
          className="rounded-lg border border-wire bg-dark-concrete p-6 shadow-[4px_4px_0_var(--color-lime-shade)]"
        >
          <h2
            id="create-gang-heading"
            className="text-h2 mb-4 text-text-primary"
          >
            Start a new gang
          </h2>
          <CreateGangForm />
        </section>

        <section
          aria-labelledby="join-gang-heading"
          className="rounded-lg border border-wire bg-dark-concrete p-6"
        >
          <h2
            id="join-gang-heading"
            className="text-h2 mb-4 text-text-primary"
          >
            Join a gang
          </h2>
          <JoinGangForm />
        </section>
      </div>
    </div>
  )
}

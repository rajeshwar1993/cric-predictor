import { Target } from 'lucide-react'
import { StatBlock } from '@/components/ui/stat-block'
import { EmptyState } from '@/components/ui/empty-state'
import type { ProfileStats as ProfileStatsData } from '@/lib/dal/profile'

export interface ProfileStatsProps {
  /** Pre-aggregated stats from `getProfileStats`. */
  stats: ProfileStatsData
}

/**
 * ProfileStats — 2x2 grid of StatBlocks summarizing the user's activity
 * across every gang they belong to. When the user has not made any
 * predictions yet, an EmptyState replaces the grid.
 *
 * Pure presentational server component.
 *
 * @see docs/stories/PRF-001-profile-page.md
 */
export function ProfileStats({ stats }: ProfileStatsProps) {
  const isNewUser = stats.totalPredicted === 0

  return (
    <section
      className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
      aria-labelledby="profile-stats-heading"
    >
      <h2
        id="profile-stats-heading"
        className="text-h3 font-bold uppercase tracking-[0.02em] text-text-primary"
      >
        Your Stats
      </h2>

      {isNewUser ? (
        <EmptyState
          className="py-8"
          icon={Target}
          headline="No predictions yet"
          description="Start predicting to see your stats"
        />
      ) : (
        <div
          role="list"
          aria-label="Profile statistics across all gangs"
          className="mt-6 grid grid-cols-2 gap-3 sm:gap-4"
        >
          {/* All four StatBlocks use the default lime background.
              The Electric Street design system restricts StatBlock
              backgrounds to lime or a team color, and the profile page
              is not gang-scoped so there is no team color to apply.
              Coral, sunburst yellow, and ultraviolet all fail WCAG AA
              contrast (4.5:1) against the 11px #111 label at opacity-80,
              so monochromatic lime is the only compliant choice. */}
          <div role="listitem" className="flex justify-center">
            <StatBlock
              className="w-full"
              value={stats.gangsCount}
              label="Gangs"
            />
          </div>
          <div role="listitem" className="flex justify-center">
            <StatBlock
              className="w-full"
              value={stats.totalPredicted}
              label="Predicted"
            />
          </div>
          <div role="listitem" className="flex justify-center">
            <StatBlock
              className="w-full"
              value={`${Math.round(stats.accuracy)}%`}
              label="Accuracy"
            />
          </div>
          <div role="listitem" className="flex justify-center">
            <StatBlock
              className="w-full"
              value={stats.totalPoints}
              label="Points"
            />
          </div>
        </div>
      )}
    </section>
  )
}

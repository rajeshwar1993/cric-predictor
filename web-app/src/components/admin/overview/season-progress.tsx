import { Calendar, Trophy } from 'lucide-react'
import type { SeasonProgress as SeasonProgressData } from '@/lib/dal/admin/overview'

interface SeasonProgressProps {
  season: SeasonProgressData | null
}

export function SeasonProgress({ season }: SeasonProgressProps) {
  if (!season) {
    return (
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
        <div className="flex items-center gap-2 text-text-muted">
          <Calendar size={18} />
          <p className="text-body-sm">No active season found</p>
        </div>
      </div>
    )
  }

  const totalFixtures = season.totalFixtures
  const resolvedFixtures = season.resolvedFixtures
  const progressPercent = totalFixtures > 0 ? (resolvedFixtures / totalFixtures) * 100 : 0

  const formatDate = (date: string | null): string => {
    if (!date) return 'TBD'
    return new Date(date + 'T00:00:00Z').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-h3 text-text-primary">{season.name}</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            {formatDate(season.startDate)} — {formatDate(season.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-bragg-lime" />
          {season.daysRemaining !== null && (
            <span className="text-body-sm font-medium text-bragg-lime">
              {season.daysRemaining} day{season.daysRemaining === 1 ? '' : 's'} left
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-body-sm">
          <span className="text-text-secondary">
            {resolvedFixtures} / {totalFixtures} resolved
          </span>
          <span className="tabular-nums text-text-muted">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#242424]">
          <div
            className="h-full rounded-full bg-bragg-lime transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Additional stats */}
      <div className="mt-4 flex gap-6 text-body-sm">
        <div>
          <span className="text-text-muted">Completed: </span>
          <span className="font-medium tabular-nums text-text-primary">
            {season.completedFixtures}
          </span>
        </div>
        <div>
          <span className="text-text-muted">Remaining: </span>
          <span className="font-medium tabular-nums text-text-primary">
            {totalFixtures - season.completedFixtures}
          </span>
        </div>
      </div>
    </div>
  )
}

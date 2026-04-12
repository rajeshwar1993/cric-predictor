import { cn } from '@/lib/utils'
import type { FixtureStatusCounts, MatchStatus } from '@/lib/dal/admin/overview'

interface FixtureStatusChipsProps {
  counts: FixtureStatusCounts
}

interface StatusConfig {
  label: string
  bgClass: string
  textClass: string
  pulse?: boolean
}

const STATUS_CONFIG: Record<MatchStatus, StatusConfig> = {
  upcoming: {
    label: 'Upcoming',
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400',
  },
  live: {
    label: 'Live',
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    pulse: true,
  },
  completed: {
    label: 'Completed',
    bgClass: 'bg-amber-500/20',
    textClass: 'text-amber-400',
  },
  resolved: {
    label: 'Resolved',
    bgClass: 'bg-neutral-500/20',
    textClass: 'text-neutral-400',
  },
  abandoned: {
    label: 'Abandoned',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
  },
  no_result: {
    label: 'No Result',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
  },
}

const STATUS_ORDER: MatchStatus[] = [
  'live',
  'upcoming',
  'completed',
  'resolved',
  'abandoned',
  'no_result',
]

export function FixtureStatusChips({ counts }: FixtureStatusChipsProps) {
  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-4">
      <h3 className="text-caption text-text-muted mb-3">Fixture Status</h3>
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status]
          const count = counts[status]
          const shouldPulse = config.pulse && count > 0

          return (
            <span
              key={status}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
                config.bgClass,
                config.textClass,
              )}
            >
              {shouldPulse && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
              )}
              <span>{config.label}</span>
              <span className="tabular-nums">{count}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

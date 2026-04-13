import { Clock, RefreshCw, Zap, Bell, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CronJob {
  name: string
  schedule: string
  description: string
  icon: LucideIcon
}

const CRON_JOBS: CronJob[] = [
  {
    name: 'sync-fixtures',
    schedule: 'Every 6h',
    description: 'Imports & updates fixture schedule from the sports API for the active season.',
    icon: RefreshCw,
  },
  {
    name: 'live-poll-resolve',
    schedule: 'Every 30s (when live)',
    description:
      'Polls live scores, detects match completion, extracts results, and resolves predictions.',
    icon: Zap,
  },
  {
    name: 'seed-scenarios',
    schedule: 'Every 15m',
    description:
      'Seeds prediction scenarios for upcoming fixtures that are within the deadline window.',
    icon: Clock,
  },
  {
    name: 'deadline-reminders',
    schedule: 'Every 5m',
    description:
      'Sends push notifications to gang members who have not yet submitted predictions before the deadline.',
    icon: Bell,
  },
  {
    name: 'recompute-standings',
    schedule: 'After resolution',
    description:
      'Recomputes per-fixture and per-season leaderboard standings after predictions are resolved.',
    icon: Trophy,
  },
]

export function CronHealthPanel() {
  return (
    <div className="rounded-lg border border-wire bg-dark-concrete p-4">
      <h3 className="text-caption text-text-muted mb-3">Cron Jobs</h3>
      <div className="space-y-3">
        {CRON_JOBS.map((job) => {
          const Icon = job.icon
          return (
            <div
              key={job.name}
              className="flex items-start gap-3 rounded-md border border-mid-concrete bg-concrete-black p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-mid-concrete text-text-muted">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-body-sm font-medium text-text-primary">{job.name}</p>
                  <span className="rounded-full bg-mid-concrete px-2 py-0.5 text-xs text-text-muted">
                    {job.schedule}
                  </span>
                </div>
                <p className="mt-0.5 text-body-sm text-text-secondary">{job.description}</p>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-body-sm text-text-muted italic">
        Cron health is inferred from data state. A dedicated log table will enable real-time
        monitoring.
      </p>
    </div>
  )
}

import Link from 'next/link'

import { cn } from '@/lib/utils'
import type {
  FixturePipeline,
  MatchStatus,
  PipelineFixture,
} from '@/lib/dal/admin/fixtures'

// ---------------------------------------------------------------------------
// Status column configuration
// ---------------------------------------------------------------------------

interface StatusColumnConfig {
  label: string
  bgClass: string
  textClass: string
  borderClass: string
  badgeBgClass: string
  pulse?: boolean
}

const STATUS_CONFIG: Record<MatchStatus, StatusColumnConfig> = {
  upcoming: {
    label: 'Upcoming',
    bgClass: 'bg-blue-500/5',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/20',
    badgeBgClass: 'bg-blue-500/20',
  },
  live: {
    label: 'Live',
    bgClass: 'bg-green-500/5',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/20',
    badgeBgClass: 'bg-green-500/20',
    pulse: true,
  },
  completed: {
    label: 'Completed',
    bgClass: 'bg-amber-500/5',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/20',
    badgeBgClass: 'bg-amber-500/20',
  },
  resolved: {
    label: 'Resolved',
    bgClass: 'bg-neutral-500/5',
    textClass: 'text-neutral-400',
    borderClass: 'border-neutral-500/20',
    badgeBgClass: 'bg-neutral-500/20',
  },
  abandoned: {
    label: 'Abandoned',
    bgClass: 'bg-red-500/5',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/20',
    badgeBgClass: 'bg-red-500/20',
  },
  no_result: {
    label: 'No Result',
    bgClass: 'bg-red-500/5',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/20',
    badgeBgClass: 'bg-red-500/20',
  },
}

const COLUMN_ORDER: MatchStatus[] = [
  'upcoming',
  'live',
  'completed',
  'resolved',
  'abandoned',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FixturePipelineProps {
  pipeline: FixturePipeline
}

export function FixturePipelineView({ pipeline }: FixturePipelineProps) {
  // Merge abandoned + no_result into one column for display
  const abandonedCombined = [
    ...pipeline.abandoned,
    ...pipeline.no_result,
  ]

  return (
    <div className="rounded-lg border border-wire bg-concrete-black p-4">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-text-secondary">
        Fixture Pipeline
      </h2>

      {/* Desktop: 5-column grid */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-5">
        {COLUMN_ORDER.map((status) => {
          const config = STATUS_CONFIG[status]
          const items =
            status === 'abandoned' ? abandonedCombined : pipeline[status]

          return (
            <PipelineColumn
              key={status}
              config={config}
              fixtures={items}
              showPulse={status === 'live' && items.length > 0}
            />
          )
        })}
      </div>

      {/* Mobile: stacked */}
      <div className="space-y-4 lg:hidden">
        {COLUMN_ORDER.map((status) => {
          const config = STATUS_CONFIG[status]
          const items =
            status === 'abandoned' ? abandonedCombined : pipeline[status]

          if (items.length === 0) return null

          return (
            <PipelineColumn
              key={status}
              config={config}
              fixtures={items}
              showPulse={status === 'live' && items.length > 0}
            />
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pipeline Column
// ---------------------------------------------------------------------------

interface PipelineColumnProps {
  config: StatusColumnConfig
  fixtures: PipelineFixture[]
  showPulse: boolean
}

function PipelineColumn({ config, fixtures, showPulse }: PipelineColumnProps) {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        config.bgClass,
        config.borderClass,
      )}
    >
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showPulse && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
          )}
          <span
            className={cn('text-xs font-medium uppercase tracking-wider', config.textClass)}
          >
            {config.label}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
            config.badgeBgClass,
            config.textClass,
          )}
        >
          {fixtures.length}
        </span>
      </div>

      {/* Fixture cards */}
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {fixtures.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-muted">
            No fixtures
          </p>
        ) : (
          fixtures.map((f) => <FixtureMiniCard key={f.id} fixture={f} />)
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fixture Mini Card
// ---------------------------------------------------------------------------

interface FixtureMiniCardProps {
  fixture: PipelineFixture
}

function FixtureMiniCard({ fixture }: FixtureMiniCardProps) {
  return (
    <Link
      href={`/admin/fixtures/${fixture.id}`}
      className="block rounded-md border border-wire bg-dark-concrete px-2.5 py-2 transition-colors hover:bg-mid-concrete"
    >
      <p className="text-[11px] text-text-muted">Match #{fixture.matchNumber}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: fixture.homeTeam.color }}
        />
        <span className="text-xs font-medium text-text-primary">
          {fixture.homeTeam.code}
        </span>
        <span className="text-xs text-text-muted">vs</span>
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: fixture.awayTeam.color }}
        />
        <span className="text-xs font-medium text-text-primary">
          {fixture.awayTeam.code}
        </span>
      </div>
    </Link>
  )
}

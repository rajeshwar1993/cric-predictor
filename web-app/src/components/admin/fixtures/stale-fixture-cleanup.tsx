'use client'

import { useState } from 'react'
import {
  Search,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  identifyStaleFixtures,
  fixStaleFixture,
  type StaleFixtureEntry,
  type FixAction,
} from '@/lib/actions/admin/cleanup-fixtures'

// ---------------------------------------------------------------------------
// Staleness display config
// ---------------------------------------------------------------------------

const STALENESS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  db_live_sm_finished: {
    label: 'Live in DB, Finished on Sportmonks',
    color: 'text-red-300',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  db_live_sm_abandoned: {
    label: 'Live in DB, Abandoned on Sportmonks',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  db_completed_unresolved: {
    label: 'Completed but Unresolved (3+ hours)',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  db_upcoming_overdue: {
    label: 'Upcoming but Overdue (3+ hours past start)',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  db_live_sm_live: {
    label: 'Genuinely Live',
    color: 'text-green-300',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
}

function getStaleConfig(staleness: string) {
  return (
    STALENESS_CONFIG[staleness] ?? {
      label: staleness,
      color: 'text-text-secondary',
      bgColor: 'bg-dark-concrete',
      borderColor: 'border-wire',
    }
  )
}

// ---------------------------------------------------------------------------
// Fix action display
// ---------------------------------------------------------------------------

function ActionIcon({ action }: { action: string }) {
  if (action.includes('resolved') || action === 'fixture_marked_resolved') {
    return <CheckCircle2 size={14} className="text-green-400" />
  }
  if (action.includes('voided')) {
    return <AlertTriangle size={14} className="text-yellow-400" />
  }
  if (action.includes('error')) {
    return <AlertTriangle size={14} className="text-red-400" />
  }
  if (action === 'no_action') {
    return <Clock size={14} className="text-text-muted" />
  }
  return <Wrench size={14} className="text-blue-400" />
}

function ActionEntry({ action }: { action: FixAction }) {
  const label = action.action.replace(/_/g, ' ')
  return (
    <div className="flex items-start gap-2 py-1 text-xs">
      <ActionIcon action={action.action} />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-text-primary">{label}</span>
        {action.slug && (
          <span className="ml-1 text-text-secondary">({action.slug})</span>
        )}
        {action.answer && (
          <span className="ml-1 text-green-300">
            = {action.answer.length > 20
              ? `${action.answer.slice(0, 20)}...`
              : action.answer}
          </span>
        )}
        {action.reason && (
          <span className="ml-1 text-text-muted">— {action.reason}</span>
        )}
        {action.count != null && (
          <span className="ml-1 text-text-secondary">({action.count})</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FixResultState {
  actions: FixAction[]
  summary: {
    scenariosResolved: number
    scenariosVoided: number
    scenariosSkipped: number
    scenariosReconciled: number
    fullyResolved: boolean
  }
}

export function StaleFixtureCleanup() {
  const [isScanning, setIsScanning] = useState(false)
  const [fixtures, setFixtures] = useState<StaleFixtureEntry[] | null>(null)
  const [scanSummary, setScanSummary] = useState<{
    totalScanned: number
    apiErrors: number
    durationMs: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fixingId, setFixingId] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<Record<string, FixResultState>>(
    {}
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleScan = async () => {
    setIsScanning(true)
    setError(null)
    setFixtures(null)
    setScanSummary(null)
    setFixResults({})

    try {
      const result = await identifyStaleFixtures()
      if (!result.success || !result.data) {
        setError(result.error ?? 'Unknown error during scan')
        return
      }
      setFixtures(result.data.staleFixtures)
      setScanSummary({
        totalScanned: result.data.summary.totalScanned,
        apiErrors: result.data.summary.apiErrors,
        durationMs: result.data.summary.durationMs,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsScanning(false)
    }
  }

  const handleFix = async (fixtureId: string) => {
    setFixingId(fixtureId)
    setError(null)

    try {
      const result = await fixStaleFixture(fixtureId)
      if (!result.success || !result.data) {
        setError(result.error ?? 'Unknown error during fix')
        return
      }
      setFixResults((prev) => ({
        ...prev,
        [fixtureId]: {
          actions: result.data!.actions,
          summary: {
            scenariosResolved: result.data!.summary.scenariosResolved,
            scenariosVoided: result.data!.summary.scenariosVoided,
            scenariosSkipped: result.data!.summary.scenariosSkipped,
            scenariosReconciled: result.data!.summary.scenariosReconciled,
            fullyResolved: result.data!.summary.fullyResolved,
          },
        },
      }))
      setExpandedId(fixtureId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setFixingId(null)
    }
  }

  return (
    <div className="rounded-lg border border-wire bg-concrete-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-wire px-4 py-3">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="text-bragg-lime" />
          <h2 className="text-sm font-semibold text-text-primary">
            Stale Fixture Cleanup
          </h2>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Search size={14} className="mr-1.5" />
          )}
          {isScanning ? 'Scanning...' : 'Scan for Stale Fixtures'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Scan summary */}
      {scanSummary && (
        <div className="border-b border-wire px-4 py-2">
          <p className="text-xs text-text-muted">
            Scanned {scanSummary.totalScanned} fixture(s) in{' '}
            {(scanSummary.durationMs / 1000).toFixed(1)}s
            {scanSummary.apiErrors > 0 && (
              <span className="text-yellow-300">
                {' '}
                ({scanSummary.apiErrors} API error
                {scanSummary.apiErrors > 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Results */}
      {fixtures !== null && fixtures.length === 0 && (
        <div className="px-4 py-8 text-center">
          <CheckCircle2
            size={24}
            className="mx-auto mb-2 text-green-400"
          />
          <p className="text-sm text-text-secondary">
            No stale fixtures found. All fixtures are up to date.
          </p>
        </div>
      )}

      {fixtures !== null && fixtures.length > 0 && (
        <div className="divide-y divide-wire">
          {fixtures.map((fixture) => {
            const config = getStaleConfig(fixture.staleness)
            const isFixed = fixResults[fixture.fixtureId] != null
            const isFixing = fixingId === fixture.fixtureId
            const isExpanded = expandedId === fixture.fixtureId
            const fixResult = fixResults[fixture.fixtureId]

            return (
              <div key={fixture.fixtureId} className="px-4 py-3">
                {/* Fixture row */}
                <div className="flex items-center gap-3">
                  {/* Match info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {fixture.homeTeam.code} vs {fixture.awayTeam.code}
                      </span>
                      {fixture.round && (
                        <span className="text-xs text-text-muted">
                          {fixture.round}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-text-muted">
                      <span>
                        DB: <strong className="text-text-secondary">{fixture.dbStatus}</strong>
                      </span>
                      <span>
                        SM: <strong className="text-text-secondary">{fixture.sportmonksStatus}</strong>
                      </span>
                      <span>
                        {fixture.hoursSinceStart.toFixed(1)}h since start
                      </span>
                      <span>
                        {fixture.unresolvedScenarios}/{fixture.totalScenarios} unresolved
                      </span>
                    </div>
                  </div>

                  {/* Staleness badge */}
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      config.color,
                      config.bgColor,
                      config.borderColor
                    )}
                  >
                    {config.label}
                  </span>

                  {/* Action button */}
                  {isFixed ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-green-400"
                      onClick={() =>
                        setExpandedId(
                          isExpanded ? null : fixture.fixtureId
                        )
                      }
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      Fixed
                      {isExpanded ? (
                        <ChevronUp size={14} className="ml-1" />
                      ) : (
                        <ChevronDown size={14} className="ml-1" />
                      )}
                    </Button>
                  ) : fixture.fixable ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="shrink-0"
                      disabled={isFixing || fixingId !== null}
                      onClick={() => handleFix(fixture.fixtureId)}
                    >
                      {isFixing ? (
                        <Loader2 size={14} className="mr-1 animate-spin" />
                      ) : (
                        <Wrench size={14} className="mr-1" />
                      )}
                      {isFixing ? 'Fixing...' : 'Fix'}
                    </Button>
                  ) : (
                    <span className="shrink-0 text-xs text-text-muted">
                      Not fixable
                    </span>
                  )}
                </div>

                {/* Expanded fix results */}
                {isExpanded && fixResult && (
                  <div className="mt-3 rounded-md border border-wire bg-concrete-black p-3">
                    <div className="mb-2 flex items-center gap-3 text-xs text-text-secondary">
                      <span>
                        Resolved: {fixResult.summary.scenariosResolved}
                      </span>
                      <span>
                        Voided: {fixResult.summary.scenariosVoided}
                      </span>
                      <span>
                        Skipped: {fixResult.summary.scenariosSkipped}
                      </span>
                      {fixResult.summary.scenariosReconciled > 0 && (
                        <span>
                          Reconciled: {fixResult.summary.scenariosReconciled}
                        </span>
                      )}
                      <span
                        className={
                          fixResult.summary.fullyResolved
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }
                      >
                        {fixResult.summary.fullyResolved
                          ? 'Fully Resolved'
                          : 'Partially Resolved'}
                      </span>
                    </div>
                    <div className="max-h-48 space-y-0.5 overflow-y-auto">
                      {fixResult.actions.map((action, i) => (
                        <ActionEntry key={i} action={action} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

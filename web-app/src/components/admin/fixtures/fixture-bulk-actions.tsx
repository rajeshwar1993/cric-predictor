'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Stethoscope,
  Wrench,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Square,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  runFixtureHealthCheck,
  fixHealthCheckIssue,
  type HealthCheckResult,
  type HealthCheckIssue,
  type FixIssueResult,
  type IssueSeverity,
} from '@/lib/actions/admin/fixture-health-check'
import {
  fixStaleFixture,
  type FixAction,
} from '@/lib/actions/admin/cleanup-fixtures'
import type { FixtureTableRow } from '@/lib/dal/admin/fixtures'

// ---------------------------------------------------------------------------
// Severity config (reused from fixture-health-check.tsx pattern)
// ---------------------------------------------------------------------------

interface SeverityConfig {
  icon: typeof AlertTriangle
  color: string
  bgColor: string
  label: string
}

const SEVERITY_CONFIG: Record<IssueSeverity, SeverityConfig> = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-300',
    bgColor: 'bg-red-500/10',
    label: 'CRITICAL',
  },
  high: {
    icon: AlertCircle,
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    label: 'HIGH',
  },
  medium: {
    icon: Info,
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/10',
    label: 'MEDIUM',
  },
}

// ---------------------------------------------------------------------------
// Types for bulk results
// ---------------------------------------------------------------------------

interface BulkHealthCheckEntry {
  fixtureId: string
  label: string
  result: HealthCheckResult | null
  error: string | null
}

interface BulkCleanupEntry {
  fixtureId: string
  label: string
  actions: FixAction[]
  summary: {
    scenariosResolved: number
    scenariosVoided: number
    scenariosSkipped: number
    scenariosReconciled: number
    fullyResolved: boolean
  } | null
  error: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FixtureBulkActionsProps {
  selectedIds: Set<string>
  rows: FixtureTableRow[]
  onClearSelection: () => void
}

export function FixtureBulkActions({
  selectedIds,
  rows,
  onClearSelection,
}: FixtureBulkActionsProps) {
  // Health check state
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false)
  const [healthCheckProgress, setHealthCheckProgress] = useState({ current: 0, total: 0 })
  const [healthCheckResults, setHealthCheckResults] = useState<BulkHealthCheckEntry[]>([])
  const [expandedHealthCheckId, setExpandedHealthCheckId] = useState<string | null>(null)
  const [fixingIssueKey, setFixingIssueKey] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<Record<string, FixIssueResult>>({})

  // Cleanup state
  const [isRunningCleanup, setIsRunningCleanup] = useState(false)
  const [cleanupProgress, setCleanupProgress] = useState({ current: 0, total: 0 })
  const [cleanupResults, setCleanupResults] = useState<BulkCleanupEntry[]>([])
  const [expandedCleanupId, setExpandedCleanupId] = useState<string | null>(null)

  // Cleanup confirmation
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)

  // General
  const [activePanel, setActivePanel] = useState<'health' | 'cleanup' | null>(null)

  // R-003: Cancellation ref for bulk operations
  const cancelRef = useRef(false)

  const selectedCount = selectedIds.size
  const hasResults = healthCheckResults.length > 0 || cleanupResults.length > 0

  const getFixtureLabel = useCallback(
    (fixtureId: string): string => {
      const row = rows.find((r) => r.id === fixtureId)
      if (!row) return fixtureId
      return `#${row.matchNumber} ${row.homeTeam.code} vs ${row.awayTeam.code}`
    },
    [rows],
  )

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  const handleBulkHealthCheck = async () => {
    const ids = Array.from(selectedIds)
    cancelRef.current = false
    setIsRunningHealthCheck(true)
    setHealthCheckProgress({ current: 0, total: ids.length })
    setHealthCheckResults([])
    setFixResults({})
    setActivePanel('health')
    setExpandedHealthCheckId(null)

    const results: BulkHealthCheckEntry[] = []

    let healthIdx = 0
    for (const fixtureId of ids) {
      if (cancelRef.current) break
      healthIdx++
      setHealthCheckProgress({ current: healthIdx, total: ids.length })

      try {
        const res = await runFixtureHealthCheck(fixtureId)
        if (res.success && res.data) {
          results.push({
            fixtureId,
            label: getFixtureLabel(fixtureId),
            result: res.data,
            error: null,
          })
        } else {
          results.push({
            fixtureId,
            label: getFixtureLabel(fixtureId),
            result: null,
            error: res.success ? 'Unknown error' : res.error,
          })
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          fixtureId,
          label: getFixtureLabel(fixtureId),
          result: null,
          error: message,
        })
      }

      // Update results incrementally so the UI shows progress
      setHealthCheckResults([...results])
    }

    setIsRunningHealthCheck(false)
  }

  const handleFixIssue = async (fixtureId: string, issue: HealthCheckIssue) => {
    const key = `${fixtureId}:${issue.id}`
    setFixingIssueKey(key)

    try {
      const res = await fixHealthCheckIssue(
        fixtureId,
        issue.id,
        issue.fixType,
        issue.fixContext,
      )
      if (res.success && res.data) {
        setFixResults((prev) => ({ ...prev, [key]: res.data! }))
      } else {
        setFixResults((prev) => ({
          ...prev,
          [key]: {
            issueId: issue.id,
            success: false,
            message: !res.success ? res.error : 'Fix returned no data',
          },
        }))
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setFixResults((prev) => ({
        ...prev,
        [key]: {
          issueId: issue.id,
          success: false,
          message: `Fix failed: ${message}`,
        },
      }))
    } finally {
      setFixingIssueKey(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  const handleBulkCleanup = async () => {
    const ids = Array.from(selectedIds)
    cancelRef.current = false
    setShowCleanupConfirm(false)
    setIsRunningCleanup(true)
    setCleanupProgress({ current: 0, total: ids.length })
    setCleanupResults([])
    setActivePanel('cleanup')
    setExpandedCleanupId(null)

    const results: BulkCleanupEntry[] = []

    let cleanupIdx = 0
    for (const fixtureId of ids) {
      if (cancelRef.current) break
      cleanupIdx++
      setCleanupProgress({ current: cleanupIdx, total: ids.length })

      try {
        const res = await fixStaleFixture(fixtureId)
        if (res.success && res.data) {
          results.push({
            fixtureId,
            label: getFixtureLabel(fixtureId),
            actions: res.data.actions,
            summary: {
              scenariosResolved: res.data.summary.scenariosResolved,
              scenariosVoided: res.data.summary.scenariosVoided,
              scenariosSkipped: res.data.summary.scenariosSkipped,
              scenariosReconciled: res.data.summary.scenariosReconciled,
              fullyResolved: res.data.summary.fullyResolved,
            },
            error: null,
          })
        } else {
          results.push({
            fixtureId,
            label: getFixtureLabel(fixtureId),
            actions: [],
            summary: null,
            error: res.error ?? 'Unknown error',
          })
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          fixtureId,
          label: getFixtureLabel(fixtureId),
          actions: [],
          summary: null,
          error: message,
        })
      }

      setCleanupResults([...results])
    }

    setIsRunningCleanup(false)
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCancel = () => {
    cancelRef.current = true
  }

  const handleDismissResults = () => {
    setHealthCheckResults([])
    setCleanupResults([])
    setFixResults({})
    setActivePanel(null)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // R-001: Keep component visible when results exist, even if selection is cleared
  if (selectedCount === 0 && !hasResults) return null

  const isRunning = isRunningHealthCheck || isRunningCleanup

  return (
    <div className="rounded-lg border border-wire bg-concrete-black">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {selectedCount > 0 && (
          <span className="text-sm font-medium text-text-primary">
            {selectedCount} fixture{selectedCount !== 1 ? 's' : ''} selected
          </span>
        )}

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBulkHealthCheck}
              disabled={isRunning}
            >
              {isRunningHealthCheck ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Stethoscope size={14} className="mr-1.5" />
              )}
              {isRunningHealthCheck
                ? `Checking ${healthCheckProgress.current}/${healthCheckProgress.total}...`
                : 'Run Health Check'}
            </Button>

            {/* R-004: Confirmation gate for destructive cleanup */}
            {showCleanupConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-yellow-300">
                  Resolve/void scenarios for {selectedCount} fixture{selectedCount !== 1 ? 's' : ''}?
                </span>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleBulkCleanup}
                  disabled={isRunning}
                >
                  Confirm
                </Button>
                <button
                  onClick={() => setShowCleanupConfirm(false)}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowCleanupConfirm(true)}
                disabled={isRunning}
              >
                {isRunningCleanup ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <Wrench size={14} className="mr-1.5" />
                )}
                {isRunningCleanup
                  ? `Cleaning ${cleanupProgress.current}/${cleanupProgress.total}...`
                  : 'Run Cleanup'}
              </Button>
            )}
          </div>
        )}

        {/* R-003: Cancel button during operations */}
        {isRunning && (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-xs text-red-300 transition-colors hover:text-red-200"
          >
            <Square size={12} />
            Stop
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Dismiss results button */}
          {hasResults && !isRunning && (
            <button
              onClick={handleDismissResults}
              className="flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              <X size={14} />
              Dismiss results
            </button>
          )}

          {/* Clear selection */}
          {selectedCount > 0 && (
            <button
              onClick={onClearSelection}
              disabled={isRunning}
              className="flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
            >
              <X size={14} />
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* Health check results panel */}
      {activePanel === 'health' && healthCheckResults.length > 0 && (
        <div className="border-t border-wire">
          <div className="divide-y divide-wire">
            {healthCheckResults.map((entry) => {
              const isExpanded = expandedHealthCheckId === entry.fixtureId
              const issueCount = entry.result?.summary.total ?? 0
              const hasIssues = issueCount > 0
              const isHealthy = entry.result !== null && issueCount === 0

              return (
                <div key={entry.fixtureId}>
                  {/* Summary row */}
                  <button
                    onClick={() =>
                      setExpandedHealthCheckId(isExpanded ? null : entry.fixtureId)
                    }
                    disabled={!hasIssues && !entry.error}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      (hasIssues || entry.error) && 'hover:bg-dark-concrete',
                    )}
                  >
                    {/* Status icon */}
                    {entry.error ? (
                      <AlertTriangle size={16} className="shrink-0 text-red-400" />
                    ) : isHealthy ? (
                      <CheckCircle2 size={16} className="shrink-0 text-green-400" />
                    ) : hasIssues ? (
                      <AlertCircle size={16} className="shrink-0 text-orange-400" />
                    ) : null}

                    {/* Label */}
                    <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">
                      {entry.label}
                    </span>

                    {/* Issue summary */}
                    {entry.error && (
                      <span className="text-xs text-red-300">Error</span>
                    )}
                    {entry.result && (
                      <span className="flex items-center gap-2 text-xs text-text-muted">
                        {entry.result.summary.critical > 0 && (
                          <span className="text-red-300">
                            {entry.result.summary.critical} critical
                          </span>
                        )}
                        {entry.result.summary.high > 0 && (
                          <span className="text-orange-300">
                            {entry.result.summary.high} high
                          </span>
                        )}
                        {entry.result.summary.medium > 0 && (
                          <span className="text-yellow-300">
                            {entry.result.summary.medium} medium
                          </span>
                        )}
                        {isHealthy && (
                          <span className="text-green-400">Healthy</span>
                        )}
                      </span>
                    )}

                    {/* Chevron */}
                    {(hasIssues || entry.error) && (
                      <span className="shrink-0 text-text-muted">
                        {isExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </span>
                    )}
                  </button>

                  {/* Expanded issue list */}
                  {isExpanded && entry.error && (
                    <div className="border-t border-wire bg-red-500/5 px-4 py-2">
                      <p className="text-xs text-red-300">{entry.error}</p>
                    </div>
                  )}
                  {isExpanded && entry.result && entry.result.issues.length > 0 && (
                    <div className="border-t border-wire">
                      <div className="divide-y divide-wire">
                        {entry.result.issues.map((issue) => {
                          const config = SEVERITY_CONFIG[issue.severity]
                          const Icon = config.icon
                          const fixKey = `${entry.fixtureId}:${issue.id}`
                          const isFixed = fixResults[fixKey] != null
                          const isFixing = fixingIssueKey === fixKey
                          const fixResult = fixResults[fixKey]

                          return (
                            <div key={issue.id} className="px-6 py-2.5">
                              <div className="flex items-start gap-3">
                                <Icon
                                  size={14}
                                  className={cn('mt-0.5 shrink-0', config.color)}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        'text-[10px] font-bold uppercase tracking-wider',
                                        config.color,
                                      )}
                                    >
                                      {config.label}
                                    </span>
                                    <span className="text-xs font-medium text-text-primary">
                                      {issue.title}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-text-secondary">
                                    {issue.description}
                                  </p>

                                  {isFixed && fixResult && (
                                    <div
                                      className={cn(
                                        'mt-1.5 flex items-center gap-1.5 text-[11px]',
                                        fixResult.success
                                          ? 'text-green-400'
                                          : 'text-red-400',
                                      )}
                                    >
                                      {fixResult.success ? (
                                        <CheckCircle2 size={12} />
                                      ) : (
                                        <AlertTriangle size={12} />
                                      )}
                                      <span>{fixResult.message}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="shrink-0">
                                  {isFixed && fixResult?.success ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-green-400">
                                      <CheckCircle2 size={14} />
                                      Fixed
                                    </span>
                                  ) : issue.fixable ? (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      disabled={isFixing || fixingIssueKey !== null}
                                      onClick={() => handleFixIssue(entry.fixtureId, issue)}
                                    >
                                      {isFixing ? (
                                        <Loader2
                                          size={14}
                                          className="mr-1 animate-spin"
                                        />
                                      ) : (
                                        <Wrench size={14} className="mr-1" />
                                      )}
                                      {isFixing ? 'Fixing...' : issue.fixLabel}
                                    </Button>
                                  ) : (
                                    <span className="text-[11px] text-text-muted">
                                      {issue.fixLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cleanup results panel */}
      {activePanel === 'cleanup' && cleanupResults.length > 0 && (
        <div className="border-t border-wire">
          <div className="divide-y divide-wire">
            {cleanupResults.map((entry) => {
              const isExpanded = expandedCleanupId === entry.fixtureId
              const hasError = entry.error !== null
              const hasSummary = entry.summary !== null

              return (
                <div key={entry.fixtureId}>
                  {/* Summary row */}
                  <button
                    onClick={() =>
                      setExpandedCleanupId(isExpanded ? null : entry.fixtureId)
                    }
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-dark-concrete"
                  >
                    {/* Status icon */}
                    {hasError ? (
                      <AlertTriangle size={16} className="shrink-0 text-red-400" />
                    ) : entry.summary?.fullyResolved ? (
                      <CheckCircle2 size={16} className="shrink-0 text-green-400" />
                    ) : (
                      <Info size={16} className="shrink-0 text-yellow-400" />
                    )}

                    {/* Label */}
                    <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">
                      {entry.label}
                    </span>

                    {/* Summary counts */}
                    {hasError && (
                      <span className="text-xs text-red-300">Error</span>
                    )}
                    {hasSummary && entry.summary && (
                      <span className="flex items-center gap-2 text-xs text-text-muted">
                        {entry.summary.scenariosResolved > 0 && (
                          <span className="text-green-300">
                            {entry.summary.scenariosResolved} resolved
                          </span>
                        )}
                        {entry.summary.scenariosVoided > 0 && (
                          <span className="text-yellow-300">
                            {entry.summary.scenariosVoided} voided
                          </span>
                        )}
                        {entry.summary.scenariosSkipped > 0 && (
                          <span className="text-text-secondary">
                            {entry.summary.scenariosSkipped} skipped
                          </span>
                        )}
                        <span
                          className={
                            entry.summary.fullyResolved
                              ? 'text-green-400'
                              : 'text-yellow-400'
                          }
                        >
                          {entry.summary.fullyResolved
                            ? 'Fully Resolved'
                            : 'Partial'}
                        </span>
                      </span>
                    )}

                    {/* Chevron */}
                    <span className="shrink-0 text-text-muted">
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  </button>

                  {/* Expanded actions list */}
                  {isExpanded && hasError && (
                    <div className="border-t border-wire bg-red-500/5 px-4 py-2">
                      <p className="text-xs text-red-300">{entry.error}</p>
                    </div>
                  )}
                  {isExpanded && entry.actions.length > 0 && (
                    <div className="border-t border-wire px-6 py-2">
                      <div className="max-h-48 space-y-0.5 overflow-y-auto">
                        {entry.actions.map((action, i) => (
                          <CleanupActionEntry key={i} action={action} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cleanup action sub-component (reused pattern from stale-fixture-cleanup.tsx)
// ---------------------------------------------------------------------------

function CleanupActionIcon({ action }: { action: string }) {
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
    return <Info size={14} className="text-text-muted" />
  }
  return <Wrench size={14} className="text-blue-400" />
}

function CleanupActionEntry({ action }: { action: FixAction }) {
  const label = action.action.replace(/_/g, ' ')
  return (
    <div className="flex items-start gap-2 py-1 text-xs">
      <CleanupActionIcon action={action.action} />
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

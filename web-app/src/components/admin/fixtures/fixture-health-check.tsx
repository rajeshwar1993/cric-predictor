'use client'

import { useState } from 'react'
import {
  Stethoscope,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Wrench,
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

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

interface SeverityConfig {
  icon: typeof AlertTriangle
  color: string
  bgColor: string
  borderColor: string
  label: string
}

const SEVERITY_CONFIG: Record<IssueSeverity, SeverityConfig> = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-300',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'CRITICAL',
  },
  high: {
    icon: AlertCircle,
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'HIGH',
  },
  medium: {
    icon: Info,
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'MEDIUM',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FixtureHealthCheckProps {
  fixtureId: string
}

export function FixtureHealthCheck({ fixtureId }: FixtureHealthCheckProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<HealthCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<Record<string, FixIssueResult>>(
    {},
  )

  const handleScan = async () => {
    setIsScanning(true)
    setError(null)
    setResult(null)
    setFixResults({})

    try {
      const res = await runFixtureHealthCheck(fixtureId)
      if (!res.success) {
        setError(res.error)
        return
      }
      if (!res.data) {
        setError('Unknown error during health check')
        return
      }
      setResult(res.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsScanning(false)
    }
  }

  const handleFix = async (issue: HealthCheckIssue) => {
    setFixingIssueId(issue.id)
    setError(null)

    try {
      const res = await fixHealthCheckIssue(
        fixtureId,
        issue.id,
        issue.fixType,
        issue.fixContext,
      )
      if (!res.success) {
        setError(res.error)
        return
      }
      if (!res.data) {
        setError('Unknown error during fix')
        return
      }
      setFixResults((prev) => ({ ...prev, [issue.id]: res.data! }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setFixingIssueId(null)
    }
  }

  return (
    <div className="rounded-lg border border-wire bg-concrete-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-wire px-4 py-3">
        <div className="flex items-center gap-2">
          <Stethoscope size={18} className="text-bragg-lime" />
          <h2 className="text-sm font-semibold text-text-primary">
            Health Check
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
            <Stethoscope size={14} className="mr-1.5" />
          )}
          {isScanning ? 'Checking...' : 'Run Health Check'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Summary */}
      {result && result.issues.length > 0 && (
        <div className="border-b border-wire px-4 py-2">
          <p className="text-xs text-text-muted">
            <span className="font-medium text-text-secondary">
              {result.summary.total} issue{result.summary.total !== 1 ? 's' : ''} found
            </span>
            {': '}
            {result.summary.critical > 0 && (
              <span className="text-red-300">
                {result.summary.critical} critical
              </span>
            )}
            {result.summary.critical > 0 && result.summary.high > 0 && ', '}
            {result.summary.high > 0 && (
              <span className="text-orange-300">
                {result.summary.high} high
              </span>
            )}
            {(result.summary.critical > 0 || result.summary.high > 0) &&
              result.summary.medium > 0 &&
              ', '}
            {result.summary.medium > 0 && (
              <span className="text-yellow-300">
                {result.summary.medium} medium
              </span>
            )}
            {result.summary.fixable > 0 && (
              <span className="text-text-muted">
                {' '}
                ({result.summary.fixable} auto-fixable)
              </span>
            )}
          </p>
        </div>
      )}

      {/* All clear */}
      {result && result.issues.length === 0 && (
        <div className="px-4 py-8 text-center">
          <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400" />
          <p className="text-sm text-text-secondary">
            No issues found. This fixture looks healthy.
          </p>
        </div>
      )}

      {/* Issue list */}
      {result && result.issues.length > 0 && (
        <div className="divide-y divide-wire">
          {result.issues.map((issue) => {
            const config = SEVERITY_CONFIG[issue.severity]
            const Icon = config.icon
            const isFixed = fixResults[issue.id] != null
            const isFixing = fixingIssueId === issue.id
            const fixResult = fixResults[issue.id]

            return (
              <div key={issue.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <Icon
                    size={16}
                    className={cn('mt-0.5 shrink-0', config.color)}
                  />

                  {/* Content */}
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
                      <span className="text-sm font-medium text-text-primary">
                        {issue.title}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {issue.description}
                    </p>

                    {/* Fix result */}
                    {isFixed && fixResult && (
                      <div
                        className={cn(
                          'mt-2 flex items-center gap-1.5 text-xs',
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
                        {fixResult.details && (
                          <span className="text-text-muted">
                            {' '}
                            — {fixResult.details}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action */}
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
                        disabled={isFixing || fixingIssueId !== null}
                        onClick={() => handleFix(issue)}
                      >
                        {isFixing ? (
                          <Loader2 size={14} className="mr-1 animate-spin" />
                        ) : (
                          <Wrench size={14} className="mr-1" />
                        )}
                        {isFixing ? 'Fixing...' : issue.fixLabel}
                      </Button>
                    ) : (
                      <span className="text-xs text-text-muted">
                        {issue.fixLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

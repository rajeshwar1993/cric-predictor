'use client'

import { useState } from 'react'

import type { IntegrityCheckResult } from '@/lib/dal/admin/integrity'

import { CheckResultCard } from './check-result-card'

interface IntegrityDashboardProps {
  initialChecks: IntegrityCheckResult[]
}

export function IntegrityDashboard({ initialChecks }: IntegrityDashboardProps) {
  const [checks, setChecks] = useState(initialChecks)
  const [isRunning, setIsRunning] = useState(false)

  const handleRunAll = async () => {
    setIsRunning(true)
    try {
      const res = await fetch('/api/admin/integrity/checks', { method: 'POST' })
      if (res.ok) {
        const data = (await res.json()) as IntegrityCheckResult[]
        setChecks(data)
      }
    } finally {
      setIsRunning(false)
    }
  }

  const passCount = checks.filter((c) => c.status === 'pass').length
  const warnCount = checks.filter((c) => c.status === 'warn').length
  const failCount = checks.filter((c) => c.status === 'fail').length

  return (
    <div className="space-y-4">
      {/* Summary + action */}
      <div className="flex items-center justify-between rounded-lg border border-[#333333] bg-[#1a1a1a] px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="text-sm text-text-secondary">
              {passCount} passed
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="text-sm text-text-secondary">
              {warnCount} warnings
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="text-sm text-text-secondary">
              {failCount} failures
            </span>
          </div>
        </div>
        <button
          onClick={handleRunAll}
          disabled={isRunning}
          className="rounded-md bg-bragg-lime px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isRunning ? 'Running All Checks...' : 'Run All Checks'}
        </button>
      </div>

      {/* Check results */}
      <div className="space-y-2">
        {checks.length > 0 ? (
          checks.map((check) => (
            <CheckResultCard key={check.name} check={check} />
          ))
        ) : (
          <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6">
            <p className="text-sm text-text-muted">
              Click &quot;Run All Checks&quot; to validate data integrity.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

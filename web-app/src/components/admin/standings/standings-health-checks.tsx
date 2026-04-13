'use client'

import { useState } from 'react'

import type { StandingsHealthCheck } from '@/lib/dal/admin/standings'
import { cn } from '@/lib/utils'

interface StandingsHealthChecksProps {
  initialChecks: StandingsHealthCheck[]
}

const statusStyles: Record<StandingsHealthCheck['status'], string> = {
  pass: 'bg-green-400/10 text-green-400',
  warn: 'bg-yellow-400/10 text-yellow-400',
  fail: 'bg-red-400/10 text-red-400',
}

export function StandingsHealthChecks({
  initialChecks,
}: StandingsHealthChecksProps) {
  const [checks, setChecks] = useState(initialChecks)
  const [isRunning, setIsRunning] = useState(false)

  const handleRunChecks = async () => {
    setIsRunning(true)
    try {
      const res = await fetch('/api/admin/standings/checks', { method: 'POST' })
      if (res.ok) {
        const data = (await res.json()) as StandingsHealthCheck[]
        setChecks(data)
      }
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="rounded-lg border border-wire bg-dark-concrete">
      <div className="flex items-center justify-between border-b border-wire px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Health Checks
        </h3>
        <button
          onClick={handleRunChecks}
          disabled={isRunning}
          className="rounded-md bg-bragg-lime px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Checks'}
        </button>
      </div>
      <div className="space-y-2 p-4">
        {checks.length > 0 ? (
          checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between rounded-md border border-mid-concrete bg-concrete-black px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {check.name}
                </p>
                <p className="text-xs text-text-muted">{check.message}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium uppercase',
                  statusStyles[check.status],
                )}
              >
                {check.status}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-muted">
            Click &quot;Run Checks&quot; to validate standings data.
          </p>
        )}
      </div>
    </div>
  )
}

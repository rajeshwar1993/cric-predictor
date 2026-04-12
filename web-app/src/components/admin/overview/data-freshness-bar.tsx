import { cn } from '@/lib/utils'
import type { DataFreshnessCheck } from '@/lib/dal/admin/overview'

interface DataFreshnessBarProps {
  checks: DataFreshnessCheck[]
}

export function DataFreshnessBar({ checks }: DataFreshnessBarProps) {
  const hasWarnings = checks.some((c) => c.status === 'warn')

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        hasWarnings
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-green-500/30 bg-green-500/5',
      )}
    >
      <h3
        className={cn(
          'text-caption mb-3',
          hasWarnings ? 'text-red-400' : 'text-green-400',
        )}
      >
        {hasWarnings ? 'Data Freshness — Issues Detected' : 'Data Freshness — All OK'}
      </h3>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-body-sm">
            <span
              className={cn(
                'inline-block h-2 w-2 shrink-0 rounded-full',
                check.status === 'ok' ? 'bg-green-400' : 'bg-red-400',
              )}
            />
            <span className="font-medium text-text-primary">{check.label}:</span>
            <span className="text-text-secondary">{check.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

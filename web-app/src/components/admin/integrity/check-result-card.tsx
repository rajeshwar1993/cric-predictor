import type { IntegrityCheckResult } from '@/lib/dal/admin/integrity'
import { cn } from '@/lib/utils'

interface CheckResultCardProps {
  check: IntegrityCheckResult
}

const statusStyles: Record<IntegrityCheckResult['status'], string> = {
  pass: 'bg-green-400/10 text-green-400',
  warn: 'bg-yellow-400/10 text-yellow-400',
  fail: 'bg-red-400/10 text-red-400',
}

const categoryLabels: Record<IntegrityCheckResult['category'], string> = {
  referential: 'Referential',
  business_logic: 'Business Logic',
  scenario: 'Scenario',
}

export function CheckResultCard({ check }: CheckResultCardProps) {
  return (
    <div className="flex items-center justify-between rounded-md border border-mid-concrete bg-concrete-black px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{check.name}</p>
          <span className="rounded bg-mid-concrete px-1.5 py-0.5 text-[10px] uppercase text-text-muted">
            {categoryLabels[check.category]}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-text-muted">{check.message}</p>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        {check.count > 0 && (
          <span className="text-sm font-medium text-text-secondary">
            {check.count}
          </span>
        )}
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium uppercase',
            statusStyles[check.status],
          )}
        >
          {check.status}
        </span>
      </div>
    </div>
  )
}

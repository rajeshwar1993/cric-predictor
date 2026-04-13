import type { OperationalAlert } from '@/lib/dal/admin/operations'
import { cn } from '@/lib/utils'

interface AlertBoardProps {
  alerts: OperationalAlert[]
}

const severityStyles: Record<OperationalAlert['severity'], { border: string; icon: string }> = {
  info: { border: 'border-blue-400/20', icon: 'text-blue-400' },
  warning: { border: 'border-yellow-400/20', icon: 'text-yellow-400' },
  critical: { border: 'border-red-400/20', icon: 'text-red-400' },
}

export function AlertBoard({ alerts }: AlertBoardProps) {
  return (
    <div className="rounded-lg border border-wire bg-dark-concrete">
      <div className="border-b border-wire px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Active Alerts ({alerts.length})
        </h3>
      </div>
      <div className="space-y-2 p-4">
        {alerts.map((alert, i) => {
          const style = severityStyles[alert.severity]
          return (
            <div
              key={`${alert.source}-${i}`}
              className={cn(
                'rounded-md border bg-concrete-black px-4 py-3',
                style.border,
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-semibold uppercase',
                    style.icon,
                  )}
                >
                  {alert.severity}
                </span>
                <span className="text-xs text-text-muted">{alert.source}</span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {alert.message}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

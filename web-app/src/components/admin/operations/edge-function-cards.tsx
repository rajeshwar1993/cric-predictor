import type { EdgeFunctionHealth } from '@/lib/dal/admin/operations'
import { cn } from '@/lib/utils'

interface EdgeFunctionCardsProps {
  functions: EdgeFunctionHealth[]
}

const statusStyles: Record<EdgeFunctionHealth['status'], { bg: string; text: string; dot: string }> = {
  healthy: { bg: 'border-green-400/20', text: 'text-green-400', dot: 'bg-green-400' },
  stale: { bg: 'border-yellow-400/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  unknown: { bg: 'border-wire', text: 'text-text-muted', dot: 'bg-text-muted' },
}

export function EdgeFunctionCards({ functions }: EdgeFunctionCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {functions.map((fn) => {
        const style = statusStyles[fn.status]
        return (
          <div
            key={fn.name}
            className={cn(
              'rounded-lg border bg-dark-concrete p-4',
              style.bg,
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', style.dot)} />
              <h4 className="text-sm font-semibold text-text-primary">
                {fn.name}
              </h4>
              <span
                className={cn(
                  'ml-auto rounded-full px-2 py-0.5 text-xs font-medium uppercase',
                  style.text,
                )}
              >
                {fn.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">{fn.description}</p>
            <p className="mt-2 text-sm text-text-secondary">{fn.message}</p>
            {fn.lastActivity && (
              <p className="mt-1 text-xs text-text-muted">
                Last: {new Date(fn.lastActivity).toLocaleString()}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

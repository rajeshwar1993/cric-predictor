import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  alert?: boolean
  detail?: string
}

export function MetricCard({ label, value, icon: Icon, alert = false, detail }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-[#1a1a1a] p-4',
        alert ? 'border-red-500/50' : 'border-[#333333]',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-caption text-text-muted">{label}</p>
          <p
            className={cn(
              'mt-1 text-stat',
              alert ? 'text-red-400' : 'text-text-primary',
            )}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {detail && (
            <p className="mt-1 text-body-sm text-text-secondary">{detail}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
            alert ? 'bg-red-500/10 text-red-400' : 'bg-[#242424] text-text-muted',
          )}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

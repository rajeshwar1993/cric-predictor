import Link from 'next/link'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { FixtureAlert, AlertSeverity } from '@/lib/dal/admin/fixtures'

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

interface SeverityConfig {
  icon: typeof AlertTriangle
  bgClass: string
  borderClass: string
  textClass: string
  iconClass: string
  label: string
}

const SEVERITY_CONFIG: Record<AlertSeverity, SeverityConfig> = {
  critical: {
    icon: AlertTriangle,
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-300',
    iconClass: 'text-red-400',
    label: 'CRITICAL',
  },
  high: {
    icon: AlertCircle,
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-300',
    iconClass: 'text-orange-400',
    label: 'HIGH',
  },
  medium: {
    icon: Info,
    bgClass: 'bg-yellow-500/10',
    borderClass: 'border-yellow-500/30',
    textClass: 'text-yellow-300',
    iconClass: 'text-yellow-400',
    label: 'MEDIUM',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FixtureAlertsProps {
  alerts: FixtureAlert[]
}

export function FixtureAlerts({ alerts }: FixtureAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => {
        const config = SEVERITY_CONFIG[alert.severity]
        const Icon = config.icon

        return (
          <div
            key={`${alert.fixtureId}-${index}`}
            className={cn(
              'flex items-start gap-3 rounded-md border px-4 py-3',
              config.bgClass,
              config.borderClass,
            )}
          >
            <Icon size={16} className={cn('mt-0.5 shrink-0', config.iconClass)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    config.textClass,
                  )}
                >
                  {config.label}
                </span>
                <Link
                  href={`/admin/fixtures/${alert.fixtureId}`}
                  className="text-xs font-medium text-text-secondary underline-offset-2 transition-colors hover:text-text-primary hover:underline"
                >
                  {alert.fixtureLabel}
                </Link>
              </div>
              <p className={cn('mt-0.5 text-sm', config.textClass)}>
                {alert.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

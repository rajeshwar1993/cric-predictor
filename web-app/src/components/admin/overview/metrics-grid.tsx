import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Shield,
  ShieldOff,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import type { OverviewMetrics } from '@/lib/dal/admin/overview'
import { MetricCard } from './metric-card'

interface MetricsGridProps {
  metrics: OverviewMetrics
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="space-y-6">
      {/* Users */}
      <div>
        <h2 className="text-h4 text-text-primary mb-3">Users</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Users"
            value={metrics.users.total}
            icon={Users}
          />
          <MetricCard
            label="Active"
            value={metrics.users.active}
            icon={UserCheck}
          />
          <MetricCard
            label="Onboarded"
            value={metrics.users.onboarded}
            icon={UserCheck}
            detail={
              metrics.users.active > 0
                ? `${Math.round((metrics.users.onboarded / metrics.users.active) * 100)}% of active`
                : undefined
            }
          />
          <MetricCard
            label="Not Onboarded"
            value={metrics.users.notOnboarded}
            icon={UserMinus}
            alert={metrics.users.notOnboarded > 0}
          />
          <MetricCard
            label="Deleted"
            value={metrics.users.deleted}
            icon={UserX}
          />
        </div>
      </div>

      {/* Gangs */}
      <div>
        <h2 className="text-h4 text-text-primary mb-3">Gangs</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Gangs"
            value={metrics.gangs.total}
            icon={Shield}
          />
          <MetricCard
            label="Active"
            value={metrics.gangs.active}
            icon={Shield}
          />
          <MetricCard
            label="Deleted"
            value={metrics.gangs.deleted}
            icon={ShieldOff}
          />
        </div>
      </div>

      {/* Predictions */}
      <div>
        <h2 className="text-h4 text-text-primary mb-3">Predictions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Predictions"
            value={metrics.predictions.total}
            icon={BarChart3}
          />
          <MetricCard
            label="Today"
            value={metrics.predictions.today}
            icon={TrendingUp}
          />
        </div>
      </div>
    </div>
  )
}

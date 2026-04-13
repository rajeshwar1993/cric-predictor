import { Activity } from 'lucide-react'

import { AlertBoard } from '@/components/admin/operations/alert-board'
import { EdgeFunctionCards } from '@/components/admin/operations/edge-function-cards'
import { getActiveAlerts, getOperationalHealth } from '@/lib/dal/admin/operations'
import { getActiveSeason } from '@/lib/dal/admin/fixtures'

/**
 * ADM-011: Operational Health page.
 *
 * Shows edge function health status and active alerts.
 */
export default async function OperationsPage() {
  const season = await getActiveSeason()

  if (!season) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-bragg-lime" />
          <h1 className="text-2xl font-bold text-text-primary">
            Operational Health
          </h1>
        </div>
        <div className="rounded-lg border border-wire bg-concrete-black px-4 py-12 text-center">
          <p className="text-sm text-text-muted">
            No active season found. Operational data will appear once a season is
            activated.
          </p>
        </div>
      </div>
    )
  }

  const seasonId = season.id

  const [health, alerts] = await Promise.all([
    getOperationalHealth(),
    getActiveAlerts(seasonId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">
          Operational Health
        </h1>
      </div>

      <EdgeFunctionCards functions={health} />
      <AlertBoard alerts={alerts} />
    </div>
  )
}

import { Activity } from 'lucide-react'

import { AlertBoard } from '@/components/admin/operations/alert-board'
import { EdgeFunctionCards } from '@/components/admin/operations/edge-function-cards'
import { getActiveAlerts, getOperationalHealth } from '@/lib/dal/admin/operations'

/**
 * ADM-011: Operational Health page.
 *
 * Shows edge function health status and active alerts.
 */
export default async function OperationsPage() {
  // TODO: Replace with dynamic active season lookup
  const seasonId = 'ipl-2026'

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

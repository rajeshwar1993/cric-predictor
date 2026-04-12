import { Trophy } from 'lucide-react'

import { StandingsHealthChecks } from '@/components/admin/standings/standings-health-checks'
import { StandingsOverviewCards } from '@/components/admin/standings/standings-overview'
import {
  getStandingsOverview,
  runSeasonStandingsChecks,
} from '@/lib/dal/admin/standings'

/**
 * ADM-009: Standings Monitoring page.
 *
 * Shows standings row counts and data health checks.
 */
export default async function StandingsPage() {
  const [overview, healthChecks] = await Promise.all([
    getStandingsOverview(),
    runSeasonStandingsChecks(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">
          Standings Monitoring
        </h1>
      </div>

      <StandingsOverviewCards overview={overview} />
      <StandingsHealthChecks initialChecks={healthChecks} />
    </div>
  )
}

import { Shield } from 'lucide-react'

import { GangMetricsCards } from '@/components/admin/gangs/gang-metrics'
import { GangSearch } from '@/components/admin/gangs/gang-search'
import { GangSizeChart } from '@/components/admin/gangs/gang-size-chart'
import {
  getGangMetrics,
  getGangSizeDistribution,
  searchGangs,
} from '@/lib/dal/admin/gangs'

/**
 * ADM-007: Gang Insights page.
 *
 * Shows gang metrics, size distribution, and a search interface.
 */
export default async function GangsPage() {
  const [metrics, sizeDistribution, recentGangs] = await Promise.all([
    getGangMetrics(),
    getGangSizeDistribution(),
    searchGangs(''),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">Gang Insights</h1>
      </div>

      <GangMetricsCards metrics={metrics} />
      <GangSizeChart data={sizeDistribution} />
      <GangSearch initialResults={recentGangs} />
    </div>
  )
}

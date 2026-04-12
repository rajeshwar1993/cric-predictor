import { Clock } from 'lucide-react'

import { ActiveLimitsTable } from '@/components/admin/rate-limits/active-limits-table'
import { RateLimitOverviewCards } from '@/components/admin/rate-limits/rate-limit-overview'
import { getActiveLimits, getRateLimitOverview } from '@/lib/dal/admin/rate-limits'

/**
 * ADM-013: Rate Limiting page.
 *
 * Shows rate limit overview and active entries.
 */
export default async function RateLimitsPage() {
  const [overview, activeLimits] = await Promise.all([
    getRateLimitOverview(),
    getActiveLimits(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">Rate Limits</h1>
      </div>

      <RateLimitOverviewCards overview={overview} />
      <ActiveLimitsTable limits={activeLimits} />
    </div>
  )
}

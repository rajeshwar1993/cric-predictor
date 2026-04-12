import { Users } from 'lucide-react'

import { UserGrowthChart } from '@/components/admin/users/user-growth-chart'
import { UserMetricsCards } from '@/components/admin/users/user-metrics'
import { UserSearch } from '@/components/admin/users/user-search'
import { getUserGrowth, getUserMetrics, searchUsers } from '@/lib/dal/admin/users'

/**
 * ADM-006: User Insights page.
 *
 * Shows user metrics, daily signup chart, and a search interface.
 */
export default async function UsersPage() {
  const [metrics, growth, recentUsers] = await Promise.all([
    getUserMetrics(),
    getUserGrowth(30),
    searchUsers(''),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">User Insights</h1>
      </div>

      <UserMetricsCards metrics={metrics} />
      <UserGrowthChart data={growth} />
      <UserSearch initialResults={recentUsers} />
    </div>
  )
}

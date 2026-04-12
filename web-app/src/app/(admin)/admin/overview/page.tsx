import { Home } from 'lucide-react'

import { CronHealthPanel } from '@/components/admin/overview/cron-health-panel'
import { DataFreshnessBar } from '@/components/admin/overview/data-freshness-bar'
import { FixtureStatusChips } from '@/components/admin/overview/fixture-status-chips'
import { MetricsGrid } from '@/components/admin/overview/metrics-grid'
import { SeasonProgress } from '@/components/admin/overview/season-progress'
import {
  getOverviewMetrics,
  getFixtureStatusCounts,
  getSeasonProgress,
  getDataFreshnessChecks,
} from '@/lib/dal/admin/overview'

export default async function AdminOverviewPage() {
  const [metrics, fixtureStatusCounts, seasonProgress, freshnessChecks] = await Promise.all([
    getOverviewMetrics(),
    getFixtureStatusCounts(),
    getSeasonProgress(),
    getDataFreshnessChecks(),
  ])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Home size={24} className="text-bragg-lime" />
        <h1 className="text-h2 text-text-primary">Platform Overview</h1>
      </div>

      {/* Data freshness alert bar */}
      <DataFreshnessBar checks={freshnessChecks} />

      {/* Season progress */}
      <SeasonProgress season={seasonProgress} />

      {/* Fixture status chips */}
      <FixtureStatusChips counts={fixtureStatusCounts} />

      {/* Platform metrics */}
      <MetricsGrid metrics={metrics} />

      {/* Cron health */}
      <CronHealthPanel />
    </div>
  )
}

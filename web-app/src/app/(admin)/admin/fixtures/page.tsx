import { Calendar } from 'lucide-react'

import {
  getActiveSeason,
  getFixturePipeline,
  getFixtureTable,
  getFixtureAlerts,
} from '@/lib/dal/admin/fixtures'
import { FixturePipelineView } from '@/components/admin/fixtures/fixture-pipeline'
import { FixtureTable } from '@/components/admin/fixtures/fixture-table'
import { FixtureAlerts } from '@/components/admin/fixtures/fixture-alerts'
import { StaleFixtureCleanup } from '@/components/admin/fixtures/stale-fixture-cleanup'

export default async function FixturesPage() {
  const season = await getActiveSeason()

  if (!season) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-bragg-lime" />
          <h1 className="text-h2 text-text-primary">Fixtures</h1>
        </div>
        <div className="rounded-lg border border-wire bg-concrete-black px-4 py-12 text-center">
          <p className="text-sm text-text-muted">
            No active season found. Fixture data will appear once a season is
            activated.
          </p>
        </div>
      </div>
    )
  }

  const [pipeline, tableRows, alerts] = await Promise.all([
    getFixturePipeline(season.id),
    getFixtureTable(season.id),
    getFixtureAlerts(season.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar size={24} className="text-bragg-lime" />
        <h1 className="text-h2 text-text-primary">Fixtures</h1>
        <span className="ml-2 text-sm text-text-secondary">
          {season.name} {season.year}
        </span>
      </div>

      {/* Alerts */}
      <FixtureAlerts alerts={alerts} />

      {/* Stale Fixture Cleanup */}
      <StaleFixtureCleanup />

      {/* Pipeline */}
      <FixturePipelineView pipeline={pipeline} />

      {/* Table */}
      <FixtureTable rows={tableRows} />
    </div>
  )
}
